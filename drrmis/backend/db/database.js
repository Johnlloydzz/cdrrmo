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
  await seedBarangays()
  await seedDefaultAdmin()
  await seedBoundaries()
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
        `INSERT INTO barangays (name, population, risk_level) VALUES (?, ?, ?)`,
        [name, 0, 'Low']
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