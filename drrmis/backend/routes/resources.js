const router = require('express').Router()
const { all, get, run } = require('../db/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const { category } = req.query
    let sql = 'SELECT * FROM resources WHERE 1=1'
    const params = []
    if (category) { sql += ' AND category = ?'; params.push(category) }
    res.json(await all(sql, params))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/', async (req, res) => {
  try {
    const { name, type, category, identifier, quantity, available, condition, location, status } = req.body
    const r = await run(
      'INSERT INTO resources (name, type, category, identifier, quantity, available, condition, location, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, type, category || 'Vehicle', identifier, quantity || 1, available || 1, condition || 'Good', location, status || 'Available']
    )
    res.status(201).json(await get('SELECT * FROM resources WHERE id = ?', [r.lastID]))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.put('/:id', async (req, res) => {
  try {
    const { name, quantity, available, condition, location, status } = req.body
    await run(
      `UPDATE resources SET name=?, quantity=?, available=?, condition=?, location=?, status=?, updated_at=datetime('now') WHERE id=?`,
      [name, quantity, available, condition, location, status, req.params.id]
    )
    res.json(await get('SELECT * FROM resources WHERE id = ?', [req.params.id]))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    await run('DELETE FROM resources WHERE id = ?', [req.params.id])
    res.json({ message: 'Deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Personnel
router.get('/personnel', async (req, res) => {
  try { res.json(await all('SELECT * FROM personnel ORDER BY name')) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/personnel', async (req, res) => {
  try {
    const { name, role, skills, contact, available } = req.body
    const r = await run(
      'INSERT INTO personnel (name, role, skills, contact, available) VALUES (?, ?, ?, ?, ?)',
      [name, role, skills, contact, available ? 1 : 0]
    )
    res.status(201).json(await get('SELECT * FROM personnel WHERE id = ?', [r.lastID]))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
