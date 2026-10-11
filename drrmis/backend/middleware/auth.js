const jwt = require('jsonwebtoken')
const { get, run } = require('../db/database')

// Speed: every request used to look the account up in the database first —
// one extra trip to the hosted database (≈100–200 ms) before the page's own
// data. The result is now remembered for 15 seconds per user. A change made
// in User Management (deactivate, role, barangay) clears it at once, so it
// still applies right away.
const USER_TTL_MS = 15 * 1000
const userCache = new Map() // id → { user, at }
function forgetUser(id) { if (id == null) userCache.clear(); else userCache.delete(Number(id)) }
async function loadUser(id) {
  const hit = userCache.get(Number(id))
  if (hit && Date.now() - hit.at < USER_TTL_MS) return hit.user
  const user = await get('SELECT id, name, role, barangay_id, status FROM users WHERE id = ?', [id])
  userCache.set(Number(id), { user, at: Date.now() })
  if (userCache.size > 500) userCache.delete(userCache.keys().next().value)
  return user
}

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
    const user = await loadUser(decoded.id)
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

module.exports = { authenticate, authorize, forgetUser }