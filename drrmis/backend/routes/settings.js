const router = require('express').Router()
const { expireStaleFloodData } = require('../db/floodLevel')
const { all, get, run } = require('../db/database')
const { authenticate } = require('../middleware/auth')
const { cached } = require('../utils/cache')
const { notify, notifyAutoFlood, CDRRMO, OFFICIAL } = require('../utils/notify')

router.use(authenticate)

// GET /api/settings/flood-level — the current flood water level (meters).
// 0 means "no active flood event" — falls back to the official static CDRA
// classification. `source` says who set the active level: 'manual' (CDRRMO
// typed it in) or 'auto' (the system's conservative auto-detect — sustained
// heavy rainfall AND river discharge well above its recent normal — set it).
// Auto-detect only ever raises a level from 0, and only ever lowers a level
// it set itself; a manually-set level is never touched by auto-detect.
router.get('/flood-level', cached(10, () => 'flood-level'), async (req, res) => {
  try {
    await expireStaleFloodData()
    const [levelRow, sourceRow] = await Promise.all([
      get('SELECT value, updated_at FROM system_settings WHERE key = ?', ['current_flood_level_m']),
      get('SELECT value FROM system_settings WHERE key = ?', ['current_flood_level_source']),
    ])
    res.json({
      level_m: levelRow ? parseFloat(levelRow.value) : 0,
      updated_at: levelRow?.updated_at || null,
      source: sourceRow?.value || 'manual',
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/settings/flood-level — body: { level_m, source? }. CDRRMO
// Personnel only (this covers both the manual "Update" button, which omits
// source and defaults to 'manual', and the page's own background
// auto-detect check, which passes source: 'auto' while acting under the
// signed-in CDRRMO Personnel's own session).
router.put('/flood-level', async (req, res) => {
  try {
    if (req.user.role !== 'CDRRMO Personnel') {
      return res.status(403).json({ error: 'Only CDRRMO Personnel can update the flood water level.' })
    }
    const level = parseFloat(req.body.level_m)
    if (isNaN(level) || level < 0 || level > 20) return res.status(400).json({ error: 'Flood level must be between 0 and 20 meters.' })
    const source = req.body.source === 'auto' ? 'auto' : 'manual'
    const prevRow = await get("SELECT value FROM system_settings WHERE key = 'current_flood_level_m'")
    const prevLevel = parseFloat(prevRow?.value) || 0
    // An automatic update never overrides a level CDRRMO set by hand (e.g. a
    // background check on another open page must not clear a real report).
    if (source === 'auto' && prevLevel > 0) {
      const prevSource = await get("SELECT value FROM system_settings WHERE key = 'current_flood_level_source'")
      if ((prevSource?.value || 'manual') === 'manual') {
        return res.status(409).json({ error: 'A flood level was set manually by CDRRMO; automatic updates are skipped until it is reset.' })
      }
    }
    await run(
      `INSERT INTO system_settings (key, value, updated_at) VALUES ('current_flood_level_m', ?, datetime('now', '+8 hours'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [String(level)]
    )
    await run(
      `INSERT INTO system_settings (key, value, updated_at) VALUES ('current_flood_level_source', ?, datetime('now', '+8 hours'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [source]
    )
    if (level !== prevLevel) {
      const how = source === 'auto' ? ' (auto-detected)' : ''
      const msg = level > 0
        ? { type: 'alert', title: `Flood level set: ${level} m${how}`,
            body: `If heavy rain hits your barangay, puroks in its flood-prone area will be flagged at risk at ${level} m. Check your households.` }
        : { type: 'system', title: 'Flood level cleared',
            body: 'The reported flood water level is back to 0 m (normal).' }
      await notify({ role: OFFICIAL, ...msg, link: '/households' })
      await notify({ role: CDRRMO, exclude_user_id: req.user.id, ...msg,
        body: level > 0 ? `${req.user.name || 'CDRRMO'} reported ${level} m${how}.` : `${req.user.name || 'CDRRMO'} reset the flood level to normal.`,
        link: '/flood-control' })
    }
    res.json({ level_m: level, source })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/settings/auto-flood-barangays — the set of barangays the
// per-barangay auto-detect currently considers flooded (each barangay's own
// local rainfall crossed PAGASA Red AND the city's river discharge is well
// above normal at the same time). Barangays NOT in this list fall back to
// their static CDRA classification — auto-detect only marks the specific
// area actually experiencing heavy rain, not the whole city at once.
router.get('/auto-flood-barangays', cached(10, () => 'auto-flood'), async (req, res) => {
  try {
    await expireStaleFloodData()
    const row = await get('SELECT value FROM system_settings WHERE key = ?', ['auto_flooded_barangay_ids'])
    let barangay_ids = []
    try { barangay_ids = row ? JSON.parse(row.value) : [] } catch { barangay_ids = [] }
    // Why each barangay was flagged (intense / heavy 24h / prolonged rain),
    // so CDRRMO can see the actual numbers behind the alert.
    const reasonsRow = await get('SELECT value FROM system_settings WHERE key = ?', ['auto_flood_reasons'])
    let reasons = {}
    try { reasons = reasonsRow ? JSON.parse(reasonsRow.value) : {} } catch { reasons = {} }
    // "Simulate heavy rain" test switch: every barangay counts as having
    // heavy rain, exactly like the live auto-detect flagging it.
    const simulate = (await get("SELECT value FROM system_settings WHERE key = 'simulate_heavy_rain'"))?.value === '1'
    if (simulate) {
      const live = new Set(barangay_ids.map(Number))
      barangay_ids = (await all('SELECT id FROM barangays')).map(b => b.id)
      for (const id of barangay_ids) if (!live.has(id)) reasons[id] = 'TEST: simulated heavy rain'
    }
    const status = await require('./internal').getStatus()
    res.json({ barangay_ids, reasons, simulate, status })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/settings/auto-flood-barangays — replaces the whole list. Called
// by the Flood Simulation Control page's own background check (running
// under the signed-in CDRRMO Personnel's session), not typed by hand.
router.put('/auto-flood-barangays', async (req, res) => {
  try {
    if (req.user.role !== 'CDRRMO Personnel') {
      return res.status(403).json({ error: 'Only CDRRMO Personnel can update this.' })
    }
    const ids = Array.isArray(req.body.barangay_ids) ? req.body.barangay_ids.filter(n => Number.isInteger(n)) : []
    const prevRow = await get("SELECT value FROM system_settings WHERE key = 'auto_flooded_barangay_ids'")
    let prevIds = []
    try { prevIds = prevRow ? JSON.parse(prevRow.value) : [] } catch { prevIds = [] }
    await run(
      `INSERT INTO system_settings (key, value, updated_at) VALUES ('auto_flooded_barangay_ids', ?, datetime('now', '+8 hours'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [JSON.stringify(ids)]
    )
    await notifyAutoFlood(prevIds, ids)
    res.json({ barangay_ids: ids })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Browser backup for the rain auto-detect ──────────────────────────────────
// Open-Meteo can block the server (its free daily limit is per IP address,
// and a free Render server shares its IP with other apps). When that
// happens, a CDRRMO computer that has the system open fetches the rain data
// from ITS OWN internet connection and sends it here; the server then
// applies exactly the same rules (evaluateBarangay) as its own check.
const BROWSER_TAKEOVER_MIN = 12  // server hasn't succeeded for this long → ask a browser
const BROWSER_MIN_GAP_MIN = 4    // ignore duplicate reports from several open tabs
const minutesSince = (iso) => iso ? (Date.now() - new Date(iso).getTime()) / 60000 : Infinity
function browserNeeded(status) {
  return !status.server_ok || minutesSince(status.last_success_at) > BROWSER_TAKEOVER_MIN
}

// GET /api/settings/flood-check-plan — does the server need a browser's
// help right now, and which grid points to fetch if so. CDRRMO only.
router.get('/flood-check-plan', async (req, res) => {
  try {
    if (req.user.role !== 'CDRRMO Personnel') return res.json({ need_browser: false })
    const internal = require('./internal')
    const status = await internal.getStatus()
    if (!browserNeeded(status) || minutesSince(status.last_success_at) < BROWSER_MIN_GAP_MIN) {
      return res.json({ need_browser: false })
    }
    const plan = await internal.loadPlan()
    res.json({
      need_browser: true,
      points: plan.points.map(k => { const [lat, lng] = k.split(','); return { key: k, lat: Number(lat), lng: Number(lng) } }),
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/settings/flood-check-browser — body:
//   { points: { "<gridKey>": { currentRain, sum24, sum72, sum168 } }, discharge_ratio }
router.post('/flood-check-browser', async (req, res) => {
  try {
    if (req.user.role !== 'CDRRMO Personnel') {
      return res.status(403).json({ error: 'Only CDRRMO Personnel can send rain data.' })
    }
    const internal = require('./internal')
    const status = await internal.getStatus()
    // Server is healthy, or another tab/computer just reported: nothing to do.
    if (!browserNeeded(status) || minutesSince(status.last_success_at) < BROWSER_MIN_GAP_MIN) {
      return res.json({ skipped: true })
    }
    const num = (v) => (typeof v === 'number' && isFinite(v) && v >= 0 && v < 5000 ? v : null)
    const plan = await internal.loadPlan()
    const valid = new Set(plan.points)
    const pointData = new Map()
    for (const [key, d] of Object.entries(req.body?.points || {})) {
      if (!valid.has(key) || !d) continue
      const sum24 = num(d.sum24), sum72 = num(d.sum72), sum168 = num(d.sum168)
      if (sum24 == null || sum72 == null || sum168 == null) continue
      pointData.set(key, { currentRain: num(d.currentRain), sum24, sum72, sum168 })
    }
    if (pointData.size === 0) return res.status(400).json({ error: 'No valid rain data.' })
    const ratio = typeof req.body?.discharge_ratio === 'number' && isFinite(req.body.discharge_ratio) && req.body.discharge_ratio >= 0 && req.body.discharge_ratio < 100
      ? req.body.discharge_ratio : null
    res.json(await internal.applyResults(plan, pointData, ratio, 'browser'))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/settings/simulate-heavy-rain — body: { on: true|false }. CDRRMO
// Personnel only. A TEST switch for demos and drills: while on, every
// barangay is treated as having heavy rain, so puroks in flood-prone areas
// turn red at the flood level set on Flood Simulation Control (1 m if none).
router.put('/simulate-heavy-rain', async (req, res) => {
  try {
    if (req.user.role !== 'CDRRMO Personnel') {
      return res.status(403).json({ error: 'Only CDRRMO Personnel can use the heavy rain test switch.' })
    }
    const on = req.body.on === true
    const prev = (await get("SELECT value FROM system_settings WHERE key = 'simulate_heavy_rain'"))?.value === '1'
    await run(
      `INSERT INTO system_settings (key, value, updated_at) VALUES ('simulate_heavy_rain', ?, datetime('now', '+8 hours'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [on ? '1' : '0']
    )
    if (on !== prev) {
      const msg = on
        ? { type: 'alert', title: 'TEST: Heavy rain simulation started',
            body: 'This is a drill. Puroks in flood-prone areas are flagged at risk as if heavy rain were falling.' }
        : { type: 'system', title: 'TEST: Heavy rain simulation ended',
            body: 'The drill is over. Flood risk is back to live rainfall data.' }
      await notify({ role: OFFICIAL, ...msg, link: '/households' })
      await notify({ role: CDRRMO, exclude_user_id: req.user.id, ...msg, link: '/flood-control' })
    }
    res.json({ simulate: on })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/settings/system-info — basic organization info shown in the app
// (currently just this Settings page). Anyone signed in can view it.
router.get('/system-info', async (req, res) => {
  try {
    const keys = ['system_name', 'system_address', 'system_contact', 'system_email']
    const rows = await Promise.all(keys.map(k => get('SELECT value FROM system_settings WHERE key = ?', [k])))
    res.json({
      name: rows[0]?.value || 'PDRA - Gingoog City CDRRMO',
      address: rows[1]?.value || 'Gingoog City, Misamis Oriental',
      contact: rows[2]?.value || '',
      email: rows[3]?.value || '',
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/settings/system-info — CDRRMO Personnel only.
router.put('/system-info', async (req, res) => {
  try {
    if (req.user.role !== 'CDRRMO Personnel') {
      return res.status(403).json({ error: 'Only CDRRMO Personnel can update system information.' })
    }
    const { name, address, contact, email } = req.body
    const entries = [['system_name', name], ['system_address', address], ['system_contact', contact], ['system_email', email]]
    await Promise.all(entries.map(([key, value]) =>
      run(
        `INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, datetime('now', '+8 hours'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        [key, value || '']
      )
    ))
    res.json({ name, address, contact, email })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router