const router = require('express').Router()
const { all, get, run } = require('../db/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

// GET /api/barangays
router.get('/', async (req, res) => {
  try {
    const { search, risk } = req.query
    let sql = `
      SELECT b.*,
        (SELECT COUNT(*) FROM puroks p WHERE p.barangay_id = b.id) AS purok_count,
        (SELECT COUNT(*) FROM households h WHERE h.barangay_id = b.id) AS household_count,
        (SELECT COUNT(*) FROM residents r JOIN households h ON r.household_id = h.id WHERE h.barangay_id = b.id) AS resident_count
      FROM barangays b WHERE 1=1`
    const params = []
    if (search) { sql += ' AND b.name LIKE ?'; params.push(`%${search}%`) }
    if (risk && risk !== 'All') { sql += ' AND b.risk_level = ?'; params.push(risk) }
    sql += ' ORDER BY b.name'
    res.json(await all(sql, params))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/barangays/:id
router.get('/:id', async (req, res) => {
  try {
    const b = await get(`
      SELECT b.*,
        (SELECT COUNT(*) FROM puroks p WHERE p.barangay_id = b.id) AS purok_count,
        (SELECT COUNT(*) FROM households h WHERE h.barangay_id = b.id) AS household_count,
        (SELECT COUNT(*) FROM residents r JOIN households h ON r.household_id = h.id WHERE h.barangay_id = b.id) AS resident_count
      FROM barangays b WHERE b.id = ?`, [req.params.id])
    if (!b) return res.status(404).json({ error: 'Not found' })
    res.json(b)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/barangays
router.post('/', async (req, res) => {
  try {
    const { name, population, risk_level, flood_susceptibility, landslide_susceptibility, boundary_geojson } = req.body
    if (!name) return res.status(400).json({ error: 'Name is required' })
    const result = await run(
      `INSERT INTO barangays (name, population, risk_level, flood_susceptibility, landslide_susceptibility, boundary_geojson) VALUES (?, ?, ?, ?, ?, ?)`,
      [name, population || 0, risk_level || 'Low', flood_susceptibility || 'Low', landslide_susceptibility || 'Low', boundary_geojson || null]
    )
    const newRow = await get('SELECT * FROM barangays WHERE id = ?', [result.lastID])
    res.status(201).json(newRow)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/barangays/:id
// Partial update — only overwrites fields actually sent in the request body,
// so editing e.g. just the CDRA classification doesn't wipe out boundary_geojson
// (or any other field) that the edit form didn't include.
router.put('/:id', async (req, res) => {
  try {
    const current = await get('SELECT * FROM barangays WHERE id = ?', [req.params.id])
    if (!current) return res.status(404).json({ error: 'Not found' })

    const name                     = req.body.name ?? current.name
    const population                = req.body.population ?? current.population
    const risk_level                = req.body.risk_level ?? current.risk_level
    const flood_susceptibility      = req.body.flood_susceptibility ?? current.flood_susceptibility
    const landslide_susceptibility  = req.body.landslide_susceptibility ?? current.landslide_susceptibility
    const boundary_geojson          = req.body.boundary_geojson ?? current.boundary_geojson

    await run(
      `UPDATE barangays SET name=?, population=?, risk_level=?, flood_susceptibility=?, landslide_susceptibility=?, boundary_geojson=?, updated_at=datetime('now') WHERE id=?`,
      [name, population, risk_level, flood_susceptibility, landslide_susceptibility, boundary_geojson, req.params.id]
    )
    const updated = await get('SELECT * FROM barangays WHERE id = ?', [req.params.id])
    res.json(updated)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router