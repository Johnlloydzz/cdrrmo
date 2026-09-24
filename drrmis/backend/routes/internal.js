// Runs the same conservative per-barangay auto-detect check as the Flood
// Simulation Control page's browser-side logic, but from the server itself
// — so it keeps working even when nobody has that page open. Scheduled
// with node-cron directly inside this backend (see server.js) — pure
// JavaScript, no external service or YAML workflow file needed.
//
// Note: Render's free tier puts a web service to sleep after ~15 minutes
// with no incoming HTTP requests. This scheduled job only runs while the
// server happens to be awake — it does not itself keep the server awake.
// In practice, any real traffic (someone using the site) wakes it up and
// the check resumes; there's just no guarantee of a check firing during a
// long stretch with zero visitors. That's a fair tradeoff for a capstone
// system on a free-tier server.

const router = require('express').Router()
const { all, run } = require('../db/database')

const CENTER = [8.8231, 125.1109] // Gingoog City

function getCentroid(geojson) {
  if (!geojson) return null
  try {
    let rings = []
    if (geojson.type === 'Polygon') rings = [geojson.coordinates[0]]
    else if (geojson.type === 'MultiPolygon') rings = geojson.coordinates.map(poly => poly[0])
    else return null
    let sumLat = 0, sumLng = 0, count = 0
    rings.forEach(ring => ring.forEach(([lng, lat]) => { sumLat += lat; sumLng += lng; count++ }))
    return count === 0 ? null : [sumLat / count, sumLng / count]
  } catch { return null }
}

// The actual check — shared by the scheduled cron job (server.js) and the
// manual-trigger HTTP route below, so the logic only lives in one place.
// Flood-detection thresholds — each overridable via a Render environment
// variable so CDRRMO can calibrate them against Gingoog's own flood history
// without touching code. Rainfall bands follow PAGASA's 24-hour accumulated
// rainfall categories (50–100 mm moderate-to-heavy, 100–200 mm heavy-to-
// intense, >200 mm intense-to-torrential) and its hourly Red warning (>30 mm/hr).
const T = {
  intenseRainMmHr:        parseFloat(process.env.INTENSE_RAIN_MM_HR) || 30,
  intenseDischargeRatio:  parseFloat(process.env.INTENSE_DISCHARGE_RATIO) || 1.5,
  heavy24hMm:             parseFloat(process.env.HEAVY_24H_MM) || 100,
  prolonged72hMm:         parseFloat(process.env.PROLONGED_72H_MM) || 150,
  prolonged7dMm:          parseFloat(process.env.PROLONGED_7D_MM) || 250,
  prolongedDischargeRatio: parseFloat(process.env.PROLONGED_DISCHARGE_RATIO) || 1.2,
}

// Decides whether one barangay should be flagged as flooded, and why.
// Three different ways rain floods Gingoog, any one is enough:
//  1. INTENSE: a very heavy downpour right now (PAGASA Red, >30 mm/hr) while
//     the river is already well above normal.
//  2. HEAVY 24H: a lot of rain piled up within one day (≥100 mm, PAGASA's
//     "heavy to intense" band) — floods even if each hour looked moderate.
//  3. PROLONGED: light-to-moderate rain that just doesn't stop for days
//     (≥150 mm over 3 days or ≥250 mm over 7 days) — the ground saturates
//     and creeks/rivers keep rising — while the river is at least somewhat
//     above normal, confirming the water is actually building up.
// Returns a short human-readable reason, or null if not flagged.
function evaluateBarangay({ currentRain, sum24, sum72, sum168, dischargeRatio }) {
  const ratio = dischargeRatio ?? 0
  if (currentRain != null && currentRain > T.intenseRainMmHr && ratio >= T.intenseDischargeRatio) {
    return `Intense rain now: ${currentRain} mm/hr, river ${ratio.toFixed(1)}x normal`
  }
  if (sum24 >= T.heavy24hMm) {
    return `Heavy rain: ${Math.round(sum24)} mm in the last 24 hours`
  }
  if (ratio >= T.prolongedDischargeRatio && (sum72 >= T.prolonged72hMm || sum168 >= T.prolonged7dMm)) {
    return sum72 >= T.prolonged72hMm
      ? `Prolonged rain: ${Math.round(sum72)} mm over 3 days, river ${ratio.toFixed(1)}x normal`
      : `Prolonged rain: ${Math.round(sum168)} mm over 7 days, river ${ratio.toFixed(1)}x normal`
  }
  return null
}

