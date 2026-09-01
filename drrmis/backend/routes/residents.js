const router = require('express').Router()
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

// GET /api/residents
router.get('/', async (req, res) => {
  try {
    const { household_id, search } = req.query
    let sql = `SELECT r.*, h.household_id as hh_code, b.name as barangay_name
               FROM residents r
               LEFT JOIN households h ON r.household_id = h.id
               LEFT JOIN barangays b ON h.barangay_id = b.id
               WHERE 1=1`
    const params = []
    // Barangay Officials only ever see residents whose household belongs to
    // their own barangay — enforced server-side, not just hidden in the UI.
    if (req.user.role === 'Barangay Official') { sql += ' AND h.barangay_id = ?'; params.push(req.user.barangay_id) }
    if (household_id) { sql += ' AND r.household_id = ?'; params.push(household_id) }
    if (search) { sql += ' AND r.name LIKE ?'; params.push(`%${search}%`) }
    res.json(await all(sql, params))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/residents
router.post('/', async (req, res) => {
  try {
    const { household_id, last_name, first_name, middle_name, birthdate, relation_to_head, sex, contact_number, blood_type } = req.body
    if (!household_id || !last_name?.trim() || !first_name?.trim() || !birthdate) {
      return res.status(400).json({ error: 'household_id, last name, first name, and birthdate are required' })
    }
    // Barangay Officials can only register residents into a household that
    // belongs to their own barangay.
    if (req.user.role === 'Barangay Official') {
      const household = await get('SELECT barangay_id FROM households WHERE id = ?', [household_id])
      if (!household || household.barangay_id !== req.user.barangay_id) {
        return res.status(403).json({ error: 'You can only register residents into households in your own barangay.' })
      }
    }
    const count = await get('SELECT COUNT(*) as c FROM residents')
    const resident_id = `RES-${String((count?.c || 0) + 1).padStart(5, '0')}`
    const age_bracket = computeAgeBracket(birthdate)
    const name = [first_name, middle_name, last_name].filter(Boolean).join(' ')
    const result = await run(
      `INSERT INTO residents (resident_id, household_id, name, last_name, first_name, middle_name, birthdate, age_bracket, relation_to_head, sex, contact_number, blood_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [resident_id, household_id, name, last_name, first_name, middle_name || null, birthdate, age_bracket, relation_to_head || null, sex || null, contact_number || null, blood_type || null]
    )
    const newRow = await get('SELECT * FROM residents WHERE id = ?', [result.lastID])
    res.status(201).json(newRow)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/residents/:id
router.put('/:id', async (req, res) => {
  try {
    if (req.user.role === 'Barangay Official') {
      const existing = await get(
        `SELECT h.barangay_id FROM residents r LEFT JOIN households h ON r.household_id = h.id WHERE r.id = ?`,
        [req.params.id]
      )
      if (!existing || existing.barangay_id !== req.user.barangay_id) {
        return res.status(403).json({ error: 'You can only edit residents in your own barangay.' })
      }
    }
    const { last_name, first_name, middle_name, birthdate, relation_to_head, sex, contact_number, blood_type } = req.body
    const age_bracket = computeAgeBracket(birthdate)
    const name = [first_name, middle_name, last_name].filter(Boolean).join(' ')
    await run(
      `UPDATE residents SET name=?, last_name=?, first_name=?, middle_name=?, birthdate=?, age_bracket=?, relation_to_head=?, sex=?, contact_number=?, blood_type=? WHERE id=?`,
      [name, last_name, first_name, middle_name || null, birthdate, age_bracket, relation_to_head, sex || null, contact_number || null, blood_type || null, req.params.id]
    )
    const updated = await get('SELECT * FROM residents WHERE id = ?', [req.params.id])
    res.json(updated)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /api/residents/:id
router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role === 'Barangay Official') {
      const existing = await get(
        `SELECT h.barangay_id FROM residents r LEFT JOIN households h ON r.household_id = h.id WHERE r.id = ?`,
        [req.params.id]
      )
      if (!existing || existing.barangay_id !== req.user.barangay_id) {
        return res.status(403).json({ error: 'You can only delete residents in your own barangay.' })
      }
    }
    const result = await run('DELETE FROM residents WHERE id = ?', [req.params.id])
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' })
    res.json({ message: 'Deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router