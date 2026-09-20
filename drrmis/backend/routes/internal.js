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

  const [floodResp, perBarangayResp] = await Promise.all([
    fetch(`https://flood-api.open-meteo.com/v1/flood?latitude=${CENTER[0]}&longitude=${CENTER[1]}&daily=river_discharge&forecast_days=3&past_days=30`).then(r => r.json()),
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&current=rain&timezone=Asia%2FManila`).then(r => r.json()),
  ])

  const daily = floodResp?.daily?.river_discharge
  let dischargeRatio = null
  if (daily && daily.length >= 4) {
    const past = daily.slice(0, daily.length - 3)
    const baseline = past.reduce((sum, v) => sum + (v ?? 0), 0) / past.length
    const today = daily[past.length]
    if (baseline && today != null) dischargeRatio = today / baseline
  }

  const gateOpen = dischargeRatio != null && dischargeRatio >= 1.5
  const qualifying = gateOpen && Array.isArray(perBarangayResp)
    ? withCentroid.filter((b, i) => (perBarangayResp[i]?.current?.rain ?? null) > 30).map(b => b.id)
    : []

  await run(
    `INSERT INTO system_settings (key, value, updated_at) VALUES ('auto_flooded_barangay_ids', ?, datetime('now', '+8 hours'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [JSON.stringify(qualifying)]
  )

  return {
    checked: withCentroid.length,
    discharge_ratio: dischargeRatio,
    gate_open: gateOpen,
    qualifying_barangays: withCentroid.filter(b => qualifying.includes(b.id)).map(b => b.name),
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