const router = require('express').Router()
const { all, get, run } = require('../db/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const { barangay_id, search } = req.query
    let sql = 'SELECT p.*, b.name as barangay_name FROM puroks p LEFT JOIN barangays b ON p.barangay_id = b.id WHERE 1=1'
    const params = []
    if (barangay_id) { sql += ' AND p.barangay_id = ?'; params.push(barangay_id) }
    if (search) { sql += ' AND p.name LIKE ?'; params.push(`%${search}%`) }
    res.json(await all(sql, params))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/:id', async (req, res) => {
  try {
    const row = await get('SELECT * FROM puroks WHERE id = ?', [req.params.id])
    if (!row) return res.status(404).json({ error: 'Not found' })
    res.json(row)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/', async (req, res) => {
  try {
    const { barangay_id, name, population, families, houses, flood_risk, landslide_risk, area, latitude, longitude } = req.body
    const r = await run(
      `INSERT INTO puroks (barangay_id, name, population, families, houses, flood_risk, landslide_risk, area, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [barangay_id, name, population || 0, families || 0, houses || 0, flood_risk || 'Low', landslide_risk || 'Low', area, latitude, longitude]
    )
    res.status(201).json(await get('SELECT * FROM puroks WHERE id = ?', [r.lastID]))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.put('/:id', async (req, res) => {
  try {
    const { name, population, families, houses, flood_risk, landslide_risk, area, status } = req.body
    await run(
      'UPDATE puroks SET name=?, population=?, families=?, houses=?, flood_risk=?, landslide_risk=?, area=?, status=? WHERE id=?',
      [name, population, families, houses, flood_risk, landslide_risk, area, status, req.params.id]
    )
    res.json(await get('SELECT * FROM puroks WHERE id = ?', [req.params.id]))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    await run('DELETE FROM puroks WHERE id = ?', [req.params.id])
    res.json({ message: 'Deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
