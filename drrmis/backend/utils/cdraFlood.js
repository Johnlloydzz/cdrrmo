// CDRA "Urban Barangays — Population Flooding Exposure Map" (City Government
// of Gingoog, CPDO/CDRRMO), traced into each barangay's Flood area (violet =
// High Susceptibility of Flooding) and Residential Area (yellow). The rest of
// each barangay shows as Low Susceptibility of Flooding (beige).
// Covers the 29 urban (Poblacion) barangays plus the parts of San Juan,
// Murallon, Santiago and Daan-Lungsod that the CDRA map colors.
// Traced from a photo of the printed map, one shape per barangay — CDRRMO
// can still fine-tune every shape in Barangays → Edit.
const { all, get, getDb } = require('../db/database')

const BACKUP_KEY = 'cdra_flood_backup'

async function applyCdraUrbanFlood() {
  let data
  try { data = require('../db/cdra-urban-flood.json') } catch { return { ok: false, error: 'CDRA data file missing.' } }
  const names = Object.keys(data)
  const rows = await all(`SELECT id, name, flood_susceptibility, flood_area_geojson, residential_area_geojson FROM barangays WHERE name IN (${names.map(() => '?').join(',')})`, names)
  const stmts = []
  // Keep the previous values only the first time, so Undo always returns
  // to what CDRRMO had before the CDRA map was applied.
  const hasBackup = await get('SELECT 1 FROM system_settings WHERE key = ?', [BACKUP_KEY])
  if (!hasBackup) {
    const backup = rows.map(r => ({ id: r.id, flood_susceptibility: r.flood_susceptibility, flood_area_geojson: r.flood_area_geojson, residential_area_geojson: r.residential_area_geojson }))
    stmts.push({ sql: `INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, datetime('now', '+8 hours'))`, args: [BACKUP_KEY, JSON.stringify(backup)] })
  }
  for (const r of rows) {
    const d = data[r.name]
    stmts.push({
      sql: "UPDATE barangays SET flood_susceptibility = ?, flood_area_geojson = ?, residential_area_geojson = ?, updated_at = datetime('now', '+8 hours') WHERE id = ?",
      args: [d.flood ? 'High' : 'Low', d.flood ? JSON.stringify(d.flood) : null, d.residential ? JSON.stringify(d.residential) : null, r.id],
    })
  }
  stmts.push({ sql: `INSERT INTO system_settings (key, value, updated_at) VALUES ('cdra_urban_applied', '1', datetime('now', '+8 hours'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`, args: [] })
  await getDb().batch(stmts, 'write')
  return { ok: true, updated: rows.length, high: rows.filter(r => data[r.name].flood).length }
}

async function undoCdraUrbanFlood() {
  const row = await get('SELECT value FROM system_settings WHERE key = ?', [BACKUP_KEY])
  if (!row) return { ok: false, error: 'Nothing to undo.' }
  const backup = JSON.parse(row.value)
  const stmts = backup.map(b => ({
    sql: "UPDATE barangays SET flood_susceptibility = ?, flood_area_geojson = ?, residential_area_geojson = ?, updated_at = datetime('now', '+8 hours') WHERE id = ?",
    args: [b.flood_susceptibility || 'Low', b.flood_area_geojson || null, b.residential_area_geojson || null, b.id],
  }))
  stmts.push({ sql: 'DELETE FROM system_settings WHERE key = ?', args: [BACKUP_KEY] })
  await getDb().batch(stmts, 'write')
  return { ok: true, restored: backup.length }
}

// Runs once on server start: applies the CDRA map the first time this
// version starts (never again after that, so CDRRMO's later edits stay).
async function seedCdraUrbanFlood() {
  const done = await get("SELECT value FROM system_settings WHERE key = 'cdra_urban_applied'")
  if (done) return
  const r = await applyCdraUrbanFlood()
  if (r.ok) console.log(`CDRA urban flood map applied to ${r.updated} barangays (${r.high} with High flood areas).`)
}

module.exports = { applyCdraUrbanFlood, undoCdraUrbanFlood, seedCdraUrbanFlood, BACKUP_KEY }