const router = require('express').Router()
const { all, get, run } = require('../db/database')
const { authenticate, authorize } = require('../middleware/auth')

// POST /api/password-reset-requests — public, no auth. A user who can't
// receive the OTP email submits their username or email here instead.
// Always responds the same way whether or not it matched an account, so
// this can't be used to check which usernames/emails are registered.
router.post('/', async (req, res) => {
  try {
    const { identifier, message } = req.body
    if (!identifier || !identifier.trim()) {
      return res.status(400).json({ error: 'Enter your username or email.' })
    }
    const user = await get('SELECT id FROM users WHERE username = ? OR email = ?', [identifier.trim(), identifier.trim()])
    if (user) {
      await run(
        'INSERT INTO password_reset_requests (user_id, message) VALUES (?, ?)',
        [user.id, message || null]
      )
    }
    res.status(201).json({ message: 'If that account exists, CDRRMO has been notified and will reset your password.' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Everything below is for CDRRMO Personnel reviewing requests.
router.use(authenticate)

// GET /api/password-reset-requests — list, newest first, optional ?status=
router.get('/', authorize('CDRRMO Personnel'), async (req, res) => {
  try {
    const { status } = req.query
    let sql = `SELECT prr.*, u.name as user_name, u.username, u.email, u.role, b.name as barangay_name
               FROM password_reset_requests prr
               JOIN users u ON prr.user_id = u.id
               LEFT JOIN barangays b ON u.barangay_id = b.id WHERE 1=1`
    const params = []
    if (status && status !== 'All') { sql += ' AND prr.status = ?'; params.push(status) }
    sql += ' ORDER BY prr.created_at DESC'
    res.json(await all(sql, params))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/password-reset-requests/:id/resolve — marks it handled, e.g.
// after CDRRMO has reset the account's password in User Management and
// relayed it to the official outside the system.
router.put('/:id/resolve', authorize('CDRRMO Personnel'), async (req, res) => {
  try {
    const existing = await get('SELECT * FROM password_reset_requests WHERE id = ?', [req.params.id])
    if (!existing) return res.status(404).json({ error: 'Request not found' })
    await run(
      `UPDATE password_reset_requests SET status='Resolved', reviewed_by=?, updated_at=datetime('now', '+8 hours') WHERE id=?`,
      [req.user.id, req.params.id]
    )
    res.json(await get('SELECT * FROM password_reset_requests WHERE id = ?', [req.params.id]))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /api/password-reset-requests/:id
router.delete('/:id', authorize('CDRRMO Personnel'), async (req, res) => {
  try {
    await run('DELETE FROM password_reset_requests WHERE id = ?', [req.params.id])
    res.json({ message: 'Deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router