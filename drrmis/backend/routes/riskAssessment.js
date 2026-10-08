const router = require('express').Router()
const { loadRiskContext, purokRiskRows } = require('../utils/householdRisk')
const { all, get } = require('../db/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

// Per-barangay summary: total households/population vs. those inside
// high flood-risk puroks (geofencing result), for the Risk Assessment Dashboard.
//
// At-risk logic:
// - If a flood water level has been manually reported (level_m > 0), a purok
//   is at-risk when that level meets or exceeds its flood_threshold_m —
//   this is the real-time flood simulation.
// - Otherwise (no active flood event reported), at-risk falls back to the
//   static official CDRA classification (flood_risk = 'High').
router.get('/summary', async (req, res) => {
  try {
    // Totals per barangay (all households / residents).
    const rows = await all(`
      SELECT
        b.id                    AS barangay_id,
        b.name                  AS barangay_name,
        b.risk_level            AS barangay_risk_level,
        COUNT(DISTINCT h.id)    AS total_households,
        COUNT(DISTINCT r.id)    AS total_population
      FROM barangays b
      LEFT JOIN households h ON h.barangay_id = b.id
      LEFT JOIN residents r ON r.household_id = h.id
      GROUP BY b.id, b.name, b.risk_level
    `)

    // At-risk counts use the SAME geofencing as /api/households (including
    // the drawn flood area), worked out per purok: every household in an
    // at-risk purok is at risk, with its members as the population.
    const atRisk = {}
    for (const p of await purokRiskRows(await loadRiskContext())) {
      if (!p.in_flood_risk_zone) continue
      const a = atRisk[p.barangay_id] || (atRisk[p.barangay_id] = { households: 0, population: 0 })
      a.households += Number(p.households || 0)
      a.population += Number(p.members || 0)
    }

    const result = rows.map(b => ({
      ...b,
      at_risk_households: atRisk[b.barangay_id]?.households || 0,
      at_risk_population: atRisk[b.barangay_id]?.population || 0,
    })).sort((x, y) => y.at_risk_households - x.at_risk_households)
    res.json(result)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/risk-assessment/puroks[?barangay_id=] — one row per purok with its
// map point, household/member counts and flood/landslide at-risk flags.
// Used by the Dashboard drill-down, Flood Simulation Control and GIS Map
// instead of downloading every household.
router.get('/puroks', async (req, res) => {
  try {
    const barangayId = req.user.role === 'Barangay Official' ? req.user.barangay_id : (req.query.barangay_id || null)
    const rows = await purokRiskRows(await loadRiskContext(), { barangayId })
    res.json(rows.map(p => ({
      purok_id: p.purok_id, purok_name: p.purok_name, barangay_id: p.barangay_id, barangay_name: p.barangay_name,
      lat: p.purok_lat, lng: p.purok_lng, households: Number(p.households || 0), members: Number(p.members || 0),
      in_flood_risk_zone: p.in_flood_risk_zone, in_landslide_risk_zone: p.in_landslide_risk_zone,
    })))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Per-purok breakdown for a single barangay (drill-down view)
router.get('/barangay/:barangayId', async (req, res) => {
  try {
    const rows = await all(`
      SELECT
        p.id                                             AS purok_id,
        p.name                                            AS purok_name,
        p.flood_risk                                      AS flood_risk,
        COUNT(DISTINCT h.id)                               AS total_households,
        COUNT(DISTINCT r.id)                               AS total_population
      FROM puroks p
      LEFT JOIN households h ON h.purok_id = p.id
      LEFT JOIN residents r ON r.household_id = h.id
      WHERE p.barangay_id = ?
      GROUP BY p.id, p.name, p.flood_risk
      ORDER BY (p.flood_risk = 'High') DESC, p.name
    `, [req.params.barangayId])
    res.json(rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router