const { createClient } = require('@libsql/client')
const bcrypt = require('bcryptjs')

// Hosted on Turso (libSQL) instead of a local file — Render's free tier has
// an ephemeral filesystem, so a local SQLite file gets wiped on every
// redeploy, restart, or 15-minute idle spin-down. Turso's free tier persists
// data permanently, independent of the app's own filesystem.
// Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN as environment variables
// (in Render's dashboard, or a local .env file for development).
let client

function getDb() {
  if (!client) {
    if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
      throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN environment variables are required.')
    }
    client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
  }
  return client
}

async function run(sql, params = []) {
  const result = await getDb().execute({ sql, args: params })
  return { lastID: Number(result.lastInsertRowid ?? 0), changes: result.rowsAffected }
}

async function get(sql, params = []) {
  const result = await getDb().execute({ sql, args: params })
  return result.rows[0]
}

async function all(sql, params = []) {
  const result = await getDb().execute({ sql, args: params })
  return Array.from(result.rows)
}

// Columns added to the schema after some databases were already created.
// CREATE TABLE IF NOT EXISTS does not retrofit columns onto an existing
// table, so this runs on every startup to safely add whatever is missing —
// non-destructive, never touches existing rows. This is what keeps a
// production database (e.g. Render) in sync automatically on each deploy,
// without needing manual shell access to run a one-off migration script.
const EXPECTED_COLUMNS = {
  users: { name: `TEXT`, email: `TEXT`, barangay_id: `INTEGER REFERENCES barangays(id)`, status: `TEXT DEFAULT 'Active'`, last_login: `TEXT`, created_at: `TEXT`, updated_at: `TEXT` },
  barangays: { risk_level: `TEXT DEFAULT 'Low'`, flood_susceptibility: `TEXT DEFAULT 'Low'`, landslide_susceptibility: `TEXT DEFAULT 'Low'`, population: `INTEGER DEFAULT 0`, boundary_geojson: `TEXT`, created_at: `TEXT`, updated_at: `TEXT` },
  puroks: { flood_risk: `TEXT DEFAULT 'Low'`, flood_threshold_m: `REAL DEFAULT 1.0`, landslide_risk: `TEXT DEFAULT 'Low'`, latitude: `REAL`, longitude: `REAL`, created_at: `TEXT` },
  households: { household_id: `TEXT`, purok_id: `INTEGER REFERENCES puroks(id)`, latitude: `REAL`, longitude: `REAL`, contact: `TEXT`, created_at: `TEXT`, updated_at: `TEXT` },
  residents: { resident_id: `TEXT`, age_bracket: `TEXT`, relation_to_head: `TEXT`, created_at: `TEXT` },
}

async function selfHealColumns() {
  for (const [table, columns] of Object.entries(EXPECTED_COLUMNS)) {
    let existing
    try { existing = (await all(`PRAGMA table_info(${table})`)).map(r => r.name) }
    catch { continue }
    for (const [colName, colDef] of Object.entries(columns)) {
      if (existing.includes(colName)) continue
      try {
        await run(`ALTER TABLE ${table} ADD COLUMN ${colName} ${colDef}`)
        console.log(`Self-heal: added missing column ${table}.${colName}`)
      } catch (err) {
        console.log(`Self-heal: could not add ${table}.${colName}: ${err.message}`)
      }
    }
  }
}

// Purok names corrected after cross-checking the source PDF (Gingoog City
// Statistical Yearbook 2022, Table II.36) — a handful were mis-transcribed
// in the initial seed. Renaming (not delete+insert) so any household already
// linked to these puroks keeps its link. Safe to run on every startup: only
// renames a row if it still has the old (wrong) spelling.
const PUROK_NAME_CORRECTIONS = [
  { barangay: 'Bagubad',  wrong: 'Bofal',    correct: 'Batal' },
  { barangay: 'Mimbunga', wrong: 'Elizolde', correct: 'Elizalde' },
  { barangay: 'Odiongan', wrong: 'Tabique',  correct: 'Tabigue' },
  { barangay: 'Libertad', wrong: 'Tigbaw',   correct: 'Tigbao' },
  { barangay: 'Kibuging', wrong: 'Ki-iwang', correct: 'Kiiwang' },
]

async function selfHealPurokNames() {
  for (const c of PUROK_NAME_CORRECTIONS) {
    try {
      const barangay = await get('SELECT id FROM barangays WHERE name = ?', [c.barangay])
      if (!barangay) continue
      const purok = await get('SELECT id FROM puroks WHERE barangay_id = ? AND name = ?', [barangay.id, c.wrong])
      if (!purok) continue
      await run('UPDATE puroks SET name = ? WHERE id = ?', [c.correct, purok.id])
      console.log(`Self-heal: renamed purok "${c.wrong}" -> "${c.correct}" (${c.barangay})`)
    } catch (err) {
      console.log(`Self-heal: could not rename purok for ${c.barangay}: ${err.message}`)
    }
  }
}

