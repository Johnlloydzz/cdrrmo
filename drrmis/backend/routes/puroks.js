const router = require('express').Router()
const { all, get, run } = require('../db/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

// GET /api/puroks
router.get('/', async (req, res) => {
  try {
    const { barangay_id } = req.query
    let sql = `SELECT p.*, b.name as barangay_name FROM puroks p LEFT JOIN barangays b ON p.barangay_id = b.id WHERE 1=1`
    const params = []
    if (barangay_id) { sql += ' AND p.barangay_id = ?'; params.push(barangay_id) }
    sql += ' ORDER BY b.name, p.name'
    res.json(await all(sql, params))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/puroks
router.post('/', async (req, res) => {
  try {
    const { barangay_id, name, flood_risk, flood_threshold_m, landslide_risk } = req.body
    if (!barangay_id || !name) return res.status(400).json({ error: 'barangay_id and name are required' })
    const result = await run(
      `INSERT INTO puroks (barangay_id, name, flood_risk, flood_threshold_m, landslide_risk) VALUES (?, ?, ?, ?, ?)`,
      [barangay_id, name, flood_risk || 'Low', flood_threshold_m || 1.0, landslide_risk || 'Low']
    )
    const newRow = await get('SELECT * FROM puroks WHERE id = ?', [result.lastID])
    res.status(201).json(newRow)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/puroks/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, flood_risk, flood_threshold_m, landslide_risk } = req.body
    await run(
      `UPDATE puroks SET name=?, flood_risk=?, flood_threshold_m=?, landslide_risk=? WHERE id=?`,
      [name, flood_risk, flood_threshold_m, landslide_risk, req.params.id]
    )
    const updated = await get('SELECT * FROM puroks WHERE id = ?', [req.params.id])
    res.json(updated)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /api/puroks/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await run('DELETE FROM puroks WHERE id = ?', [req.params.id])
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' })
    res.json({ message: 'Deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router