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
  if (age < 1) return 'Infant (0)'
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
    if (household_id) { sql += ' AND r.household_id = ?'; params.push(household_id) }
    if (search) { sql += ' AND r.name LIKE ?'; params.push(`%${search}%`) }
    res.json(await all(sql, params))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/residents
router.post('/', async (req, res) => {
  try {
    const { household_id, name, birthdate, relation_to_head } = req.body
    if (!household_id || !name || !birthdate) {
      return res.status(400).json({ error: 'household_id, name, and birthdate are required' })
    }
    const count = await get('SELECT COUNT(*) as c FROM residents')
    const resident_id = `RES-${String((count?.c || 0) + 1).padStart(5, '0')}`
    const age_bracket = computeAgeBracket(birthdate)
    const result = await run(
      `INSERT INTO residents (resident_id, household_id, name, birthdate, age_bracket, relation_to_head) VALUES (?, ?, ?, ?, ?, ?)`,
      [resident_id, household_id, name, birthdate, age_bracket, relation_to_head || null]
    )
    const newRow = await get('SELECT * FROM residents WHERE id = ?', [result.lastID])
    res.status(201).json(newRow)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/residents/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, birthdate, relation_to_head } = req.body
    const age_bracket = computeAgeBracket(birthdate)
    await run(
      `UPDATE residents SET name=?, birthdate=?, age_bracket=?, relation_to_head=? WHERE id=?`,
      [name, birthdate, age_bracket, relation_to_head, req.params.id]
    )
    const updated = await get('SELECT * FROM residents WHERE id = ?', [req.params.id])
    res.json(updated)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /api/residents/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await run('DELETE FROM residents WHERE id = ?', [req.params.id])
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' })
    res.json({ message: 'Deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router