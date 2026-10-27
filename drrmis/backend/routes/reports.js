const router = require('express').Router()
const { all, get } = require('../db/database')
const { authenticate } = require('../middleware/auth')
const { loadRiskContext, purokRiskRows } = require('../utils/householdRisk')

router.use(authenticate)

// Age in whole years from the resident's birthdate (Philippine time) — the
// same formula the Residents page uses for its age-group cards.
const AGE_SQL = `(CAST(strftime('%Y', 'now', '+8 hours') AS INTEGER) - CAST(substr(r.birthdate, 1, 4) AS INTEGER)
  - (strftime('%m-%d', 'now', '+8 hours') < substr(r.birthdate, 6, 5)))`

const chunk = (arr, n) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out }
const marks = (a) => a.map(() => '?').join(',')
const naturalCompare = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })

// GET /api/reports/households-at-risk
//   ?hazard=flood|landslide        (default flood)
//   &basis=planning|live           (flood only; default planning)
//   &barangay_id=&purok_id=        (a Barangay Official is always limited to their own barangay)
//
// Pre-disaster report: which barangays, puroks, households and residents are
// inside a hazard area, so CDRRMO can plan evacuation and relief BEFORE the
// event. It reuses the exact geofencing of the Dashboard and the Hazard Map
// (utils/householdRisk.js), so every screen gives the same answer.
//
//  basis=planning  → every purok inside the drawn CDRA flood area of a barangay
//                    that is not Low susceptibility, as if heavy rain hit now.
//                    This is the planning view and does not depend on the weather.
//  basis=live      → only barangays with heavy rain detected right now (or a
//                    drill running), the same "red" as the map.
//  hazard=landslide→ the static CDRA classification (there is no live value).
router.get('/households-at-risk', async (req, res) => {
  try {
    const isOfficial = req.user.role === 'Barangay Official'
    const barangayId = isOfficial ? req.user.barangay_id : (req.query.barangay_id || null)
    const purokId = req.query.purok_id || null
    const hazard = req.query.hazard === 'landslide' ? 'landslide' : 'flood'
    const basis = hazard === 'flood' && req.query.basis === 'live' ? 'live' : 'planning'
    const key = hazard === 'landslide' ? 'in_landslide_risk_zone' : 'in_flood_risk_zone'

    const live = await loadRiskContext()
    let ctx = live
    if (hazard === 'flood' && basis === 'planning') {
      const allIds = (await all('SELECT id FROM barangays')).map(b => Number(b.id))
      ctx = { floodLevel: 1, manualActive: false, simulateRain: true, autoBarangayIds: allIds }
    }

    let puroks = await purokRiskRows(ctx, { barangayId })
    if (purokId) puroks = puroks.filter(p => String(p.purok_id) === String(purokId))
    const atRisk = puroks.filter(p => p[key])
    const atRiskIds = atRisk.map(p => p.purok_id)

    const hhNo = isOfficial
      ? `, CASE WHEN h.household_id GLOB 'HH-[0-9]*' THEN (SELECT COUNT(*) FROM households hx
            WHERE hx.barangay_id = h.barangay_id AND hx.household_id GLOB 'HH-[0-9]*' AND hx.id <= h.id) END AS hh_no`
      : ''
    const households = []
    const demo = { total: 0, child: 0, teen: 0, adult: 0, senior: 0, unknown_age: 0, male: 0, female: 0 }
    for (const ids of chunk(atRiskIds, 300)) {
      const rows = await all(`
        SELECT h.id, h.household_id AS hh_code, h.head_family, h.contact, b.name AS barangay_name, p.name AS purok_name,
               (SELECT COUNT(*) FROM residents r WHERE r.household_id = h.id) AS members${hhNo}
        FROM households h
        JOIN barangays b ON b.id = h.barangay_id
        JOIN puroks p ON p.id = h.purok_id
        WHERE h.purok_id IN (${marks(ids)})`, ids)
      for (const r of rows) {
        households.push({
          hh_label: isOfficial && r.hh_no ? `HH-${String(r.hh_no).padStart(5, '0')}` : r.hh_code,
          barangay_name: r.barangay_name, purok_name: r.purok_name,
          head_family: r.head_family, members: Number(r.members || 0), contact: r.contact || '',
        })
      }
      const d = await get(`
        SELECT COUNT(*) AS total,
          SUM(CASE WHEN r.birthdate IS NOT NULL AND ${AGE_SQL} <= 12 THEN 1 ELSE 0 END) AS child,
          SUM(CASE WHEN r.birthdate IS NOT NULL AND ${AGE_SQL} BETWEEN 13 AND 17 THEN 1 ELSE 0 END) AS teen,
          SUM(CASE WHEN r.birthdate IS NOT NULL AND ${AGE_SQL} BETWEEN 18 AND 59 THEN 1 ELSE 0 END) AS adult,
          SUM(CASE WHEN r.birthdate IS NOT NULL AND ${AGE_SQL} >= 60 THEN 1 ELSE 0 END) AS senior,
          SUM(CASE WHEN r.birthdate IS NULL THEN 1 ELSE 0 END) AS unknown_age,
          SUM(CASE WHEN r.sex = 'Male' THEN 1 ELSE 0 END) AS male,
          SUM(CASE WHEN r.sex = 'Female' THEN 1 ELSE 0 END) AS female
        FROM residents r JOIN households h ON h.id = r.household_id
        WHERE h.purok_id IN (${marks(ids)})`, ids)
      for (const k of Object.keys(demo)) demo[k] += Number(d?.[k] || 0)
    }
    households.sort((a, b) => naturalCompare(a.barangay_name, b.barangay_name)
      || naturalCompare(a.purok_name, b.purok_name) || naturalCompare(a.hh_label, b.hh_label))

    const byPurok = puroks.map(p => ({
      barangay_name: p.barangay_name, purok_name: p.purok_name,
      households: Number(p.households || 0), residents: Number(p.members || 0), at_risk: !!p[key],
    })).sort((a, b) => (b.at_risk - a.at_risk) || naturalCompare(a.barangay_name, b.barangay_name) || naturalCompare(a.purok_name, b.purok_name))

    const sum = (arr, f) => arr.reduce((t, x) => t + Number(f(x) || 0), 0)
    const barangaysInScope = barangayId ? 1 : Number((await get('SELECT COUNT(*) AS n FROM barangays'))?.n || 0)
    const barangayName = barangayId ? (await get('SELECT name FROM barangays WHERE id = ?', [barangayId]))?.name || null : null
    const purokName = purokId ? (puroks.find(p => String(p.purok_id) === String(purokId))?.purok_name
      || (await get('SELECT name FROM puroks WHERE id = ?', [purokId]))?.name || null) : null

    res.json({
      generated_at: new Date().toISOString(),
      generated_by: req.user.name || req.user.username || '',
      role: req.user.role,
      filters: { hazard, basis, barangay_id: barangayId, barangay_name: barangayName, purok_id: purokId, purok_name: purokName },
      situation: {
        simulate_rain: !!live.simulateRain,
        manual_level_m: live.manualActive ? live.floodLevel : null,
        flagged_barangays: live.simulateRain ? null : (live.autoBarangayIds || []).length,
      },
      summary: {
        barangays_in_scope: barangaysInScope,
        barangays_at_risk: new Set(atRisk.map(p => p.barangay_id)).size,
        puroks_total: puroks.length,
        puroks_at_risk: atRisk.length,
        households_total: sum(puroks, p => p.households),
        households_at_risk: sum(atRisk, p => p.households),
        residents_total: sum(puroks, p => p.members),
        residents_at_risk: sum(atRisk, p => p.members),
        demographics: demo,
      },
      by_purok: byPurok,
      households,
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router