const router = require('express').Router()
const { all, get, run } = require('../db/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

// GET /api/barangays
router.get('/', async (req, res) => {
  try {
    const { search, risk } = req.query
    let sql = 'SELECT * FROM barangays WHERE 1=1'
    const params = []
    if (search) { sql += ' AND name LIKE ?'; params.push(`%${search}%`) }
    if (risk && risk !== 'All') { sql += ' AND risk_level = ?'; params.push(risk) }
    sql += ' ORDER BY name'
    res.json(await all(sql, params))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/barangays/:id
router.get('/:id', async (req, res) => {
  try {
    const b = await get('SELECT * FROM barangays WHERE id = ?', [req.params.id])
    if (!b) return res.status(404).json({ error: 'Not found' })
    res.json(b)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/barangays
router.post('/', async (req, res) => {
  try {
    const { name, population, risk_level, boundary_geojson } = req.body
    if (!name) return res.status(400).json({ error: 'Name is required' })
    const result = await run(
      `INSERT INTO barangays (name, population, risk_level, boundary_geojson) VALUES (?, ?, ?, ?)`,
      [name, population || 0, risk_level || 'Low', boundary_geojson || null]
    )
    const newRow = await get('SELECT * FROM barangays WHERE id = ?', [result.lastID])
    res.status(201).json(newRow)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/barangays/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, population, risk_level, boundary_geojson } = req.body
    await run(
      `UPDATE barangays SET name=?, population=?, risk_level=?, boundary_geojson=?, updated_at=datetime('now') WHERE id=?`,
      [name, population, risk_level, boundary_geojson, req.params.id]
    )
    const updated = await get('SELECT * FROM barangays WHERE id = ?', [req.params.id])
    res.json(updated)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router