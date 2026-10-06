// Keeps flood data "real-time" by clearing values that are too old to still
// reflect what's actually happening.
//
// 1. Manually-reported flood level (typed in on Flood Simulation Control):
//    KEPT until CDRRMO changes it or presses "Reset to Normal" — it never
//    disappears on its own. (An optional auto-reset can be switched on by
//    setting FLOOD_LEVEL_EXPIRY_HOURS on the server, e.g. 12; it's off by
//    default.)
//
// 2. Auto-detected flooded barangays (set by the scheduled server-side
//    check every ~10 min): if that list hasn't been refreshed in
//    AUTO_FLOOD_EXPIRY_MINUTES (default 30 min) — e.g. the free-tier server
//    was asleep — it's treated as stale and cleared, rather than trusted.
//
// Called at the start of every route that reads flood data, so all pages
// (Dashboard, GIS Map, Flood Simulation Control) always agree.

const { get, run } = require('./database')

async function expireStaleFloodData() {
  // Off unless FLOOD_LEVEL_EXPIRY_HOURS is set to a positive number.
  const levelHours = parseFloat(process.env.FLOOD_LEVEL_EXPIRY_HOURS) || 0
  const autoMinutes = parseFloat(process.env.AUTO_FLOOD_EXPIRY_MINUTES) || 30

  const level = await get(
    `SELECT value, (julianday(datetime('now', '+8 hours')) - julianday(updated_at)) * 24 AS age_hours
     FROM system_settings WHERE key = 'current_flood_level_m'`
  )
  if (levelHours > 0 && level && parseFloat(level.value) > 0 && level.age_hours != null && level.age_hours >= levelHours) {
    await run(`UPDATE system_settings SET value = '0', updated_at = datetime('now', '+8 hours') WHERE key = 'current_flood_level_m'`)
  }

  const auto = await get(
    `SELECT value, (julianday(datetime('now', '+8 hours')) - julianday(updated_at)) * 24 * 60 AS age_minutes
     FROM system_settings WHERE key = 'auto_flooded_barangay_ids'`
  )
  if (auto && auto.value && auto.value !== '[]' && auto.age_minutes != null && auto.age_minutes >= autoMinutes) {
    await run(`UPDATE system_settings SET value = '[]', updated_at = datetime('now', '+8 hours') WHERE key = 'auto_flooded_barangay_ids'`)
  }
}

module.exports = { expireStaleFloodData }