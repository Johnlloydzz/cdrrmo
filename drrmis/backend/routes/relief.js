const router = require('express').Router()
const { all, get, run } = require('../db/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

// Inventory
router.get('/inventory', async (req, res) => {
  try { res.json(await all('SELECT * FROM relief_inventory ORDER BY category, item_name')) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/inventory', async (req, res) => {
  try {
    const { item_name, category, quantity, unit, threshold, barangay_id } = req.body
    const r = await run(
      'INSERT INTO relief_inventory (item_name, category, quantity, unit, threshold, barangay_id) VALUES (?, ?, ?, ?, ?, ?)',
      [item_name, category || 'Food', quantity || 0, unit, threshold || 0, barangay_id || null]
    )
    res.status(201).json(await get('SELECT * FROM relief_inventory WHERE id = ?', [r.lastID]))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.put('/inventory/:id', async (req, res) => {
  try {
    const { item_name, category, quantity, unit, threshold, barangay_id } = req.body
    await run(
      `UPDATE relief_inventory SET item_name=?, category=?, quantity=?, unit=?, threshold=?, barangay_id=?, updated_at=datetime('now') WHERE id=?`,
      [item_name, category, quantity, unit, threshold, barangay_id || null, req.params.id]
    )
    res.json(await get('SELECT * FROM relief_inventory WHERE id = ?', [req.params.id]))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/inventory/:id', async (req, res) => {
  try {
    await run('DELETE FROM relief_inventory WHERE id = ?', [req.params.id])
    res.json({ message: 'Deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Distributions
router.get('/distributions', async (req, res) => {
  try {
    const rows = await all(`SELECT rd.*, b.name as barangay_name, ec.name as center_name, u.name as distributed_by_name
      FROM relief_distributions rd
      LEFT JOIN barangays b ON rd.barangay_id = b.id
      LEFT JOIN evacuation_centers ec ON rd.center_id = ec.id
      LEFT JOIN users u ON rd.distributed_by = u.id
      ORDER BY rd.created_at DESC`)
    res.json(rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/distributions', async (req, res) => {
  try {
    const { household_id, center_id, barangay_id, items, quantity, dist_date, receiver } = req.body
    const r = await run(
      'INSERT INTO relief_distributions (household_id, center_id, barangay_id, items, quantity, dist_date, receiver, status, distributed_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [household_id, center_id, barangay_id, items, quantity, dist_date, receiver, 'Completed', req.user.id]
    )
    res.status(201).json(await get('SELECT * FROM relief_distributions WHERE id = ?', [r.lastID]))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router