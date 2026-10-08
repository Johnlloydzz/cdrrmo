const jwt = require('jsonwebtoken')
const { get, run } = require('../db/database')

async function authenticate(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' })
  }
  const token = header.split(' ')[1]
  let decoded
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret')
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
  try {
    // The account is checked on every request, not just at sign-in: a user
    // CDRRMO deleted or set to Inactive is signed out right away (instead of
    // keeping access until their token expires, up to 30 days), and a role or
    // barangay change applies immediately.
    const user = await get('SELECT id, name, role, barangay_id, status FROM users WHERE id = ?', [decoded.id])
    if (!user || (user.status && user.status !== 'Active')) {
      return res.status(401).json({ error: 'Your account is no longer active. Please contact CDRRMO.' })
    }
    req.user = { ...decoded, name: user.name, role: user.role, barangay_id: user.barangay_id }
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
  // Fire-and-forget: stamps this user as "active right now" (at most once
  // every 20 seconds, so a page that makes many requests writes only once), powering the live online/offline indicator in User
  // Management. Never awaited — must not slow down or block the request.
  run(
    "UPDATE users SET last_active = datetime('now', '+8 hours') WHERE id = ? AND (last_active IS NULL OR last_active < datetime('now', '+8 hours', '-20 seconds'))",
    [decoded.id]
  ).catch(() => {})
  next()
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' })
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    next()
  }
}

module.exports = { authenticate, authorize }