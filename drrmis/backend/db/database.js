const sqlite3 = require('sqlite3').verbose()
const path = require('path')
const bcrypt = require('bcryptjs')

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'drrmis.db')

let db

function getDb() {
  if (!db) {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) console.error('DB connection error:', err)
    })
    db.run('PRAGMA foreign_keys = ON')
    db.run('PRAGMA journal_mode = WAL')
  }
  return db
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function (err) {
      if (err) reject(err)
      else resolve({ lastID: this.lastID, changes: this.changes })
    })
  })
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, row) => {
      if (err) reject(err)
      else resolve(row)
    })
  })
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => {
      if (err) reject(err)
      else resolve(rows)
    })
  })
}

async function initDb() {
  const schema = require('./schema')
  for (const stmt of schema) {
    await run(stmt)
  }
  await runMigrations()
  await seedDefaultAdmin()
  await seedBarangays()
  await seedBoundaries()
  console.log('Database initialized.')
}

async function runMigrations() {
  const barangayColumns = await all('PRAGMA table_info(barangays)')
  const barangayColumnNames = barangayColumns.map(c => c.name)

  if (!barangayColumnNames.includes('is_archived')) {
    await run('ALTER TABLE barangays ADD COLUMN is_archived INTEGER DEFAULT 0')
    console.log('Migration: added is_archived to barangays')
  }

  if (!barangayColumnNames.includes('archived_at')) {
    await run('ALTER TABLE barangays ADD COLUMN archived_at TEXT')
    console.log('Migration: added archived_at to barangays')
  }

  if (!barangayColumnNames.includes('boundary_geojson')) {
    await run('ALTER TABLE barangays ADD COLUMN boundary_geojson TEXT')
    console.log('Migration: added boundary_geojson to barangays')
  }

  if (!barangayColumnNames.includes('image_url')) {
    await run('ALTER TABLE barangays ADD COLUMN image_url TEXT')
    console.log('Migration: added image_url to barangays')
  }

  const reliefColumns = await all('PRAGMA table_info(relief_distributions)')
  const reliefColumnNames = reliefColumns.map(c => c.name)

  if (!reliefColumnNames.includes('distributed_by')) {
    await run('ALTER TABLE relief_distributions ADD COLUMN distributed_by INTEGER REFERENCES users(id)')
    console.log('Migration: added distributed_by to relief_distributions')
  }

  const personnelColumns = await all('PRAGMA table_info(personnel)')
  const personnelColumnNames = personnelColumns.map(c => c.name)

  if (!personnelColumnNames.includes('barangay_id')) {
    await run('ALTER TABLE personnel ADD COLUMN barangay_id INTEGER REFERENCES barangays(id)')
    console.log('Migration: added barangay_id to personnel')
  }

  const resourceColumns = await all('PRAGMA table_info(resources)')
  const resourceColumnNames = resourceColumns.map(c => c.name)

  if (!resourceColumnNames.includes('barangay_id')) {
    await run('ALTER TABLE resources ADD COLUMN barangay_id INTEGER REFERENCES barangays(id)')
    console.log('Migration: added barangay_id to resources')
  }

  const alertColumns = await all('PRAGMA table_info(alerts)')
  const alertColumnNames = alertColumns.map(c => c.name)

  if (!alertColumnNames.includes('sent_by_user_id')) {
    await run('ALTER TABLE alerts ADD COLUMN sent_by_user_id INTEGER REFERENCES users(id)')
    console.log('Migration: added sent_by_user_id to alerts')
  }

  const reliefInvColumns = await all('PRAGMA table_info(relief_inventory)')
  const reliefInvColumnNames = reliefInvColumns.map(c => c.name)

  if (!reliefInvColumnNames.includes('barangay_id')) {
    await run('ALTER TABLE relief_inventory ADD COLUMN barangay_id INTEGER REFERENCES barangays(id)')
    console.log('Migration: added barangay_id to relief_inventory')
  }

  const weatherColumns = await all('PRAGMA table_info(weather_logs)')
  const weatherColumnNames = weatherColumns.map(c => c.name)

  if (!weatherColumnNames.includes('barangay_id')) {
    await run('ALTER TABLE weather_logs ADD COLUMN barangay_id INTEGER REFERENCES barangays(id)')
    console.log('Migration: added barangay_id to weather_logs')
  }

  const settingsColumns = await all('PRAGMA table_info(system_settings)')
  const settingsColumnNames = settingsColumns.map(c => c.name)

  if (!settingsColumnNames.includes('updated_by')) {
    await run('ALTER TABLE system_settings ADD COLUMN updated_by INTEGER REFERENCES users(id)')
    console.log('Migration: added updated_by to system_settings')
  }
}

async function seedDefaultAdmin() {
  const demoUsers = [
    {
      name: 'System Administrator',
      username: 'sysadmin',
      email: 'admin@gingoog.gov.ph',
      password: 'Admin@1234',
      role: 'Super Administrator',
      barangay: 'All',
    },
    {
      name: 'Carlos Mendoza',
      username: 'cdrrmo01',
      email: 'carlos@cdrrmo.gov.ph',
      password: 'Cdrrmo@1234',
      role: 'CDRRMO Personnel',
      barangay: 'All',
    },
    {
      name: 'Ana Villanueva',
      username: 'brgy.kioskos',
      email: 'ana@kioskos.gov.ph',
      password: 'Brgy@1234',
      role: 'Barangay Admin',
      barangay: 'Kioskos',
    },
    {
      name: 'Mark Responder',
      username: 'responder01',
      email: 'mark@cdrrmo.gov.ph',
      password: 'Resp@1234',
      role: 'Field Responder',
      barangay: 'All',
    },
  ]

  for (const user of demoUsers) {
    const existing = await get('SELECT id FROM users WHERE username = ?', [user.username])
    if (!existing) {
      const hash = await bcrypt.hash(user.password, 12)
      await run(
        `INSERT INTO users (name, username, email, password_hash, role, barangay, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [user.name, user.username, user.email, hash, user.role, user.barangay, 'Active']
      )
      console.log(`Demo user created: ${user.username} / ${user.password}`)
    }
  }
}

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
      await run(
        `INSERT INTO barangays (name, captain, population, families, houses, risk_level, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, '', 0, 0, 0, 'Low', 'Active']
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