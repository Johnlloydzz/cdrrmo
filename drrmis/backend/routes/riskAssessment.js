const router = require('express').Router()
const { all } = require('../db/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

// Per-barangay summary: total households/population vs. those inside
// high flood-risk puroks (geofencing result), for the Risk Assessment Dashboard.
router.get('/summary', async (req, res) => {
  try {
    const rows = await all(`
      SELECT
        b.id                                            AS barangay_id,
        b.name                                           AS barangay_name,
        b.risk_level                                     AS barangay_risk_level,
        COUNT(DISTINCT h.id)                              AS total_households,
        COUNT(DISTINCT CASE WHEN p.flood_risk = 'High' THEN h.id END) AS at_risk_households,
        COUNT(DISTINCT r.id)                              AS total_population,
        COUNT(DISTINCT CASE WHEN p.flood_risk = 'High' THEN r.id END) AS at_risk_population
      FROM barangays b
      LEFT JOIN households h ON h.barangay_id = b.id
      LEFT JOIN puroks p ON h.purok_id = p.id
      LEFT JOIN residents r ON r.household_id = h.id
      GROUP BY b.id, b.name, b.risk_level
      ORDER BY at_risk_households DESC
    `)
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