// Sums the last `hours` hourly readings up to and including the current hour.
function sumLastHours(times, values, currentTime, hours) {
  if (!Array.isArray(times) || !Array.isArray(values)) return 0
  let idx = -1
  for (let i = times.length - 1; i >= 0; i--) { if (times[i] <= currentTime) { idx = i; break } }
  if (idx < 0) return 0
  let total = 0
  for (let i = Math.max(0, idx - hours + 1); i <= idx; i++) total += values[i] ?? 0
  return total
}

async function runFloodAutoDetectCheck() {
  const barangays = await all('SELECT id, name, boundary_geojson FROM barangays WHERE boundary_geojson IS NOT NULL')
  const withCentroid = barangays
    .map(b => { try { return { ...b, centroid: getCentroid(JSON.parse(b.boundary_geojson)) } } catch { return { ...b, centroid: null } } })
    .filter(b => b.centroid)

  if (withCentroid.length === 0) {
    return { checked: 0, qualifying_barangays: [], note: 'No barangays with a boundary to check.' }
  }

  const lats = withCentroid.map(b => b.centroid[0]).join(',')
  const lngs = withCentroid.map(b => b.centroid[1]).join(',')

  // One batched call: current rain + the last 7 days of hourly rainfall for
  // every barangay, so accumulated totals (24h / 3 days / 7 days) can be
  // computed — not just what's falling this very hour.
  const [floodResp, perBarangayResp] = await Promise.all([
    fetch(`https://flood-api.open-meteo.com/v1/flood?latitude=${CENTER[0]}&longitude=${CENTER[1]}&daily=river_discharge&forecast_days=3&past_days=30`).then(r => r.json()),
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&current=rain&hourly=precipitation&past_days=7&forecast_days=1&timezone=Asia%2FManila`).then(r => r.json()),
  ])

  const daily = floodResp?.daily?.river_discharge
  let dischargeRatio = null
  if (daily && daily.length >= 4) {
    const past = daily.slice(0, daily.length - 3)
    const baseline = past.reduce((sum, v) => sum + (v ?? 0), 0) / past.length
    const today = daily[past.length]
    if (baseline && today != null) dischargeRatio = today / baseline
  }

  // Open-Meteo returns an array for multiple locations, a single object for one.
  const results = Array.isArray(perBarangayResp) ? perBarangayResp : [perBarangayResp]
  const reasons = {}
  withCentroid.forEach((b, i) => {
    const r = results[i]
    if (!r) return
    const currentTime = r.current?.time || ''
    const times = r.hourly?.time
    const values = r.hourly?.precipitation
    const reason = evaluateBarangay({
      currentRain: r.current?.rain ?? null,
      sum24:  sumLastHours(times, values, currentTime, 24),
      sum72:  sumLastHours(times, values, currentTime, 72),
      sum168: sumLastHours(times, values, currentTime, 168),
      dischargeRatio,
    })
    if (reason) reasons[b.id] = reason
  })
  const qualifying = Object.keys(reasons).map(Number)

  const upsert = (key, value) => run(
    `INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, datetime('now', '+8 hours'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value]
  )
  await upsert('auto_flooded_barangay_ids', JSON.stringify(qualifying))
  await upsert('auto_flood_reasons', JSON.stringify(reasons))

  return {
    checked: withCentroid.length,
    discharge_ratio: dischargeRatio,
    qualifying_barangays: withCentroid.filter(b => reasons[b.id]).map(b => `${b.name} — ${reasons[b.id]}`),
  }
}

// GET /api/internal/flood-check?token=... — manual-trigger version of the
// same check, protected by a shared secret (CRON_SECRET env var). Handy for
// testing from a browser; the scheduled job in server.js doesn't use this
// route at all, it calls runFloodAutoDetectCheck() directly.
router.get('/flood-check', async (req, res) => {
  try {
    const expected = process.env.CRON_SECRET
    if (!expected || req.query.token !== expected) {
      return res.status(401).json({ error: 'Invalid or missing token' })
    }
    res.json(await runFloodAutoDetectCheck())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
module.exports.runFloodAutoDetectCheck = runFloodAutoDetectCheck
module.exports.evaluateBarangay = evaluateBarangay
module.exports.sumLastHours = sumLastHours