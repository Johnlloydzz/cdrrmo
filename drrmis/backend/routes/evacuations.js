const router = require('express').Router()
const { all, get, run } = require('../db/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const rows = await all(`SELECT er.*, b.name as barangay_name, ec.name as center_name
      FROM evacuation_records er
      LEFT JOIN barangays b ON er.barangay_id = b.id
      LEFT JOIN evacuation_centers ec ON er.center_id = ec.id
      ORDER BY er.created_at DESC`)
    res.json(rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/', async (req, res) => {
  try {
    const count = await get('SELECT COUNT(*) as c FROM evacuation_records')
    const code = `EVAC-${String((count.c || 0) + 1).padStart(3, '0')}`
    const { household_id, center_id, barangay_id, members, reason, check_in } = req.body
    const r = await run(
      `INSERT INTO evacuation_records (evac_code, household_id, center_id, barangay_id, members, reason, check_in, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Ongoing')`,
      [code, household_id, center_id, barangay_id, members || 1, reason, check_in || new Date().toISOString()]
    )
    // Update occupant count
    await run('UPDATE evacuation_centers SET occupants = occupants + ? WHERE id = ?', [members || 1, center_id])
    res.status(201).json(await get('SELECT * FROM evacuation_records WHERE id = ?', [r.lastID]))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.put('/:id/checkout', async (req, res) => {
  try {
    const record = await get('SELECT * FROM evacuation_records WHERE id = ?', [req.params.id])
    if (!record) return res.status(404).json({ error: 'Not found' })
    await run(
      `UPDATE evacuation_records SET check_out=datetime('now'), status='Checked Out', updated_at=datetime('now') WHERE id=?`,
      [req.params.id]
    )
    await run('UPDATE evacuation_centers SET occupants = MAX(0, occupants - ?) WHERE id = ?', [record.members, record.center_id])
    res.json({ message: 'Checked out' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
