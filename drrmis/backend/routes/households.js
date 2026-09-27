const router = require('express').Router()
const { expireStaleFloodData } = require('../db/floodLevel')
const { all, get, run } = require('../db/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

// GET /api/households — includes geofencing flag (in_flood_risk_zone)
router.get('/', async (req, res) => {
  try {
    const { purok_id, search, at_risk } = req.query
    // Barangay Officials only ever see their own barangay's households —
    // enforced server-side, not just hidden in the UI.
    const barangay_id = req.user.role === 'Barangay Official' ? req.user.barangay_id : req.query.barangay_id
    let sql = `SELECT h.*, b.name as barangay_name, b.flood_susceptibility as barangay_flood_susceptibility, p.name as purok_name, p.flood_risk as purok_flood_risk, p.flood_threshold_m, p.landslide_risk as purok_landslide_risk
               FROM households h
               LEFT JOIN barangays b ON h.barangay_id = b.id
               LEFT JOIN puroks p ON h.purok_id = p.id
               WHERE 1=1`
    const params = []
    if (barangay_id) { sql += ' AND h.barangay_id = ?'; params.push(barangay_id) }
    if (purok_id)    { sql += ' AND h.purok_id = ?'; params.push(purok_id) }
    if (search)      { sql += ' AND (h.head_family LIKE ? OR h.household_id LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }
    if (at_risk === '1') { sql += " AND p.flood_risk = 'High'" }
    const rows = await all(sql, params)

    // Real-time at-risk status, in priority order:
    //  1. A manually-reported citywide flood level (CDRRMO typed a number) —
    //     applies everywhere, compared against each purok's own threshold.
    //  2. Auto-detect's per-barangay list — only barangays where local rain
    //     actually crossed PAGASA Red AND river discharge is elevated get
    //     treated as a 1m flood event; every other barangay is unaffected by
    //     auto-detect even while it's active elsewhere in the city.
    //  3. Otherwise, fall back to the static CDRA susceptibility classification.
    await expireStaleFloodData()
    const [levelRow, sourceRow, autoRow] = await Promise.all([
      get('SELECT value FROM system_settings WHERE key = ?', ['current_flood_level_m']),
      get('SELECT value FROM system_settings WHERE key = ?', ['current_flood_level_source']),
      get('SELECT value FROM system_settings WHERE key = ?', ['auto_flooded_barangay_ids']),
    ])
    const floodLevel = levelRow ? parseFloat(levelRow.value) : 0
    // A flood level reported by CDRRMO on Flood Simulation Control is REAL,
    // not a drill — the system is used 24/7, so a reported level applies to
    // every page (Dashboard, GIS Map, Flood Control) right away. Priority:
    //  1. CDRRMO-reported level (> 0 m) — citywide, vs. each purok's threshold
    //  2. Live auto-detect (real rain + river discharge) — flagged barangays
    //  3. Otherwise the official CDRA classification.
    const manualActive = (sourceRow?.value || 'manual') === 'manual' && floodLevel > 0
    let autoBarangayIds = []
    try { autoBarangayIds = autoRow ? JSON.parse(autoRow.value) : [] } catch { autoBarangayIds = [] }

    // A barangay CDRRMO classified as LOW flood susceptibility (Barangays
    // page) is never high flood risk — whether or not a flood level is
    // reported — so its household pins follow what the map shows (tan, not
    // violet). Otherwise the purok-level rules below decide.
    const withRisk = rows.map(h => ({
      ...h,
      in_flood_risk_zone: (h.barangay_flood_susceptibility || 'Low') !== 'Low' && (manualActive
        ? floodLevel >= h.flood_threshold_m
        : autoBarangayIds.includes(h.barangay_id)
          ? 1 >= h.flood_threshold_m
          : h.purok_flood_risk === 'High'),
      // Landslide has no continuous measured value like flood depth — it
      // always uses the static official CDRA classification.
      in_landslide_risk_zone: h.purok_landslide_risk === 'High',
    }))
    res.json(withRisk)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// The Head of Family must be an already-registered resident of the same
// barangay, with relation "Head", who isn't in another household yet (or is
// already in THIS household, when editing). Returns the resident or an error.
async function validateHead(head_resident_id, barangay_id, householdId = null) {
  const r = await get(
    `SELECT r.id, r.name, r.relation_to_head, r.household_id, COALESCE(r.barangay_id, h.barangay_id) AS barangay_id
     FROM residents r LEFT JOIN households h ON r.household_id = h.id WHERE r.id = ?`,
    [head_resident_id]
  )
  if (!r) return { error: 'The selected Head of Family was not found. Register them in Residents first.' }
  if (Number(r.barangay_id) !== Number(barangay_id)) return { error: 'The Head of Family must be a resident of this barangay.' }
  if (r.relation_to_head !== 'Head') return { error: 'The selected resident is not registered as "Head" (Relation to Head).' }
  if (r.household_id && Number(r.household_id) !== Number(householdId)) return { error: 'The selected resident is already assigned to another household.' }
  return { resident: r }
}

// POST /api/households
router.post('/', async (req, res) => {
  try {
    const { purok_id, head_resident_id, latitude, longitude } = req.body
    // Barangay Officials can only register households under their own barangay,
    // regardless of what barangay_id is sent in the request body.
    const barangay_id = req.user.role === 'Barangay Official' ? req.user.barangay_id : req.body.barangay_id
    if (!barangay_id || !purok_id || !head_resident_id) {
      return res.status(400).json({ error: 'Barangay, purok, and Head of Family are required.' })
    }
    // Residents are registered first; the Head is picked from them.
    const { resident: head, error } = await validateHead(head_resident_id, barangay_id)
    if (error) return res.status(400).json({ error })
    const head_family = head.name
    const count = await get('SELECT COUNT(*) as c FROM households')
    const household_id = `HH-${String((count?.c || 0) + 1).padStart(5, '0')}`
    const result = await run(
      `INSERT INTO households (household_id, barangay_id, purok_id, head_family, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)`,
      [household_id, barangay_id, purok_id, head_family, latitude || null, longitude || null]
    )
    // Link the Head to their new household.
    await run('UPDATE residents SET household_id = ?, barangay_id = ? WHERE id = ?', [result.lastID, barangay_id, head.id])
    const newRow = await get('SELECT * FROM households WHERE id = ?', [result.lastID])
    res.status(201).json(newRow)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/households/:id
router.put('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'Barangay Official') {
      return res.status(403).json({ error: 'CDRRMO Personnel have view-only access to household records.' })
    }
    const existing = await get('SELECT barangay_id FROM households WHERE id = ?', [req.params.id])
    if (!existing || existing.barangay_id !== req.user.barangay_id) {
      return res.status(403).json({ error: 'You can only edit households in your own barangay.' })
    }
    const { latitude, longitude, purok_id, head_resident_id } = req.body
    // Changing the Head: must be a registered "Head" resident, unassigned or
    // already in this household. The new Head is linked to this household.
    let head_family = (await get('SELECT head_family FROM households WHERE id = ?', [req.params.id]))?.head_family
    if (head_resident_id) {
      const { resident: head, error } = await validateHead(head_resident_id, existing.barangay_id, req.params.id)
      if (error) return res.status(400).json({ error })
      head_family = head.name
      await run('UPDATE residents SET household_id = ?, barangay_id = ? WHERE id = ?', [req.params.id, existing.barangay_id, head.id])
    }
    await run(
      `UPDATE households SET head_family=?, latitude=?, longitude=?, purok_id=?, updated_at=datetime('now', '+8 hours') WHERE id=?`,
      [head_family, latitude, longitude, purok_id, req.params.id]
    )
    const updated = await get('SELECT * FROM households WHERE id = ?', [req.params.id])
    res.json(updated)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /api/households/:id
router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'Barangay Official') {
      return res.status(403).json({ error: 'CDRRMO Personnel have view-only access to household records.' })
    }
    const existing = await get('SELECT barangay_id FROM households WHERE id = ?', [req.params.id])
    if (!existing || existing.barangay_id !== req.user.barangay_id) {
      return res.status(403).json({ error: 'You can only delete households in your own barangay.' })
    }
    // Residents are people, not part of the household record: deleting a
    // household un-assigns its members (they stay registered and can be
    // assigned to another household) instead of deleting them.
    await run('UPDATE residents SET household_id = NULL, barangay_id = COALESCE(barangay_id, ?) WHERE household_id = ?', [existing.barangay_id, req.params.id])
    const result = await run('DELETE FROM households WHERE id = ?', [req.params.id])
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' })
    res.json({ message: 'Deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router