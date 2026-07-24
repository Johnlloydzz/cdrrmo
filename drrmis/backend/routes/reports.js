const router = require('express').Router()
const { all, get } = require('../db/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

router.get('/summary', async (req, res) => {
  try {
    const population   = await get('SELECT SUM(population) as total FROM barangays')
    const households   = await get('SELECT COUNT(*) as total FROM households')
    const barangays    = await get('SELECT COUNT(*) as total FROM barangays')
    const hazards      = await get("SELECT COUNT(*) as total FROM hazards WHERE status = 'Active'")
    const incidents    = await get('SELECT COUNT(*) as total FROM incidents')
    const openInc      = await get("SELECT COUNT(*) as total FROM incidents WHERE status NOT IN ('Resolved','Closed')")
    const resolvedInc  = await get("SELECT COUNT(*) as total FROM incidents WHERE status = 'Resolved'")
    const evacCenters  = await get('SELECT COUNT(*) as total FROM evacuation_centers')
    const evacuated    = await get("SELECT SUM(members) as total FROM evacuation_records WHERE status = 'Ongoing'")
    const distributions = await get('SELECT COUNT(*) as total FROM relief_distributions')
    res.json({
      population:    population.total   || 0,
      households:    households.total   || 0,
      barangays:     barangays.total    || 0,
      activeHazards: hazards.total      || 0,
      totalIncidents: incidents.total   || 0,
      openIncidents: openInc.total      || 0,
      resolvedIncidents: resolvedInc.total || 0,
      evacuationCenters: evacCenters.total || 0,
      familiesEvacuated: evacuated.total || 0,
      reliefDistributed: distributions.total || 0,
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/incidents-by-month', async (req, res) => {
  try {
    const rows = await all(`
      SELECT strftime('%Y-%m', incident_date) as month, COUNT(*) as count
      FROM incidents
      WHERE incident_date IS NOT NULL
      GROUP BY month ORDER BY month DESC LIMIT 12`)
    res.json(rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/hazards-by-barangay', async (req, res) => {
  try {
    const rows = await all(`
      SELECT b.name as barangay, COUNT(h.id) as count
      FROM hazards h LEFT JOIN barangays b ON h.barangay_id = b.id
      GROUP BY h.barangay_id ORDER BY count DESC LIMIT 10`)
    res.json(rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
