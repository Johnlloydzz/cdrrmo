const router = require('express').Router()
const { all, get, run } = require('../db/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const { status, barangay_id, search } = req.query
    let sql = `SELECT h.*, ht.name as type_name, b.name as barangay_name
               FROM hazards h
               LEFT JOIN hazard_types ht ON h.type_id = ht.id
               LEFT JOIN barangays b ON h.barangay_id = b.id
               WHERE 1=1`
    const params = []
    if (status && status !== 'All') { sql += ' AND h.status = ?'; params.push(status) }
    if (barangay_id) { sql += ' AND h.barangay_id = ?'; params.push(barangay_id) }
    if (search) { sql += ' AND (ht.name LIKE ? OR b.name LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }
    sql += ' ORDER BY h.created_at DESC'
    res.json(await all(sql, params))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/types', async (req, res) => {
  try { res.json(await all('SELECT * FROM hazard_types ORDER BY name')) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/:id', async (req, res) => {
  try {
    const row = await get('SELECT * FROM hazards WHERE id = ?', [req.params.id])
    if (!row) return res.status(404).json({ error: 'Not found' })
    res.json(row)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/', async (req, res) => {
  try {
    const count = await get('SELECT COUNT(*) as c FROM hazards')
    const code = `HAZ-${String((count.c || 0) + 1).padStart(3, '0')}`
    const { type_id, severity, barangay_id, purok_id, latitude, longitude, description, reporter, reported_date, status } = req.body
    const r = await run(
      `INSERT INTO hazards (hazard_code, type_id, severity, barangay_id, purok_id, latitude, longitude, description, reporter, reported_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [code, type_id, severity || 'Moderate', barangay_id, purok_id, latitude, longitude, description, reporter, reported_date, status || 'Active']
    )
    res.status(201).json(await get('SELECT * FROM hazards WHERE id = ?', [r.lastID]))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.put('/:id', async (req, res) => {
  try {
    const { severity, status, description } = req.body
    await run(
      `UPDATE hazards SET severity=?, status=?, description=?, updated_at=datetime('now') WHERE id=?`,
      [severity, status, description, req.params.id]
    )
    res.json(await get('SELECT * FROM hazards WHERE id = ?', [req.params.id]))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    await run('DELETE FROM hazards WHERE id = ?', [req.params.id])
    res.json({ message: 'Deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
