const router = require('express').Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { get, run } = require('../db/database')
const { authenticate } = require('../middleware/auth')
const { sendOtpEmail } = require('../utils/mailer')

const JWT_SECRET  = process.env.JWT_SECRET  || 'dev_secret'
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d'
// "Remember me" gets a much longer-lived token (like Facebook's persistent
// login); unchecked gets a short one, closer to a plain browser session.
const JWT_EXPIRES_REMEMBERED = process.env.JWT_EXPIRES_IN_REMEMBERED || '30d'
const JWT_EXPIRES_UNREMEMBERED = process.env.JWT_EXPIRES_IN_UNREMEMBERED || '1d'

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password, remember } = req.body
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
      { expiresIn: remember ? JWT_EXPIRES_REMEMBERED : JWT_EXPIRES_UNREMEMBERED }
    )

    res.json({
      token,
      remember: !!remember,
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

// ── Forgot password: 6-digit code by email ─────────────────────────────────
// 1. /forgot-password  — username or email → a code is emailed (10 min)
// 2. /verify-otp       — check the code (max 5 wrong tries per code)
// 3. /reset-password   — set the new password; the code is used up
//
// Times are stored in Philippine time ("YYYY-MM-DD HH:MM:SS", same as the rest
// of the database) so they compare correctly with datetime('now', '+8 hours').
const OTP_MINUTES = 10
const OTP_MAX_ATTEMPTS = 5
const OTP_MAX_PER_15_MIN = 3

const crypto = require('crypto')
const findUser = (identifier) => get(
  "SELECT id, name, email, status FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)",
  [identifier, identifier]
)
// Latest unused, unexpired code for a user.
const activeCode = (userId) => get(
  `SELECT * FROM password_resets WHERE user_id = ? AND used = 0 AND expires_at > datetime('now', '+8 hours') ORDER BY id DESC LIMIT 1`,
  [userId]
)
// Checks a code for a user. Wrong guesses count against the latest code; after
// OTP_MAX_ATTEMPTS it stops working and a new code must be requested.
async function checkCode(userId, otp) {
  const record = await activeCode(userId)
  if (!record) return { ok: false, error: 'This code has expired. Request a new one.' }
  if ((record.attempts || 0) >= OTP_MAX_ATTEMPTS) return { ok: false, error: 'Too many wrong tries. Request a new code.' }
  if (String(record.otp) !== String(otp).trim()) {
    await run('UPDATE password_resets SET attempts = COALESCE(attempts, 0) + 1 WHERE id = ?', [record.id])
    const left = OTP_MAX_ATTEMPTS - (record.attempts || 0) - 1
    return { ok: false, error: left > 0 ? `Wrong code. ${left} ${left === 1 ? 'try' : 'tries'} left.` : 'Too many wrong tries. Request a new code.' }
  }
  return { ok: true, record }
}

// POST /api/auth/forgot-password  { identifier }  (username or email)
router.post('/forgot-password', async (req, res) => {
  try {
    const identifier = String(req.body.identifier || req.body.email || '').trim()
    if (!identifier) return res.status(400).json({ error: 'Enter your username or email.' })

    const generic = { message: 'If that account exists, a code has been sent to its email.' }
    const user = await findUser(identifier)
    // Same answer for unknown / inactive accounts — so this can't be used to
    // find out which usernames or emails exist.
    if (!user || !user.email || (user.status && user.status !== 'Active')) return res.json(generic)

    const recent = await get(
      `SELECT COUNT(*) AS c FROM password_resets WHERE user_id = ? AND created_at > datetime('now', '+8 hours', '-15 minutes')`,
      [user.id]
    )
    if ((recent?.c || 0) >= OTP_MAX_PER_15_MIN) {
      return res.status(429).json({ error: 'Too many code requests. Please wait 15 minutes, then try again.' })
    }

    // Only the newest code works.
    await run('UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0', [user.id])
    const otp = String(crypto.randomInt(100000, 1000000)) // 6 digits, cryptographically random
    await run(
      `INSERT INTO password_resets (user_id, otp, expires_at) VALUES (?, ?, datetime('now', '+8 hours', '+${OTP_MINUTES} minutes'))`,
      [user.id, otp]
    )
    try {
      await sendOtpEmail(user.email, user.name, otp)
    } catch (mailErr) {
      console.error('Failed to send OTP email:', mailErr.message)
      return res.status(500).json({ error: 'Could not send the code right now. Please try again shortly.' })
    }
    res.json(generic)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/verify-otp  { identifier, otp }
router.post('/verify-otp', async (req, res) => {
  try {
    const identifier = String(req.body.identifier || req.body.email || '').trim()
    const { otp } = req.body
    if (!identifier || !otp) return res.status(400).json({ error: 'Enter the 6-digit code.' })
    const user = await findUser(identifier)
    if (!user) return res.status(400).json({ error: 'This code has expired. Request a new one.' })
    const check = await checkCode(user.id, otp)
    if (!check.ok) return res.status(400).json({ error: check.error })
    res.json({ message: 'Code verified.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/reset-password  { identifier, otp, newPassword }
router.post('/reset-password', async (req, res) => {
  try {
    const identifier = String(req.body.identifier || req.body.email || '').trim()
    const { otp, newPassword } = req.body
    if (!identifier || !otp || !newPassword) return res.status(400).json({ error: 'All fields are required.' })
    if (String(newPassword).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' })

    const user = await findUser(identifier)
    if (!user) return res.status(400).json({ error: 'This code has expired. Request a new one.' })
    const check = await checkCode(user.id, otp)
    if (!check.ok) return res.status(400).json({ error: check.error })

    const hash = await bcrypt.hash(newPassword, 12)
    await run("UPDATE users SET password_hash = ?, updated_at = datetime('now', '+8 hours') WHERE id = ?", [hash, user.id])
    await run('UPDATE password_resets SET used = 1 WHERE user_id = ?', [user.id])
    res.json({ message: 'Password has been reset successfully.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router