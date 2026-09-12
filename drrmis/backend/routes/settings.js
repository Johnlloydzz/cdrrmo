const router = require('express').Router()
const { get, run } = require('../db/database')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

// GET /api/settings/flood-level — the current manually-reported flood water
// level (meters). 0 means "no active flood event" — in that state, at-risk
// status falls back to the official static CDRA classification instead.
router.get('/flood-level', async (req, res) => {
  try {
    const row = await get('SELECT value, updated_at FROM system_settings WHERE key = ?', ['current_flood_level_m'])
    res.json({ level_m: row ? parseFloat(row.value) : 0, updated_at: row?.updated_at || null })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/settings/flood-level — CDRRMO Personnel only. They monitor
// PAGASA's flood advisories / local river & rain gauges themselves (no
// public real-time API exists for Gingoog City specifically) and report the
// observed water level here, which immediately drives the Dashboard's
// at-risk household/population figures.
router.put('/flood-level', async (req, res) => {
  try {
    if (req.user.role !== 'CDRRMO Personnel') {
      return res.status(403).json({ error: 'Only CDRRMO Personnel can update the flood water level.' })
    }
    const level = parseFloat(req.body.level_m)
    if (isNaN(level) || level < 0) return res.status(400).json({ error: 'level_m must be a non-negative number' })
    await run(
      `INSERT INTO system_settings (key, value, updated_at) VALUES ('current_flood_level_m', ?, datetime('now', '+8 hours'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [String(level)]
    )
    res.json({ level_m: level })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router