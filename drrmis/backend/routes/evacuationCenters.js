const router = require('express').Router()
const { all, get, run } = require('../db/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const rows = await all(`SELECT ec.*, b.name as barangay_name FROM evacuation_centers ec LEFT JOIN barangays b ON ec.barangay_id = b.id ORDER BY ec.name`)
    res.json(rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/available', async (req, res) => {
  try {
    const rows = await all(`SELECT * FROM evacuation_centers WHERE status IN ('Open','Standby') AND occupants < capacity`)
    res.json(rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/:id', async (req, res) => {
  try {
    const row = await get('SELECT * FROM evacuation_centers WHERE id = ?', [req.params.id])
    if (!row) return res.status(404).json({ error: 'Not found' })
    res.json(row)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/', async (req, res) => {
  try {
    const { name, barangay_id, capacity, occupants, contact, has_medical, has_generator, has_kitchen, has_water, has_electricity, status } = req.body
    const r = await run(
      `INSERT INTO evacuation_centers (name, barangay_id, capacity, occupants, contact, has_medical, has_generator, has_kitchen, has_water, has_electricity, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, barangay_id, capacity || 0, occupants || 0, contact, has_medical ? 1 : 0, has_generator ? 1 : 0, has_kitchen ? 1 : 0, has_water ? 1 : 0, has_electricity ? 1 : 0, status || 'Standby']
    )
    res.status(201).json(await get('SELECT * FROM evacuation_centers WHERE id = ?', [r.lastID]))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.put('/:id', async (req, res) => {
  try {
    const { name, capacity, occupants, contact, has_medical, has_generator, has_kitchen, has_water, has_electricity, status } = req.body
    await run(
      `UPDATE evacuation_centers SET name=?, capacity=?, occupants=?, contact=?, has_medical=?, has_generator=?, has_kitchen=?, has_water=?, has_electricity=?, status=?, updated_at=datetime('now') WHERE id=?`,
      [name, capacity, occupants, contact, has_medical ? 1 : 0, has_generator ? 1 : 0, has_kitchen ? 1 : 0, has_water ? 1 : 0, has_electricity ? 1 : 0, status, req.params.id]
    )
    res.json(await get('SELECT * FROM evacuation_centers WHERE id = ?', [req.params.id]))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    await run('DELETE FROM evacuation_centers WHERE id = ?', [req.params.id])
    res.json({ message: 'Deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
