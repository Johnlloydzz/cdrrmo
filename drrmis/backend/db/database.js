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
  console.log('Database initialized.')
}

async function runMigrations() {
  // Add is_archived / archived_at columns to barangays if they don't exist yet
  const columns = await all('PRAGMA table_info(barangays)')
  const columnNames = columns.map(c => c.name)

  if (!columnNames.includes('is_archived')) {
    await run('ALTER TABLE barangays ADD COLUMN is_archived INTEGER DEFAULT 0')
    console.log('Migration: added is_archived to barangays')
  }

  if (!columnNames.includes('archived_at')) {
    await run('ALTER TABLE barangays ADD COLUMN archived_at TEXT')
    console.log('Migration: added archived_at to barangays')
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

module.exports = { getDb, run, get, all, initDb }