const jwt = require('jsonwebtoken')
const { run } = require('../db/database')

function authenticate(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' })
  }
  const token = header.split(' ')[1]
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret')
    req.user = decoded
    // Fire-and-forget: stamps this user as "active right now" on every
    // request, powering the live online/offline indicator in User
    // Management. Never awaited — must not slow down or block the request.
    run('UPDATE users SET last_active = datetime(\'now\', \'+8 hours\') WHERE id = ?', [decoded.id]).catch(() => {})
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
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