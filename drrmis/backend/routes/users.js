const router = require('express').Router()
const bcrypt = require('bcryptjs')
const { all, get, run } = require('../db/database')
const { authenticate, authorize } = require('../middleware/auth')

router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const { search, role } = req.query
    let sql = `SELECT u.id, u.name, u.username, u.email, u.role, u.barangay_id, b.name as barangay_name, u.status, u.last_login, u.last_active, u.created_at,
               (u.last_active IS NOT NULL AND (julianday('now', '+8 hours') - julianday(u.last_active)) * 24 * 60 * 60 <= 30) AS is_online
               FROM users u LEFT JOIN barangays b ON u.barangay_id = b.id WHERE 1=1`
    const params = []
    if (search) { sql += ' AND (u.name LIKE ? OR u.username LIKE ? OR u.email LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`) }
    if (role && role !== 'All') { sql += ' AND u.role = ?'; params.push(role) }
    const rows = await all(sql, params)
    res.json(rows.map(u => ({ ...u, is_online: !!u.is_online })))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/:id', async (req, res) => {
  try {
    const row = await get('SELECT id, name, username, email, role, barangay_id, status, last_login FROM users WHERE id = ?', [req.params.id])
    if (!row) return res.status(404).json({ error: 'Not found' })
    res.json(row)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Only CDRRMO Personnel manage user accounts (User Management module)
router.post('/', authorize('CDRRMO Personnel'), async (req, res) => {
  try {
    const { name, username, email, password, role, barangay_id, status } = req.body
    if (!name || !username || !email || !password || !role) return res.status(400).json({ error: 'All fields required' })
    const hash = await bcrypt.hash(password, 12)
    const r = await run(
      'INSERT INTO users (name, username, email, password_hash, role, barangay_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, username, email, hash, role, barangay_id || null, status || 'Active']
    )
    const user = await get('SELECT id, name, username, email, role, barangay_id, status FROM users WHERE id = ?', [r.lastID])
    res.status(201).json(user)
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Username or email already exists' })
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id', authorize('CDRRMO Personnel'), async (req, res) => {
  try {
    const { name, email, role, barangay_id, status } = req.body
    await run(
      `UPDATE users SET name=?, email=?, role=?, barangay_id=?, status=?, updated_at=datetime('now', '+8 hours') WHERE id=?`,
      [name, email, role, barangay_id, status, req.params.id]
    )
    res.json(await get('SELECT id, name, username, email, role, barangay_id, status FROM users WHERE id = ?', [req.params.id]))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/:id', authorize('CDRRMO Personnel'), async (req, res) => {
  try {
    if (req.params.id == req.user.id) return res.status(400).json({ error: 'Cannot delete own account' })
    await run('DELETE FROM users WHERE id = ?', [req.params.id])
    res.json({ message: 'Deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router