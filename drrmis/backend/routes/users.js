const { sendAccountEmail, isEmailConfigured } = require('../utils/mailer')
const router = require('express').Router()
const { hashPassword } = require('../utils/password')
const { all, get, run, getDb } = require('../db/database')
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

// A Barangay Official account needs a barangay, and each barangay has only
// one official account (same rule as Request Account). Returns an error
// message or null. `exceptId` = the account being edited.
async function checkBarangaySlot(role, barangay_id, exceptId = null) {
  if (role !== 'Barangay Official') return null
  if (!barangay_id) return 'Pick the barangay for this Barangay Official.'
  const taken = await get(
    "SELECT u.id, b.name FROM users u JOIN barangays b ON b.id = u.barangay_id WHERE u.role = 'Barangay Official' AND u.barangay_id = ? AND u.id != ?",
    [barangay_id, exceptId ?? -1]
  )
  return taken ? `Brgy. ${taken.name} already has a Barangay Official account.` : null
}

// User list and details include every account's email — CDRRMO only.
router.get('/', authorize('CDRRMO Personnel'), async (req, res) => {
  try {
    const { search, role } = req.query
    let sql = `SELECT u.id, u.name, u.username, u.email, u.role, u.barangay_id, b.name as barangay_name, u.status, u.last_login, u.last_active, u.created_at,
               (u.last_active IS NOT NULL AND (julianday('now', '+8 hours') - julianday(u.last_active)) * 24 * 60 * 60 <= 90) AS is_online
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
    const slotError = await checkBarangaySlot(role, barangay_id)
    if (slotError) return res.status(400).json({ error: slotError })
    const hash = await hashPassword(password)
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
    const isSelf = String(req.params.id) === String(req.user.id)
    const { name, email, password } = req.body
    // You can't demote or deactivate your own account (you'd lock yourself out).
    const role = isSelf ? req.user.role : req.body.role
    const status = isSelf ? 'Active' : req.body.status
    const barangay_id = role === 'CDRRMO Personnel' ? null : (req.body.barangay_id || null)
    if (!name || !email || !role) return res.status(400).json({ error: 'Name, email and role are required.' })
    const slotError = await checkBarangaySlot(role, barangay_id, req.params.id)
    if (slotError) return res.status(400).json({ error: slotError })
    if (password && password.trim()) {
      const hash = await hashPassword(password)
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
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'That email is already used by another account.' })
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', authorize('CDRRMO Personnel'), async (req, res) => {
  try {
    if (req.params.id == req.user.id) return res.status(400).json({ error: 'Cannot delete own account' })
    // Clear everything that points at this user first, in one atomic batch,
    // so the delete works whether or not the database enforces foreign keys.
    const id = req.params.id
    await getDb().batch([
      { sql: 'UPDATE account_requests SET reviewed_by = NULL WHERE reviewed_by = ?', args: [id] },
      { sql: 'UPDATE password_reset_requests SET reviewed_by = NULL WHERE reviewed_by = ?', args: [id] },
      { sql: 'DELETE FROM notifications WHERE user_id = ?', args: [id] },
      { sql: 'DELETE FROM password_resets WHERE user_id = ?', args: [id] },
      { sql: 'DELETE FROM password_reset_requests WHERE user_id = ?', args: [id] },
      { sql: 'DELETE FROM users WHERE id = ?', args: [id] },
    ], 'write')
    res.json({ message: 'Deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router