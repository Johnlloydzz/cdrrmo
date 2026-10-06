const { sendAccountEmail, isEmailConfigured } = require('../utils/mailer')
const router = require('express').Router()
const bcrypt = require('bcryptjs')
const { all, get, run } = require('../db/database')
const { authenticate, authorize } = require('../middleware/auth')

// Sends the username + password to the user's email. Never throws: returns
// { email_sent, email_error } for the User Management screen.
async function emailLoginDetails(user, username, password, isReset) {
  if (!user?.email) return { email_sent: false, email_error: 'This account has no email address.' }
  if (!isEmailConfigured()) return { email_sent: false, email_error: 'Email is not set up on the server yet.' }
  try {
    await sendAccountEmail(user.email, user.name, username, password, { isReset })
    return { email_sent: true }
  } catch (err) {
    console.error('Account email failed:', err.message)
    return { email_sent: false, email_error: err.message }
  }
}

router.use(authenticate)

// User list and details include every account's email — CDRRMO only.
router.get('/', authorize('CDRRMO Personnel'), async (req, res) => {
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

router.get('/:id', authorize('CDRRMO Personnel'), async (req, res) => {
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
    // Email the login details. The account is created either way; the
    // response says whether the email went out so CDRRMO can relay the
    // details by hand if it didn't.
    const email_result = await emailLoginDetails(user, username, password, false)
    res.status(201).json({ ...user, ...email_result })
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Username or email already exists' })
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id', authorize('CDRRMO Personnel'), async (req, res) => {
  try {
    const { name, email, role, barangay_id, status, password } = req.body
    if (password && password.trim()) {
      const hash = await bcrypt.hash(password, 12)
      await run(
        `UPDATE users SET name=?, email=?, role=?, barangay_id=?, status=?, password_hash=?, updated_at=datetime('now', '+8 hours') WHERE id=?`,
        [name, email, role, barangay_id, status, hash, req.params.id]
      )
    } else {
      await run(
        `UPDATE users SET name=?, email=?, role=?, barangay_id=?, status=?, updated_at=datetime('now', '+8 hours') WHERE id=?`,
        [name, email, role, barangay_id, status, req.params.id]
      )
    }
    const user = await get('SELECT id, name, username, email, role, barangay_id, status FROM users WHERE id = ?', [req.params.id])
    // A new password was set → email it to the account holder.
    const email_result = password && password.trim()
      ? await emailLoginDetails(user, user.username, password, true)
      : {}
    res.json({ ...user, ...email_result })
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