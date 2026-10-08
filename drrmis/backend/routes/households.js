const router = require('express').Router()
const { all, get, run } = require('../db/database')
const { authenticate } = require('../middleware/auth')
const { loadRiskContext, withHouseholdRisk, purokRiskRows } = require('../utils/householdRisk')

router.use(authenticate)


// GET /api/households?page=1&limit=50[&search=&barangay_id=&purok_id=&at_risk=1&hazard=flood|landslide]
// One page of households + the total, filtered and searched in the database
// (not in the browser) so it stays fast with tens of thousands of records.
// At-risk flags come from the purok (same geofencing as everywhere else).
async function listHouseholdsPage(req, res) {
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50))
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const barangayId = req.user.role === 'Barangay Official' ? req.user.barangay_id : (req.query.barangay_id || null)
  const { purok_id, search, at_risk } = req.query
  const hazardKey = req.query.hazard === 'landslide' ? 'in_landslide_risk_zone' : 'in_flood_risk_zone'

  const puroks = await purokRiskRows(await loadRiskContext(), { barangayId, counts: false })
  const purokById = new Map(puroks.map(p => [p.purok_id, p]))

  let where = 'WHERE 1=1'
  const params = []
  if (barangayId) { where += ' AND h.barangay_id = ?'; params.push(barangayId) }
  if (purok_id)   { where += ' AND h.purok_id = ?'; params.push(purok_id) }
  if (search) {
    where += ' AND (h.head_family LIKE ? OR h.household_id LIKE ? OR b.name LIKE ? OR p.name LIKE ?)'
    params.push(...Array(4).fill(`%${search}%`))
  }
  if (at_risk === '1') {
    const ids = puroks.filter(p => p[hazardKey]).map(p => p.purok_id)
    if (ids.length === 0) return res.json({ rows: [], total: 0, page, limit })
    where += ` AND h.purok_id IN (${ids.map(() => '?').join(',')})`
    params.push(...ids)
  }
  const from = `FROM households h LEFT JOIN barangays b ON h.barangay_id = b.id LEFT JOIN puroks p ON h.purok_id = p.id ${where}`
  const [countRow, rows] = await Promise.all([
    get(`SELECT COUNT(*) AS n ${from}`, params),
    all(`SELECT h.id, h.household_id, h.barangay_id, h.purok_id, h.head_family, h.created_at,
                b.name AS barangay_name, p.name AS purok_name,
                (SELECT COUNT(*) FROM residents r WHERE r.household_id = h.id) AS member_count
         ${from} ORDER BY h.id LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]),
  ])
  res.json({
    rows: rows.map(h => {
      const p = purokById.get(h.purok_id)
      return { ...h, purok_lat: p?.purok_lat ?? null, purok_lng: p?.purok_lng ?? null,
        in_flood_risk_zone: !!p?.in_flood_risk_zone, in_landslide_risk_zone: !!p?.in_landslide_risk_zone }
    }),
    total: countRow?.n || 0, page, limit,
  })
}

// GET /api/households — includes geofencing flag (in_flood_risk_zone).
// With ?page= it returns one page (see above); without it, the full list
// (used for small, filtered lists such as one purok's households).
router.get('/', async (req, res) => {
  try {
    if (req.query.page) return await listHouseholdsPage(req, res)
    const { purok_id, search, at_risk } = req.query
    // Barangay Officials only ever see their own barangay's households —
    // enforced server-side, not just hidden in the UI.
    const barangay_id = req.user.role === 'Barangay Official' ? req.user.barangay_id : req.query.barangay_id
    let sql = `SELECT h.*, b.name as barangay_name, b.flood_susceptibility as barangay_flood_susceptibility, b.flood_area_geojson as barangay_flood_area, b.landslide_area_geojson as barangay_landslide_area, p.name as purok_name, p.flood_risk as purok_flood_risk, p.flood_threshold_m, p.landslide_risk as purok_landslide_risk,
                      p.latitude as purok_point_lat, p.longitude as purok_point_lng, p.boundary_geojson as purok_boundary,
                      (SELECT COUNT(*) FROM residents r WHERE r.household_id = h.id) AS member_count
               FROM households h
               LEFT JOIN barangays b ON h.barangay_id = b.id
               LEFT JOIN puroks p ON h.purok_id = p.id
               WHERE 1=1`
    const params = []
    if (barangay_id) { sql += ' AND h.barangay_id = ?'; params.push(barangay_id) }
    if (purok_id)    { sql += ' AND h.purok_id = ?'; params.push(purok_id) }
    if (search)      { sql += ' AND (h.head_family LIKE ? OR h.household_id LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }
    if (at_risk === '1') { sql += " AND p.flood_risk = 'High'" }
    const rows = await all(sql, params)
    // Geofencing (at-risk flags) — shared with the Dashboard summary so both
    // always agree. See utils/householdRisk.js.
    const withRisk = withHouseholdRisk(rows, await loadRiskContext())
    res.json(withRisk)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// The Head of Family must be an already-registered resident of the same
// barangay, with relation "Head", who isn't in another household yet (or is
// already in THIS household, when editing). Returns the resident or an error.
async function validateHead(head_resident_id, barangay_id, householdId = null) {
  const r = await get(
    `SELECT r.id, r.name, r.relation_to_head, r.household_id, COALESCE(r.barangay_id, h.barangay_id) AS barangay_id
     FROM residents r LEFT JOIN households h ON r.household_id = h.id WHERE r.id = ?`,
    [head_resident_id]
  )
  if (!r) return { error: 'The selected Head of Family was not found. Register them in Residents first.' }
  if (Number(r.barangay_id) !== Number(barangay_id)) return { error: 'The Head of Family must be a resident of this barangay.' }
  if (r.relation_to_head !== 'Head') return { error: 'The selected resident is not registered as "Head" (Relation to Head).' }
  if (r.household_id && Number(r.household_id) !== Number(householdId)) return { error: 'The selected resident is already assigned to another household.' }
  return { resident: r }
}

// Household number: typed by the Barangay Official (the number they already
// use on their own records), or auto-generated as HH-00001, HH-00002, ...
// when left blank. Allowed: letters, numbers, spaces, - and /.
const HH_CODE_RE = /^[A-Za-z0-9][A-Za-z0-9 \-\/]{0,29}$/

// Next free HH-xxxxx: highest existing auto number + 1, skipping any number
// already taken (COUNT+1 collided after deletions or manual entries).
async function nextAutoHouseholdCode() {
  const rows = await all("SELECT household_id FROM households WHERE household_id LIKE 'HH-%'")
  let n = rows.reduce((max, r) => {
    const m = /^HH-(\d+)$/.exec(r.household_id || '')
    return m ? Math.max(max, parseInt(m[1], 10)) : max
  }, 0)
  const taken = new Set(rows.map(r => r.household_id))
  let code
  do { n += 1; code = `HH-${String(n).padStart(5, '0')}` } while (taken.has(code))
  return code
}

// Validates a typed household number. Returns { code } or { error }.
async function checkHouseholdCode(raw, excludeId = null) {
  const code = String(raw || '').trim().toUpperCase()
  if (!HH_CODE_RE.test(code)) return { error: 'Household number may only use letters, numbers, spaces, - and / (max 30 characters).' }
  const dup = await get('SELECT id FROM households WHERE UPPER(household_id) = ? AND id != ?', [code, excludeId ?? -1])
  if (dup) return { error: `Household number ${code} is already used by another household.` }
  return { code }
}

// POST /api/households
// The purok must exist and be in the household's barangay.
async function checkPurok(purok_id, barangay_id) {
  if (!purok_id) return 'Pick the purok where this household lives.'
  const p = await get('SELECT barangay_id FROM puroks WHERE id = ?', [purok_id])
  if (!p || p.barangay_id !== barangay_id) return 'Pick a purok in your own barangay.'
  return null
}

router.post('/', async (req, res) => {
  try {
    if (req.user.role !== 'Barangay Official') {
      return res.status(403).json({ error: 'CDRRMO Personnel have view-only access to household records.' })
    }
    const { purok_id, head_resident_id } = req.body
    // Barangay Officials can only register households under their own barangay,
    // regardless of what barangay_id is sent in the request body.
    const barangay_id = req.user.role === 'Barangay Official' ? req.user.barangay_id : req.body.barangay_id
    if (!barangay_id || !purok_id || !head_resident_id) {
      return res.status(400).json({ error: 'Barangay, purok, and Head of Family are required.' })
    }
    const purokError = await checkPurok(purok_id, barangay_id)
    if (purokError) return res.status(400).json({ error: purokError })
    // Residents are registered first; the Head is picked from them.
    const { resident: head, error } = await validateHead(head_resident_id, barangay_id)
    if (error) return res.status(400).json({ error })
    const head_family = head.name
    let household_id
    if (String(req.body.household_code || '').trim()) {
      const { code, error: codeError } = await checkHouseholdCode(req.body.household_code)
      if (codeError) return res.status(400).json({ error: codeError })
      household_id = code
    } else {
      household_id = await nextAutoHouseholdCode()
    }
    const result = await run(
      `INSERT INTO households (household_id, barangay_id, purok_id, head_family) VALUES (?, ?, ?, ?)`,
      [household_id, barangay_id, purok_id, head_family]
    )
    // Link the Head to their new household.
    await run('UPDATE residents SET household_id = ?, barangay_id = ?, purok_id = ? WHERE id = ?', [result.lastID, barangay_id, purok_id, head.id])
    const newRow = await get('SELECT * FROM households WHERE id = ?', [result.lastID])
    res.status(201).json(newRow)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/households/:id
router.put('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'Barangay Official') {
      return res.status(403).json({ error: 'CDRRMO Personnel have view-only access to household records.' })
    }
    const existing = await get('SELECT barangay_id FROM households WHERE id = ?', [req.params.id])
    if (!existing || existing.barangay_id !== req.user.barangay_id) {
      return res.status(403).json({ error: 'You can only edit households in your own barangay.' })
    }
    const { purok_id, head_resident_id } = req.body
    const purokError = await checkPurok(purok_id, existing.barangay_id)
    if (purokError) return res.status(400).json({ error: purokError })
    // Household number: blank keeps the current one.
    let household_code = (await get('SELECT household_id FROM households WHERE id = ?', [req.params.id]))?.household_id
    if (String(req.body.household_code || '').trim()) {
      const { code, error: codeError } = await checkHouseholdCode(req.body.household_code, req.params.id)
      if (codeError) return res.status(400).json({ error: codeError })
      household_code = code
    }
    // Changing the Head: must be a registered "Head" resident, unassigned or
    // already in this household. The new Head is linked to this household.
    let head_family = (await get('SELECT head_family FROM households WHERE id = ?', [req.params.id]))?.head_family
    if (head_resident_id) {
      const { resident: head, error } = await validateHead(head_resident_id, existing.barangay_id, req.params.id)
      if (error) return res.status(400).json({ error })
      head_family = head.name
      // One Head per household: the previous Head is unlinked (they stay a
      // registered resident and can be made Head of another household).
      await run("UPDATE residents SET household_id = NULL WHERE household_id = ? AND relation_to_head = 'Head' AND id != ?", [req.params.id, head.id])
      await run('UPDATE residents SET household_id = ?, barangay_id = ?, purok_id = ? WHERE id = ?', [req.params.id, existing.barangay_id, purok_id, head.id])
    }
    await run(
      `UPDATE households SET household_id=?, head_family=?, latitude=NULL, longitude=NULL, purok_id=?, updated_at=datetime('now', '+8 hours') WHERE id=?`,
      [household_code, head_family, purok_id, req.params.id]
    )
    // Members follow the household's purok if it moved.
    await run(
      'UPDATE residents SET purok_id = ? WHERE household_id = ?',
      [purok_id, req.params.id]
    )
    const updated = await get('SELECT * FROM households WHERE id = ?', [req.params.id])
    res.json(updated)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /api/households/:id
router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'Barangay Official') {
      return res.status(403).json({ error: 'CDRRMO Personnel have view-only access to household records.' })
    }
    const existing = await get('SELECT barangay_id FROM households WHERE id = ?', [req.params.id])
    if (!existing || existing.barangay_id !== req.user.barangay_id) {
      return res.status(403).json({ error: 'You can only delete households in your own barangay.' })
    }
    // Residents are people, not part of the household record: deleting a
    // household un-assigns its members (they stay registered and can be
    // assigned to another household) instead of deleting them.
    await run('UPDATE residents SET household_id = NULL, barangay_id = COALESCE(barangay_id, ?) WHERE household_id = ?', [existing.barangay_id, req.params.id])
    const result = await run('DELETE FROM households WHERE id = ?', [req.params.id])
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' })
    res.json({ message: 'Deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router