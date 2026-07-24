const router = require('express').Router()
const bcrypt = require('bcryptjs')
const { all, get, run } = require('../db/database')
const { authenticate, authorize } = require('../middleware/auth')

router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const { search, role } = req.query
    let sql = 'SELECT id, name, username, email, role, barangay, status, last_login, created_at FROM users WHERE 1=1'
    const params = []
    if (search) { sql += ' AND (name LIKE ? OR username LIKE ? OR email LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`) }
    if (role && role !== 'All') { sql += ' AND role = ?'; params.push(role) }
    res.json(await all(sql, params))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/:id', async (req, res) => {
  try {
    const row = await get('SELECT id, name, username, email, role, barangay, status, last_login FROM users WHERE id = ?', [req.params.id])
    if (!row) return res.status(404).json({ error: 'Not found' })
    res.json(row)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/', authorize('Super Administrator'), async (req, res) => {
  try {
    const { name, username, email, password, role, barangay, status } = req.body
    if (!name || !username || !email || !password) return res.status(400).json({ error: 'All fields required' })
    const hash = await bcrypt.hash(password, 12)
    const r = await run(
      'INSERT INTO users (name, username, email, password_hash, role, barangay, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, username, email, hash, role || 'Viewer', barangay || 'All', status || 'Active']
    )
    const user = await get('SELECT id, name, username, email, role, barangay, status FROM users WHERE id = ?', [r.lastID])
    res.status(201).json(user)
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Username or email already exists' })
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id', authorize('Super Administrator'), async (req, res) => {
  try {
    const { name, email, role, barangay, status } = req.body
    await run(
      `UPDATE users SET name=?, email=?, role=?, barangay=?, status=?, updated_at=datetime('now') WHERE id=?`,
      [name, email, role, barangay, status, req.params.id]
    )
    res.json(await get('SELECT id, name, username, email, role, barangay, status FROM users WHERE id = ?', [req.params.id]))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/:id', authorize('Super Administrator'), async (req, res) => {
  try {
    if (req.params.id == req.user.id) return res.status(400).json({ error: 'Cannot delete own account' })
    await run('DELETE FROM users WHERE id = ?', [req.params.id])
    res.json({ message: 'Deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
