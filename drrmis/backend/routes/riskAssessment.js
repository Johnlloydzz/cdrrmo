const router = require('express').Router()
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
    const [levelRow, sourceRow, autoRow] = await Promise.all([
      get('SELECT value FROM system_settings WHERE key = ?', ['current_flood_level_m']),
      get('SELECT value FROM system_settings WHERE key = ?', ['current_flood_level_source']),
      get('SELECT value FROM system_settings WHERE key = ?', ['auto_flooded_barangay_ids']),
    ])
    const floodLevel = levelRow ? parseFloat(levelRow.value) : 0
    const manualActive = (sourceRow?.value || 'manual') === 'manual' && floodLevel > 0
    let autoBarangayIds = []
    try { autoBarangayIds = autoRow ? JSON.parse(autoRow.value) : [] } catch { autoBarangayIds = [] }

    // Same priority as /api/households: manual citywide level first, then
    // auto-detect's per-barangay list (only those specific barangays get
    // the dynamic 1m check — everyone else uses the static classification),
    // then the static classification for everyone if neither is active.
    let atRiskCondition, atRiskParams
    if (manualActive) {
      atRiskCondition = `? >= p.flood_threshold_m`
      atRiskParams = [floodLevel]
    } else if (autoBarangayIds.length > 0) {
      const placeholders = autoBarangayIds.map(() => '?').join(',')
      atRiskCondition = `(CASE WHEN b.id IN (${placeholders}) THEN 1 >= p.flood_threshold_m ELSE p.flood_risk = 'High' END)`
      atRiskParams = [...autoBarangayIds]
    } else {
      atRiskCondition = `p.flood_risk = 'High'`
      atRiskParams = []
    }

    const rows = await all(`
      SELECT
        b.id                                            AS barangay_id,
        b.name                                           AS barangay_name,
        b.risk_level                                     AS barangay_risk_level,
        COUNT(DISTINCT h.id)                              AS total_households,
        COUNT(DISTINCT CASE WHEN ${atRiskCondition} THEN h.id END) AS at_risk_households,
        COUNT(DISTINCT r.id)                              AS total_population,
        COUNT(DISTINCT CASE WHEN ${atRiskCondition} THEN r.id END) AS at_risk_population
      FROM barangays b
      LEFT JOIN households h ON h.barangay_id = b.id
      LEFT JOIN puroks p ON h.purok_id = p.id
      LEFT JOIN residents r ON r.household_id = h.id
      GROUP BY b.id, b.name, b.risk_level
      ORDER BY at_risk_households DESC
    `, [...atRiskParams, ...atRiskParams])
    res.json(rows)
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