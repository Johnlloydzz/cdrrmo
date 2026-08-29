const router = require('express').Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { get, run } = require('../db/database')
const { authenticate } = require('../middleware/auth')

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

module.exports = router