// Response cache for the busiest READ endpoints (Dashboard summary, maps,
// barangay list, flood status) so that many users at once — e.g. all 79
// barangays during a typhoon — don't each make the server re-count every
// household. Two layers:
//
//  1. Memory (always on): instant, no setup.
//  2. Redis (optional): used when REDIS_URL is set on Render. Shared and
//     survives a server restart. If Redis is slow or down, the system just
//     skips it — a cache problem can never break a page.
//
// Freshness: every cached answer expires after a few seconds, AND the whole
// cache is cleared the moment anyone saves anything (household, purok,
// barangay, flood level, test switch...) or the rain auto-detect updates —
// so users never see old numbers after a change.

const MAX_MEMORY_ENTRIES = 500

// Changing the generation makes every old entry unreachable (cleared).
// It starts from the boot time so a restart never reads leftovers in Redis.
const bootId = Date.now().toString(36)
let counter = 0
const generation = () => `${bootId}.${counter}`
function clearAll() { counter++; memory.clear() }

// ── Layer 1: memory ─────────────────────────────────────────────────────────
const memory = new Map() // key -> { body, expires }
function memGet(key) {
  const e = memory.get(key)
  if (!e) return undefined
  if (e.expires < Date.now()) { memory.delete(key); return undefined }
  return e.body
}
function memSet(key, body, ttlSec) {
  if (memory.size >= MAX_MEMORY_ENTRIES) memory.delete(memory.keys().next().value) // drop oldest
  memory.set(key, { body, expires: Date.now() + ttlSec * 1000 })
}

// ── Layer 2: Redis (optional) ───────────────────────────────────────────────
let redis = null
let redisReady = false
if (process.env.REDIS_URL) {
  try {
    const { createClient } = require('redis')
    redis = createClient({
      url: process.env.REDIS_URL,
      disableOfflineQueue: true, // fail fast instead of waiting while disconnected
      socket: { connectTimeout: 5000, reconnectStrategy: (n) => Math.min(n * 1000, 30000) },
    })
    let lastLog = 0
    redis.on('ready', () => { redisReady = true; console.log('[cache] Redis connected') })
    redis.on('end', () => { redisReady = false })
    redis.on('error', (err) => {
      redisReady = false
      if (Date.now() - lastLog > 60000) { lastLog = Date.now(); console.error('[cache] Redis unavailable, using memory only:', err.message) }
    })
    redis.connect().catch(() => { /* reported by the error handler */ })
  } catch (err) {
    console.error('[cache] Redis client could not start, using memory only:', err.message)
    redis = null
  }
} else {
  console.log('[cache] memory cache on (set REDIS_URL to also use Redis)')
}

// Never let Redis slow a request down: give up after 300 ms.
function withTimeout(promise, ms = 300) {
  return Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(undefined), ms))])
}
async function redisGet(key) {
  if (!redis || !redisReady) return undefined
  try { const v = await withTimeout(redis.get(key)); return v == null ? undefined : v } catch { return undefined }
}
function redisSet(key, body, ttlSec) {
  if (!redis || !redisReady) return
  redis.set(key, body, { EX: ttlSec }).catch(() => {})
}

// ── Express middleware ──────────────────────────────────────────────────────
// cached(ttlSec, keyFn?) — put AFTER authentication on a GET route.
// keyFn(req) must include anything that changes the answer (e.g. the
// barangay a Barangay Official is limited to). Default: the full URL.
const pending = new Map() // key -> Promise<body|null>, so 79 users at once trigger ONE database read

function cached(ttlSec, keyFn) {
  return async (req, res, next) => {
    const key = `pdra:${generation()}:${keyFn ? keyFn(req) : req.originalUrl}`
    const send = (body) => { res.set('X-Cache', 'HIT'); res.type('json').send(body) }

    let body = memGet(key)
    if (body !== undefined) return send(body)
    body = await redisGet(key)
    if (body !== undefined) { memSet(key, body, ttlSec); return send(body) }

    // Someone is already loading this exact answer — wait for it.
    if (pending.has(key)) {
      body = await pending.get(key)
      if (body != null) return send(body)
      return next()
    }

    let resolve
    const p = new Promise((r) => { resolve = r })
    pending.set(key, p)
    const done = (value) => { if (pending.get(key) === p) pending.delete(key); resolve(value) }

    const originalJson = res.json.bind(res)
    res.json = (data) => {
      if (res.statusCode !== 200) { done(null); return originalJson(data) }
      let str
      try { str = JSON.stringify(data) } catch { done(null); return originalJson(data) }
      memSet(key, str, ttlSec)
      redisSet(key, str, ttlSec)
      done(str)
      res.set('X-Cache', 'MISS')
      return res.type('json').send(str)
    }
    res.on('close', () => done(null))
    next()
  }
}

// Clears the cache around every successful change. Mounted in server.js
// for the routes whose data is cached (cleared both when the change starts
// and when it finishes, so a read running at the same time can't keep old
// numbers).
function clearOnWrite(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next()
  clearAll()
  res.on('finish', () => { if (res.statusCode < 400) clearAll() })
  next()
}

module.exports = { cached, clearOnWrite, clearAll }