async function initDb() {
  const schema = require('./schema')
  for (const stmt of schema) {
    await run(stmt)
  }
  await selfHealColumns()
  await seedBarangays()
  await seedDefaultAdmin()
  await seedBoundaries()
  await selfHealPurokNames()
  console.log('Database initialized.')
}

// ── Demo accounts — 2 roles only: CDRRMO Personnel, Barangay Official ────────
async function seedDefaultAdmin() {
  const brgy = await get('SELECT id FROM barangays WHERE name = ?', ['San Juan'])

  const demoUsers = [
    {
      name: 'Carlos Mendoza',
      username: 'cdrrmo01',
      email: 'carlos@cdrrmo.gov.ph',
      password: 'Cdrrmo@1234',
      role: 'CDRRMO Personnel',
      barangay_id: null,
    },
    {
      name: 'Ana Villanueva',
      username: 'brgy.sanjuan',
      email: 'ana@sanjuan.gov.ph',
      password: 'Brgy@1234',
      role: 'Barangay Official',
      barangay_id: brgy ? brgy.id : null,
    },
  ]

  for (const user of demoUsers) {
    const existing = await get('SELECT id FROM users WHERE username = ?', [user.username])
    if (!existing) {
      const hash = await bcrypt.hash(user.password, 12)
      await run(
        `INSERT INTO users (name, username, email, password_hash, role, barangay_id, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [user.name, user.username, user.email, hash, user.role, user.barangay_id, 'Active']
      )
      console.log(`Demo user created: ${user.username} / ${user.password}`)
    }
  }
}

// ── Seed all 79 barangays of Gingoog City ────────────────────────────────────
// Flood/landslide susceptibility read carefully, barangay-by-barangay, from the
// City of Gingoog CLUP Landslide and Flood Susceptibility Map (CY 2020-2029)
// and the CDRA Population Flooding Exposure Map for urban (Poblacion) barangays.
// This is a manual visual read of the official map — CDRRMO should verify each
// entry against the source GIS data before relying on it operationally.
const CDRA_SAMPLE = {
  // ── Rural barangays ──────────────────────────────────────────────────────
  'Agay-Ayan':    { flood: 'High', landslide: 'High' },
  'Alagatan':     { flood: 'Low',  landslide: 'Low' },
  'Anakan':       { flood: 'High', landslide: 'Moderate' },
  'Bagubad':      { flood: 'Low',  landslide: 'High' },
  'Bakidbakid':   { flood: 'Low',  landslide: 'Moderate' },
  'Bal-Ason':     { flood: 'Low',  landslide: 'High' },
  'Bantaawan':    { flood: 'Low',  landslide: 'High' },
  'Binakalan':    { flood: 'Low',  landslide: 'Moderate' },
  'Dinawehan':    { flood: 'Low',  landslide: 'High' },
  'Eureka':       { flood: 'Low',  landslide: 'Low' },
  'Hindangon':    { flood: 'Low',  landslide: 'High' },
  'Kalagonoy':    { flood: 'Low',  landslide: 'Moderate' },
  'Kalipay':      { flood: 'Low',  landslide: 'Moderate' },
  'Kamanikan':    { flood: 'Low',  landslide: 'Moderate' },
  'Kianlagan':    { flood: 'Low',  landslide: 'High' },
  'Kibuging':     { flood: 'High', landslide: 'High' },
  'Kipuntos':     { flood: 'Low',  landslide: 'Moderate' },
  'Lawaan':       { flood: 'Low',  landslide: 'High' },
  'Lawit':        { flood: 'Low',  landslide: 'Low' },
  'Libertad':     { flood: 'Low',  landslide: 'High' },
  'Libon':        { flood: 'Low',  landslide: 'Moderate' },
  'Lunao':        { flood: 'High', landslide: 'High' },
  'Lunotan':      { flood: 'Low',  landslide: 'High' },
  'Malibud':      { flood: 'Low',  landslide: 'Low' },
  'Malinao':      { flood: 'Low',  landslide: 'Moderate' },
  'Maribucao':    { flood: 'Low',  landslide: 'Moderate' },
  'Mimbalagon':   { flood: 'Low',  landslide: 'Moderate' },
  'Mimbunga':     { flood: 'Low',  landslide: 'Moderate' },
  'Mimbuntong':   { flood: 'Low',  landslide: 'High' },
  'Minsapinit':   { flood: 'Low',  landslide: 'Low' },
  'Murallon':     { flood: 'Low',  landslide: 'Moderate' },
  'Odiongan':     { flood: 'High', landslide: 'High' },
  'Pangasihan':   { flood: 'High', landslide: 'High' },
  'Pigsaluhan':   { flood: 'Low',  landslide: 'High' },
  'Punong':       { flood: 'Low',  landslide: 'Moderate' },
  'Ricoro':       { flood: 'Low',  landslide: 'Moderate' },
  'Samay':        { flood: 'Low',  landslide: 'Low' },
  'San Jose':     { flood: 'Low',  landslide: 'Moderate' },
  'San Juan':     { flood: 'High', landslide: 'Moderate' },
  'San Luis':     { flood: 'Low',  landslide: 'Low' },
  'San Miguel':   { flood: 'Low',  landslide: 'Moderate' },
  'Sangalan':     { flood: 'Low',  landslide: 'High' },
  'Santiago':     { flood: 'High', landslide: 'Moderate' },
  'Tagpako':      { flood: 'Low',  landslide: 'Moderate' },
  'Talisay':      { flood: 'Low',  landslide: 'High' },
  'Talon':        { flood: 'Low',  landslide: 'Moderate' },
  'Tinabalan':    { flood: 'Low',  landslide: 'High' },
  'Tinulongan':   { flood: 'Low',  landslide: 'Moderate' },
  // ── Poblacion (urban) barangays — per the CDRA Population Flooding
  // Exposure Map, this whole cluster sits mostly within the High-flood
  // (purple) zone with pockets of Low (tan); landslide risk is low since
  // it's flat urban/coastal terrain. Precise per-block classification from
  // the map's inset numbering was not legible enough to assign individually
  // — CDRRMO should confirm/refine per Poblacion barangay.
}

const POBLACION_DEFAULT = { flood: 'High', landslide: 'Low' }

async function seedBarangays() {
  const poblacionBarangays = [
    '1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17',
    '18','18-A','19','20','21','22','22-A','23','24','24-A','25','26'
  ].map(n => `Barangay ${n} (Pob.)`)

  const ruralBarangays = [
    'Agay-Ayan','Alagatan','Anakan','Bagubad','Bakidbakid','Bal-Ason','Bantaawan',
    'Binakalan','Capitulangan','Daan-Lungsod','Dinawehan','Eureka','Hindangon',
    'Kalagonoy','Kalipay','Kamanikan','Kianlagan','Kibuging','Kipuntos','Lawaan',
    'Lawit','Libertad','Libon','Lunao','Lunotan','Malibud','Malinao','Maribucao',
    'Mimbalagon','Mimbunga','Mimbuntong','Minsapinit','Murallon','Odiongan',
    'Pangasihan','Pigsaluhan','Punong','Ricoro','Samay','San Jose','San Juan',
    'San Luis','San Miguel','Sangalan','Santiago','Tagpako','Talisay','Talon',
    'Tinabalan','Tinulongan'
  ]

  const allBarangays = [...poblacionBarangays, ...ruralBarangays]

  for (const name of allBarangays) {
    const existing = await get('SELECT id FROM barangays WHERE name = ?', [name])
    if (!existing) {
      const isPoblacion = name.includes('(Pob.)')
      const sample = CDRA_SAMPLE[name] || (isPoblacion ? POBLACION_DEFAULT : null)
      await run(
        `INSERT INTO barangays (name, population, risk_level, flood_susceptibility, landslide_susceptibility) VALUES (?, ?, ?, ?, ?)`,
        [name, 0, 'Low', sample?.flood || 'Low', sample?.landslide || 'Low']
      )
    }
  }
  console.log(`Seeded ${allBarangays.length} barangays for Gingoog City`)
}

// Auto-restores official PSA/PSGC boundary polygons for any barangay that doesn't
// have one yet. Runs on every server startup — this is what keeps the boundary data
// alive even if the SQLite file gets reset (e.g. free-tier Render redeploys wipe
// ephemeral disk). Source data is bundled in the repo, not the database, so it
// always survives a redeploy.
async function seedBoundaries() {
  let boundaries
  try {
    boundaries = require('./gingoog-barangay-boundaries.json')
  } catch {
    console.log('No bundled boundary data file found — skipping boundary auto-seed.')
    return
  }

  const barangays = await all('SELECT id, name, boundary_geojson FROM barangays')
  let restored = 0

  for (const b of barangays) {
    if (b.boundary_geojson) continue // already has one, leave it alone
    const geometry = boundaries[b.name]
    if (!geometry) continue
    await run('UPDATE barangays SET boundary_geojson = ? WHERE id = ?', [JSON.stringify(geometry), b.id])
    restored++
  }

  if (restored > 0) {
    console.log(`Boundary auto-seed: restored boundary_geojson for ${restored} barangay(s).`)
  }
}

module.exports = { getDb, run, get, all, initDb }