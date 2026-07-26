const router = require('express').Router()
const { all, get, run } = require('../db/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

// GET /api/barangays  (excludes archived by default)
router.get('/', async (req, res) => {
  try {
    const { search, risk } = req.query
    let sql = 'SELECT * FROM barangays WHERE (is_archived IS NULL OR is_archived = 0)'
    const params = []
    if (search) { sql += ' AND (name LIKE ? OR captain LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }
    if (risk && risk !== 'All') { sql += ' AND risk_level = ?'; params.push(risk) }
    sql += ' ORDER BY name'
    res.json(await all(sql, params))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/barangays/archived  (list of archived/deleted barangays)
router.get('/archived', async (req, res) => {
  try {
    const sql = 'SELECT * FROM barangays WHERE is_archived = 1 ORDER BY archived_at DESC'
    res.json(await all(sql))
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
    const { name, captain, secretary, population, families, houses, risk_level, status, boundary_geojson, image_url } = req.body
    if (!name) return res.status(400).json({ error: 'Name is required' })
    const result = await run(
      `INSERT INTO barangays (name, captain, secretary, population, families, houses, risk_level, status, boundary_geojson, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, captain, secretary, population || 0, families || 0, houses || 0, risk_level || 'Low', status || 'Active', boundary_geojson || null, image_url || null]
    )
    const newRow = await get('SELECT * FROM barangays WHERE id = ?', [result.lastID])
    res.status(201).json(newRow)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/barangays/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, captain, secretary, population, families, houses, risk_level, status, boundary_geojson, image_url } = req.body
    await run(
      `UPDATE barangays SET name=?, captain=?, secretary=?, population=?, families=?, houses=?, risk_level=?, status=?, boundary_geojson=?, image_url=?, updated_at=datetime('now') WHERE id=?`,
      [name, captain, secretary, population, families, houses, risk_level, status, boundary_geojson, image_url, req.params.id]
    )
    const updated = await get('SELECT * FROM barangays WHERE id = ?', [req.params.id])
    res.json(updated)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /api/barangays/:id  (soft delete -> moves to archive)
router.delete('/:id', async (req, res) => {
  try {
    const result = await run(
      `UPDATE barangays SET is_archived = 1, archived_at = datetime('now') WHERE id = ?`,
      [req.params.id]
    )
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' })
    res.json({ message: 'Archived' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/barangays/:id/restore  (restore from archive)
router.post('/:id/restore', async (req, res) => {
  try {
    const result = await run(
      `UPDATE barangays SET is_archived = 0, archived_at = NULL WHERE id = ?`,
      [req.params.id]
    )
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' })
    const restored = await get('SELECT * FROM barangays WHERE id = ?', [req.params.id])
    res.json(restored)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /api/barangays/:id/permanent  (hard delete from archive, optional)
router.delete('/:id/permanent', async (req, res) => {
  try {
    const result = await run('DELETE FROM barangays WHERE id = ? AND is_archived = 1', [req.params.id])
    if (result.changes === 0) return res.status(404).json({ error: 'Not found or not archived' })
    res.json({ message: 'Permanently deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router