const router = require('express').Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { get, run } = require('../db/database')
const { authenticate } = require('../middleware/auth')
const { sendOtpEmail } = require('../utils/mailer')

const JWT_SECRET  = process.env.JWT_SECRET  || 'dev_secret'
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d'

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password)
      return res.status(400).json({ error: 'Username and password are required.' })

    const user = await get(
      `SELECT u.*, b.name as barangay_name FROM users u LEFT JOIN barangays b ON u.barangay_id = b.id WHERE u.username = ? AND u.status = ?`,
      [username, 'Active']
    )
    if (!user) return res.status(401).json({ error: 'Invalid credentials.' })

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials.' })

    await run('UPDATE users SET last_login = datetime(\'now\', \'+8 hours\') WHERE id = ?', [user.id])

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name, barangay_id: user.barangay_id },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    )

    res.json({
      token,
      user: { id: user.id, name: user.name, username: user.username, role: user.role, barangay_id: user.barangay_id, barangay: user.barangay_name || 'All' }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: 'All fields are required.' })
    if (newPassword.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters.' })

    const user = await get('SELECT * FROM users WHERE id = ?', [req.user.id])
    const valid = await bcrypt.compare(currentPassword, user.password_hash)
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect.' })

    const hash = await bcrypt.hash(newPassword, 12)
    await run('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\', \'+8 hours\') WHERE id = ?', [hash, req.user.id])
    res.json({ message: 'Password updated successfully.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await get(
      `SELECT u.id, u.name, u.username, u.email, u.role, u.barangay_id, b.name as barangay, u.last_login
       FROM users u LEFT JOIN barangays b ON u.barangay_id = b.id WHERE u.id = ?`,
      [req.user.id]
    )
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/forgot-password — generates a 6-digit OTP, emails it, and
// stores it (hashed nowhere needed — it's short-lived and single-use) with a
// 10-minute expiry. Always responds the same way whether or not the email
// exists, so this endpoint can't be used to check which emails are registered.
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email is required.' })

    const user = await get('SELECT id, name, email FROM users WHERE email = ?', [email])
    if (user) {
      const otp = String(Math.floor(100000 + Math.random() * 900000)) // 6 digits
      const expiresAt = new Date(Date.now() + 10 * 60000).toISOString()
      await run('INSERT INTO password_resets (user_id, otp, expires_at) VALUES (?, ?, ?)', [user.id, otp, expiresAt])
      try {
        await sendOtpEmail(user.email, user.name, otp)
      } catch (mailErr) {
        console.error('Failed to send OTP email:', mailErr.message)
        return res.status(500).json({ error: 'Could not send the reset email right now. Please try again shortly.' })
      }
    }
    // Same response either way — don't reveal whether the email is registered.
    res.json({ message: 'If that email is registered, a one-time code has been sent.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/verify-otp — checks the code without consuming it, so the
// frontend can give immediate feedback before showing the new-password step.
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body
    if (!email || !otp) return res.status(400).json({ error: 'Email and code are required.' })

    const user = await get('SELECT id FROM users WHERE email = ?', [email])
    if (!user) return res.status(400).json({ error: 'Invalid or expired code.' })

    const record = await get(
      `SELECT * FROM password_resets WHERE user_id = ? AND otp = ? AND used = 0 AND expires_at > datetime('now', '+8 hours') ORDER BY id DESC LIMIT 1`,
      [user.id, otp]
    )
    if (!record) return res.status(400).json({ error: 'Invalid or expired code.' })

    res.json({ message: 'Code verified.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/reset-password — re-checks the code (defense in depth) and,
// if valid, actually updates the password and marks the code used so it
// can't be replayed.
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body
    if (!email || !otp || !newPassword) return res.status(400).json({ error: 'All fields are required.' })
    if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' })

    const user = await get('SELECT id FROM users WHERE email = ?', [email])
    if (!user) return res.status(400).json({ error: 'Invalid or expired code.' })

    const record = await get(
      `SELECT * FROM password_resets WHERE user_id = ? AND otp = ? AND used = 0 AND expires_at > datetime('now', '+8 hours') ORDER BY id DESC LIMIT 1`,
      [user.id, otp]
    )
    if (!record) return res.status(400).json({ error: 'Invalid or expired code.' })

    const hash = await bcrypt.hash(newPassword, 12)
    await run('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\', \'+8 hours\') WHERE id = ?', [hash, user.id])
    await run('UPDATE password_resets SET used = 1 WHERE id = ?', [record.id])

    res.json({ message: 'Password has been reset successfully.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router