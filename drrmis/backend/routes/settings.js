const router = require('express').Router()
const { get, run } = require('../db/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

// GET /api/settings/flood-level — the current flood water level (meters).
// 0 means "no active flood event" — falls back to the official static CDRA
// classification. `source` says who set the active level: 'manual' (CDRRMO
// typed it in) or 'auto' (the system's conservative auto-detect — sustained
// heavy rainfall AND river discharge well above its recent normal — set it).
// Auto-detect only ever raises a level from 0, and only ever lowers a level
// it set itself; a manually-set level is never touched by auto-detect.
router.get('/flood-level', async (req, res) => {
  try {
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
    if (isNaN(level) || level < 0) return res.status(400).json({ error: 'level_m must be a non-negative number' })
    const source = req.body.source === 'auto' ? 'auto' : 'manual'
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
    res.json({ level_m: level, source })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/settings/auto-flood-barangays — the set of barangays the
// per-barangay auto-detect currently considers flooded (each barangay's own
// local rainfall crossed PAGASA Red AND the city's river discharge is well
// above normal at the same time). Barangays NOT in this list fall back to
// their static CDRA classification — auto-detect only marks the specific
// area actually experiencing heavy rain, not the whole city at once.
router.get('/auto-flood-barangays', async (req, res) => {
  try {
    const row = await get('SELECT value FROM system_settings WHERE key = ?', ['auto_flooded_barangay_ids'])
    let barangay_ids = []
    try { barangay_ids = row ? JSON.parse(row.value) : [] } catch { barangay_ids = [] }
    res.json({ barangay_ids })
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
    await run(
      `INSERT INTO system_settings (key, value, updated_at) VALUES ('auto_flooded_barangay_ids', ?, datetime('now', '+8 hours'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [JSON.stringify(ids)]
    )
    res.json({ barangay_ids: ids })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router