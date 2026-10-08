const router = require('express').Router()
const { loadRiskContext, withHouseholdRisk, RISK_COLUMNS } = require('../utils/householdRisk')
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
    // the drawn flood area), so the Dashboard cards match the map and lists.
    const hh = await all(`
      SELECT h.id, h.barangay_id, h.purok_id, ${RISK_COLUMNS},
             (SELECT COUNT(*) FROM residents r WHERE r.household_id = h.id) AS member_count
      FROM households h
      LEFT JOIN barangays b ON h.barangay_id = b.id
      LEFT JOIN puroks p ON h.purok_id = p.id
    `)
    const atRisk = {}
    for (const h of withHouseholdRisk(hh, await loadRiskContext())) {
      if (!h.in_flood_risk_zone) continue
      const a = atRisk[h.barangay_id] || (atRisk[h.barangay_id] = { households: 0, population: 0 })
      a.households += 1
      a.population += Number(h.member_count || 0)
    }

    const result = rows.map(b => ({
      ...b,
      at_risk_households: atRisk[b.barangay_id]?.households || 0,
      at_risk_population: atRisk[b.barangay_id]?.population || 0,
    })).sort((x, y) => y.at_risk_households - x.at_risk_households)
    res.json(result)
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