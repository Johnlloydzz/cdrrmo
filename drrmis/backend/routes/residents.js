const router = require('express').Router()

// Philippine mobile number: 11 digits starting with 09, and not a dummy
// like 09999999999 / 09000000000 (same digit repeated).
const isPhMobile = (n) => /^09\d{9}$/.test(n) && !/^09(\d)\1{8}$/.test(n)
const { all, get, run, getDb } = require('../db/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

// Computes an age bracket label from a birthdate string (YYYY-MM-DD)
// Exact age in years today (birthday-aware), or null.
function ageToday(birthdate) {
  const dob = new Date(birthdate)
  if (!birthdate || isNaN(dob)) return null
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const m = now.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--
  return age
}

// A birthdate must be a real date, not in the future, and not before 1900.
function birthdateError(birthdate) {
  const dob = new Date(birthdate)
  if (isNaN(dob)) return 'Enter a valid birthdate.'
  if (dob > new Date()) return 'Birthdate can’t be in the future.'
  if (dob.getFullYear() < 1900) return 'Enter a valid birthdate.'
  return null
}

function computeAgeBracket(birthdate) {
  const age = ageToday(birthdate)
  if (age == null) return null
  if (age <= 12) return 'Child (1-12)'
  if (age <= 17) return 'Teen (13-17)'
  if (age <= 59) return 'Adult (18-59)'
  return 'Senior (60+)'
}

// Normalizes a name part to Proper Case regardless of how it was typed
// ("nikki" -> "Nikki", "DELA CRUZ" -> "Dela Cruz", "mc'donald" unaffected
// beyond capitalizing each word) — keeps names consistent across the table.
function toProperCase(str) {
  if (!str) return str
  return str.trim().toLowerCase().replace(/\b\p{L}/gu, c => c.toUpperCase())
}

// Shared FROM/JOIN for resident lists. A resident's barangay is their own
// barangay_id, falling back to their household's (older records); their
// purok is their household's purok, else their own.
const RESIDENT_FROM = `FROM residents r
  LEFT JOIN households h ON r.household_id = h.id
  LEFT JOIN barangays b ON b.id = COALESCE(r.barangay_id, h.barangay_id)
  LEFT JOIN puroks p ON p.id = COALESCE(h.purok_id, r.purok_id)`

// Age in whole years from a YYYY-MM-DD birthdate, in SQL (birthday-aware,
// Philippine date) — same rule as computeAgeBracket below.
const AGE_SQL = `(CAST(strftime('%Y', 'now', '+8 hours') AS INTEGER) - CAST(substr(r.birthdate, 1, 4) AS INTEGER)
  - (strftime('%m-%d', 'now', '+8 hours') < substr(r.birthdate, 6, 5)))`

// WHERE clause for the signed-in user's scope + the common filters.
function residentFilters(req) {
  const { household_id, search, unassigned, relation, purok_id } = req.query
  let where = 'WHERE 1=1'
  const params = []
  const barangayId = req.user.role === 'Barangay Official' ? req.user.barangay_id : (req.query.barangay_id || null)
  if (barangayId) { where += ' AND (r.barangay_id = ? OR (r.barangay_id IS NULL AND h.barangay_id = ?))'; params.push(barangayId, barangayId) }
  if (household_id) { where += ' AND r.household_id = ?'; params.push(household_id) }
  if (unassigned === '1') where += ' AND r.household_id IS NULL'
  if (relation) { where += ' AND r.relation_to_head = ?'; params.push(relation) }
  if (purok_id) { where += ' AND COALESCE(h.purok_id, r.purok_id) = ?'; params.push(purok_id) }
  return { where, params, search }
}

// GET /api/residents/stats — total + age-bracket counts for the cards,
// counted in the database (no need to download every resident).
router.get('/stats', async (req, res) => {
  try {
    const { where, params } = residentFilters(req)
    const row = await get(`
      SELECT COUNT(*) AS total,
        SUM(CASE WHEN r.birthdate IS NOT NULL AND ${AGE_SQL} <= 12 THEN 1 ELSE 0 END) AS child,
        SUM(CASE WHEN r.birthdate IS NOT NULL AND ${AGE_SQL} BETWEEN 13 AND 17 THEN 1 ELSE 0 END) AS teen,
        SUM(CASE WHEN r.birthdate IS NOT NULL AND ${AGE_SQL} BETWEEN 18 AND 59 THEN 1 ELSE 0 END) AS adult,
        SUM(CASE WHEN r.birthdate IS NOT NULL AND ${AGE_SQL} >= 60 THEN 1 ELSE 0 END) AS senior
      ${RESIDENT_FROM} ${where}`, params)
    res.json({
      total: row?.total || 0,
      'Child (1-12)': row?.child || 0, 'Teen (13-17)': row?.teen || 0,
      'Adult (18-59)': row?.adult || 0, 'Senior (60+)': row?.senior || 0,
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// For a Barangay Official: the resident's number inside their barangay
// (1st registered = 1), shown as RES-00001, RES-00002 … on their screens,
// and the same for their household's auto number (HH-00001 …).
// Counted on the fly — nothing extra is stored. CDRRMO keeps the city-wide ID.
function brgyNoSql(req) {
  if (req.user.role !== 'Barangay Official') return { sql: '', params: [] }
  return {
    sql: `, (SELECT COUNT(*) FROM residents r2 LEFT JOIN households h2 ON h2.id = r2.household_id
             WHERE (r2.barangay_id = ? OR (r2.barangay_id IS NULL AND h2.barangay_id = ?)) AND r2.id <= r.id) AS brgy_no,
          CASE WHEN h.household_id GLOB 'HH-[0-9]*' THEN (SELECT COUNT(*) FROM households hx
             WHERE hx.barangay_id = h.barangay_id AND hx.household_id GLOB 'HH-[0-9]*' AND hx.id <= h.id) END AS hh_no`,
    params: [req.user.barangay_id, req.user.barangay_id],
  }
}

// GET /api/residents?page=1&limit=50[&search=...] — one page + the total,
// searched in the database (name, barangay or purok).
async function listResidentsPage(req, res) {
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50))
  const page = Math.max(1, parseInt(req.query.page) || 1)
  let { where, params, search } = residentFilters(req)
  if (search) {
    where += ' AND (r.name LIKE ? OR b.name LIKE ? OR p.name LIKE ?)'
    params = [...params, `%${search}%`, `%${search}%`, `%${search}%`]
  }
  const no = brgyNoSql(req)
  const [countRow, rows] = await Promise.all([
    get(`SELECT COUNT(*) AS n ${RESIDENT_FROM} ${where}`, params),
    all(`SELECT r.*, h.household_id AS hh_code, b.name AS barangay_name, p.name AS purok_name,
                COALESCE(h.purok_id, r.purok_id) AS effective_purok_id${no.sql}
         ${RESIDENT_FROM} ${where} ORDER BY r.id LIMIT ? OFFSET ?`, [...no.params, ...params, limit, (page - 1) * limit]),
  ])
  res.json({
    rows: rows.map(r => ({ ...r, age_bracket: computeAgeBracket(r.birthdate) || r.age_bracket })),
    total: countRow?.n || 0, page, limit,
  })
}

// GET /api/residents
router.get('/', async (req, res) => {
  try {
    if (req.query.page) return await listResidentsPage(req, res)
    const { household_id, search, unassigned, relation } = req.query
    // A resident's barangay is their own barangay_id (set at registration,
    // since they can exist before being assigned to a household), falling
    // back to their household's barangay for older records.
    const no = brgyNoSql(req)
    let sql = `SELECT r.*, h.household_id as hh_code, b.name as barangay_name, p.name as purok_name${no.sql}
               FROM residents r
               LEFT JOIN households h ON r.household_id = h.id
               LEFT JOIN barangays b ON b.id = COALESCE(r.barangay_id, h.barangay_id)
               LEFT JOIN puroks p ON p.id = COALESCE(h.purok_id, r.purok_id)
               WHERE 1=1`
    const params = [...no.params]
    // Barangay Officials only ever see residents of their own barangay —
    // enforced server-side, not just hidden in the UI.
    if (req.user.role === 'Barangay Official') { sql += ' AND (r.barangay_id = ? OR (r.barangay_id IS NULL AND h.barangay_id = ?))'; params.push(req.user.barangay_id, req.user.barangay_id) }
    if (household_id) { sql += ' AND r.household_id = ?'; params.push(household_id) }
    // Used by Register Household to list residents that can be picked as Head
    if (unassigned === '1') sql += ' AND r.household_id IS NULL'
    if (relation) { sql += ' AND r.relation_to_head = ?'; params.push(relation) }
    if (search) { sql += ' AND r.name LIKE ?'; params.push(`%${search}%`) }
    // Age brackets are recomputed from the birthdate on every read, so a
    // child who turns 13 moves to "Teen" automatically (the stored value is
    // only from when the record was last saved).
    const rows = await all(sql, params)
    res.json(rows.map(r => ({ ...r, age_bracket: computeAgeBracket(r.birthdate) || r.age_bracket })))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// The purok a resident lives in: their household's purok when they're in a
// household, otherwise the purok picked on the form (must be in their
// barangay). Returns { purok_id } or { error }.
async function resolvePurok(bodyPurokId, household_id, barangay_id) {
  if (household_id) {
    const hh = await get('SELECT purok_id FROM households WHERE id = ?', [household_id])
    return { purok_id: hh?.purok_id || null }
  }
  if (!bodyPurokId) return { error: 'Purok is required — pick the purok where the resident lives.' }
  const purok = await get('SELECT barangay_id FROM puroks WHERE id = ?', [bodyPurokId])
  if (!purok || purok.barangay_id !== barangay_id) return { error: 'Pick a purok in your own barangay.' }
  return { purok_id: bodyPurokId }
}

// POST /api/residents
router.post('/', async (req, res) => {
  try {
    if (req.user.role !== 'Barangay Official') {
      return res.status(403).json({ error: 'CDRRMO Personnel have view-only access to resident records.' })
    }
    const { household_id, last_name, first_name, middle_name, birthdate, relation_to_head, sex, contact_number } = req.body
    if (!last_name?.trim() || !first_name?.trim() || !birthdate) {
      return res.status(400).json({ error: 'Last name, first name, and birthdate are required' })
    }
    if (birthdateError(birthdate)) return res.status(400).json({ error: birthdateError(birthdate) })
    if (contact_number && !isPhMobile(String(contact_number))) {
      return res.status(400).json({ error: 'Enter a valid Philippine mobile number: 11 digits starting with 09.' })
    }
    // Residents are registered FIRST; the household is optional and can be
    // assigned later (a Head is linked when their household is registered).
    // The resident's barangay: the official's own barangay, or the chosen
    // household's barangay.
    let barangay_id = req.user.role === 'Barangay Official' ? req.user.barangay_id : (req.body.barangay_id || null)
    if (household_id) {
      const household = await get('SELECT barangay_id FROM households WHERE id = ?', [household_id])
      if (!household) return res.status(400).json({ error: 'Household not found.' })
      if (req.user.role === 'Barangay Official' && household.barangay_id !== req.user.barangay_id) {
        return res.status(403).json({ error: 'You can only register residents into households in your own barangay.' })
      }
      barangay_id = household.barangay_id
    }
    if (!barangay_id) return res.status(400).json({ error: 'Barangay is required.' })
    const { purok_id, error: purokError } = await resolvePurok(req.body.purok_id, household_id, barangay_id)
    if (purokError) return res.status(400).json({ error: purokError })
    // Next free RES-xxxxx: highest existing number + 1. (COUNT+1 reused a
    // number after a resident was deleted and failed the UNIQUE check.)
    const maxRow = await get("SELECT MAX(CAST(SUBSTR(resident_id, 5) AS INTEGER)) AS n FROM residents WHERE resident_id LIKE 'RES-%'")
    const resident_id = `RES-${String((maxRow?.n || 0) + 1).padStart(5, '0')}`
    const age_bracket = computeAgeBracket(birthdate)
    const properLast = toProperCase(last_name), properFirst = toProperCase(first_name), properMiddle = toProperCase(middle_name)
    const name = [properFirst, properMiddle, properLast].filter(Boolean).join(' ')
    const result = await run(
      `INSERT INTO residents (resident_id, household_id, barangay_id, purok_id, name, last_name, first_name, middle_name, birthdate, age_bracket, relation_to_head, sex, contact_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [resident_id, household_id || null, barangay_id, purok_id, name, properLast, properFirst, properMiddle || null, birthdate, age_bracket, relation_to_head || null, sex || null, contact_number || null]
    )
    const newRow = await get('SELECT * FROM residents WHERE id = ?', [result.lastID])
    res.status(201).json(newRow)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ───────────────────────────────────────────────────────────────────────
// Import residents from a spreadsheet saved as CSV (Barangay Official only).
// The browser reads the file and sends the rows here as JSON. Every row is
// checked with the SAME rules as the Register Resident form; rows with a
// problem are skipped and reported, the good rows are saved together in one
// transaction. Nothing is saved unless `commit` is true (the preview step).
// ───────────────────────────────────────────────────────────────────────
const IMPORT_MAX_ROWS = 500
const IMPORT_RELATIONS = ['Head', 'Spouse', 'Child', 'Parent', 'Sibling', 'Other']
const squash = (v) => String(v ?? '').replace(/\s+/g, ' ').trim()
const pad2 = (n) => String(n).padStart(2, '0')

// Accepts YYYY-MM-DD or DD-MM-YYYY (also with / or .). Returns YYYY-MM-DD or
// null. The date must really exist (31-02-2000 is refused).
function importBirthdate(value) {
  const s = squash(value)
  let y, m, d, mt
  if ((mt = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/))) { y = +mt[1]; m = +mt[2]; d = +mt[3] }
  else if ((mt = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/))) { d = +mt[1]; m = +mt[2]; y = +mt[3] }
  else return null
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null
  return `${y}-${pad2(m)}-${pad2(d)}`
}

// Excel drops the leading 0 of 09171234567, so 9171234567 (10 digits) and
// +63 917 123 4567 are accepted and turned into 09171234567.
function importMobile(value) {
  let digits = squash(value).replace(/[\s\-().+]/g, '')
  if (!digits) return ''
  if (/^639\d{9}$/.test(digits)) digits = '0' + digits.slice(2)
  else if (/^9\d{9}$/.test(digits)) digits = '0' + digits
  return digits
}

async function validateImportRows(rows, barangayId) {
  const purokRows = await all('SELECT id, name FROM puroks WHERE barangay_id = ?', [barangayId])
  const purokByName = new Map(purokRows.map(p => [squash(p.name).toLowerCase(), p.id]))
  const existing = await all(
    `SELECT r.first_name, r.last_name, r.birthdate ${RESIDENT_FROM}
     WHERE (r.barangay_id = ? OR (r.barangay_id IS NULL AND h.barangay_id = ?))`, [barangayId, barangayId])
  const seen = new Set(existing.map(r => `${squash(r.first_name).toLowerCase()}|${squash(r.last_name).toLowerCase()}|${r.birthdate}`))

  return rows.map((raw, i) => {
    const row = Number.isInteger(raw?.row) ? raw.row : i + 2
    const errors = []
    const last = squash(raw?.last_name), first = squash(raw?.first_name), middle = squash(raw?.middle_name)
    if (!last) errors.push('Last name is missing.')
    if (!first) errors.push('First name is missing.')
    if (last.length > 60 || first.length > 60 || middle.length > 60) errors.push('A name is too long (60 letters at most).')

    let birthdate = null
    if (!squash(raw?.birthdate)) errors.push('Birthdate is missing.')
    else {
      birthdate = importBirthdate(raw.birthdate)
      if (!birthdate) errors.push('Birthdate must look like 1985-03-02 or 02-03-1985.')
      else if (birthdateError(birthdate)) { errors.push(birthdateError(birthdate)); birthdate = null }
    }

    let sex = null
    const sx = squash(raw?.sex).toLowerCase()
    if (sx) {
      if (sx === 'male' || sx === 'm') sex = 'Male'
      else if (sx === 'female' || sx === 'f') sex = 'Female'
      else errors.push('Sex must be Male or Female.')
    }

    let contact = null
    const mobile = importMobile(raw?.contact_number)
    if (mobile) { if (isPhMobile(mobile)) contact = mobile; else errors.push('Contact number must be 11 digits starting with 09.') }

    let relation = null
    const rl = squash(raw?.relation_to_head).toLowerCase()
    if (rl) {
      relation = IMPORT_RELATIONS.find(x => x.toLowerCase() === rl) || null
      if (!relation) errors.push(`Relation to Head must be one of: ${IMPORT_RELATIONS.join(', ')}.`)
    }

    let purok_id = null
    const purokName = squash(raw?.purok)
    if (!purokName) errors.push('Purok is missing.')
    else {
      purok_id = purokByName.get(purokName.toLowerCase()) || null
      if (!purok_id) errors.push(`Purok "${purokName}" is not one of your puroks.`)
    }

    // Same person (name + birthdate) already registered, or twice in the file.
    if (last && first && birthdate) {
      const key = `${first.toLowerCase()}|${last.toLowerCase()}|${birthdate}`
      if (seen.has(key)) errors.push('This resident is already registered (or appears twice in the file).')
      else if (!errors.length) seen.add(key)
    }

    const name = [toProperCase(first), toProperCase(middle), toProperCase(last)].filter(Boolean).join(' ')
    return { row, errors, name, purok: purokName, data: errors.length ? null : {
      last_name: toProperCase(last), first_name: toProperCase(first), middle_name: toProperCase(middle) || null,
      name, birthdate, sex, contact_number: contact, relation_to_head: relation, purok_id } }
  })
}

// POST /api/residents/import   body: { rows: [...], commit: false|true }
router.post('/import', async (req, res) => {
  try {
    if (req.user.role !== 'Barangay Official') {
      return res.status(403).json({ error: 'Only Barangay Officials can import residents.' })
    }
    const { rows, commit } = req.body || {}
    if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: 'The file has no residents to import.' })
    if (rows.length > IMPORT_MAX_ROWS) return res.status(400).json({ error: `Import at most ${IMPORT_MAX_ROWS} residents at a time. Split the file and import it in parts.` })
    const barangayId = req.user.barangay_id
    if (!barangayId) return res.status(400).json({ error: 'Your account has no barangay.' })

    const checked = await validateImportRows(rows, barangayId)
    const good = checked.filter(r => !r.errors.length)
    const summary = checked.map(({ row, errors, name, purok }) => ({ row, errors, name, purok }))

    if (!commit) {
      return res.json({ total: checked.length, valid: good.length, invalid: checked.length - good.length, rows: summary })
    }
    if (good.length === 0) return res.status(400).json({ error: 'No row can be imported. Fix the problems and try again.', total: checked.length, valid: 0, invalid: checked.length, rows: summary })

    // Next free RES-xxxxx numbers, then every good row in ONE transaction.
    const maxRow = await get("SELECT MAX(CAST(SUBSTR(resident_id, 5) AS INTEGER)) AS n FROM residents WHERE resident_id LIKE 'RES-%'")
    let next = (maxRow?.n || 0) + 1
    const statements = good.map(({ data: d }) => ({
      sql: `INSERT INTO residents (resident_id, household_id, barangay_id, purok_id, name, last_name, first_name, middle_name, birthdate, age_bracket, relation_to_head, sex, contact_number)
            VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [`RES-${String(next++).padStart(5, '0')}`, barangayId, d.purok_id, d.name, d.last_name, d.first_name, d.middle_name,
             d.birthdate, computeAgeBracket(d.birthdate), d.relation_to_head, d.sex, d.contact_number],
    }))
    await getDb().batch(statements, 'write')
    res.status(201).json({ imported: good.length, skipped: checked.length - good.length, total: checked.length, rows: summary })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/residents/:id
router.put('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'Barangay Official') {
      return res.status(403).json({ error: 'CDRRMO Personnel have view-only access to resident records.' })
    }
    const existing = await get(
      `SELECT r.household_id, COALESCE(r.barangay_id, h.barangay_id) AS barangay_id FROM residents r LEFT JOIN households h ON r.household_id = h.id WHERE r.id = ?`,
      [req.params.id]
    )
    if (!existing || existing.barangay_id !== req.user.barangay_id) {
      return res.status(403).json({ error: 'You can only edit residents in your own barangay.' })
    }
    const { last_name, first_name, middle_name, birthdate, relation_to_head, sex, contact_number } = req.body
    if (!last_name?.trim() || !first_name?.trim() || !birthdate) {
      return res.status(400).json({ error: 'Last name, first name, and birthdate are required' })
    }
    if (birthdateError(birthdate)) return res.status(400).json({ error: birthdateError(birthdate) })
    if (contact_number && !isPhMobile(String(contact_number))) {
      return res.status(400).json({ error: 'Enter a valid Philippine mobile number: 11 digits starting with 09.' })
    }
    // A resident registered without a household can be assigned one later
    // (or moved). Only households in the official's own barangay.
    let household_id = 'household_id' in req.body ? (req.body.household_id || null) : existing.household_id
    if (household_id) {
      const household = await get('SELECT barangay_id FROM households WHERE id = ?', [household_id])
      if (!household || household.barangay_id !== req.user.barangay_id) {
        return res.status(403).json({ error: 'You can only assign residents to households in your own barangay.' })
      }
    }
    const { purok_id, error: purokError } = await resolvePurok(req.body.purok_id, household_id, existing.barangay_id)
    if (purokError) return res.status(400).json({ error: purokError })
    const age_bracket = computeAgeBracket(birthdate)
    const properLast = toProperCase(last_name), properFirst = toProperCase(first_name), properMiddle = toProperCase(middle_name)
    const name = [properFirst, properMiddle, properLast].filter(Boolean).join(' ')
    await run(
      `UPDATE residents SET name=?, last_name=?, first_name=?, middle_name=?, birthdate=?, age_bracket=?, relation_to_head=?, sex=?, contact_number=?, household_id=?, barangay_id=?, purok_id=? WHERE id=?`,
      [name, properLast, properFirst, properMiddle || null, birthdate, age_bracket, relation_to_head, sex || null, contact_number || null, household_id, existing.barangay_id, purok_id, req.params.id]
    )
    // The household keeps its Head's name as text (head_family), so when the
    // Head's name is edited here, update it on the household too — otherwise
    // the Households list keeps showing the old name.
    if (relation_to_head === 'Head' && household_id) {
      await run(`UPDATE households SET head_family = ?, updated_at = datetime('now', '+8 hours') WHERE id = ?`, [name, household_id])
    }
    const updated = await get('SELECT * FROM residents WHERE id = ?', [req.params.id])
    res.json(updated)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /api/residents/:id
router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'Barangay Official') {
      return res.status(403).json({ error: 'CDRRMO Personnel have view-only access to resident records.' })
    }
    const existing = await get(
      `SELECT COALESCE(r.barangay_id, h.barangay_id) AS barangay_id FROM residents r LEFT JOIN households h ON r.household_id = h.id WHERE r.id = ?`,
      [req.params.id]
    )
    if (!existing || existing.barangay_id !== req.user.barangay_id) {
      return res.status(403).json({ error: 'You can only delete residents in your own barangay.' })
    }
    // The Head of Family can't be deleted while their household exists —
    // it would leave the household with a Head who isn't registered.
    const headOf = await get(
      `SELECT h.household_id FROM residents r JOIN households h ON h.id = r.household_id
       WHERE r.id = ? AND r.relation_to_head = 'Head'`,
      [req.params.id]
    )
    if (headOf) {
      return res.status(400).json({ error: `This resident is the Head of Family of ${headOf.household_id}. Change that household's Head (or delete the household) first.` })
    }
    const result = await run('DELETE FROM residents WHERE id = ?', [req.params.id])
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' })
    res.json({ message: 'Deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router