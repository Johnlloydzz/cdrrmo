const router = require('express').Router()

// Philippine mobile number: 11 digits starting with 09, and not a dummy
// like 09999999999 / 09000000000 (same digit repeated).
const isPhMobile = (n) => /^09\d{9}$/.test(n) && !/^09(\d)\1{8}$/.test(n)
const { all, get, run } = require('../db/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

// Computes an age bracket label from a birthdate string (YYYY-MM-DD)
function computeAgeBracket(birthdate) {
  if (!birthdate) return null
  const dob = new Date(birthdate)
  if (isNaN(dob)) return null
  const ageMs = Date.now() - dob.getTime()
  const age = Math.floor(ageMs / (1000 * 60 * 60 * 24 * 365.25))
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

// GET /api/residents
router.get('/', async (req, res) => {
  try {
    const { household_id, search, unassigned, relation } = req.query
    // A resident's barangay is their own barangay_id (set at registration,
    // since they can exist before being assigned to a household), falling
    // back to their household's barangay for older records.
    let sql = `SELECT r.*, h.household_id as hh_code, b.name as barangay_name, p.name as purok_name
               FROM residents r
               LEFT JOIN households h ON r.household_id = h.id
               LEFT JOIN barangays b ON b.id = COALESCE(r.barangay_id, h.barangay_id)
               LEFT JOIN puroks p ON p.id = COALESCE(h.purok_id, r.purok_id)
               WHERE 1=1`
    const params = []
    // Barangay Officials only ever see residents of their own barangay —
    // enforced server-side, not just hidden in the UI.
    if (req.user.role === 'Barangay Official') { sql += ' AND COALESCE(r.barangay_id, h.barangay_id) = ?'; params.push(req.user.barangay_id) }
    if (household_id) { sql += ' AND r.household_id = ?'; params.push(household_id) }
    // Used by Register Household to list residents that can be picked as Head
    if (unassigned === '1') sql += ' AND r.household_id IS NULL'
    if (relation) { sql += ' AND r.relation_to_head = ?'; params.push(relation) }
    if (search) { sql += ' AND r.name LIKE ?'; params.push(`%${search}%`) }
    res.json(await all(sql, params))
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
    const { household_id, last_name, first_name, middle_name, birthdate, relation_to_head, sex, contact_number } = req.body
    if (!last_name?.trim() || !first_name?.trim() || !birthdate) {
      return res.status(400).json({ error: 'Last name, first name, and birthdate are required' })
    }
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
    const count = await get('SELECT COUNT(*) as c FROM residents')
    const resident_id = `RES-${String((count?.c || 0) + 1).padStart(5, '0')}`
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
    const result = await run('DELETE FROM residents WHERE id = ?', [req.params.id])
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' })
    res.json({ message: 'Deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router