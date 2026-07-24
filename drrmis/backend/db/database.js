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
  await seedDefaultAdmin()
  console.log('Database initialized.')
}

async function seedDefaultAdmin() {
  const existing = await get('SELECT id FROM users WHERE username = ?', ['sysadmin'])
  if (!existing) {
    const hash = await bcrypt.hash('Admin@1234', 12)
    await run(
      `INSERT INTO users (name, username, email, password_hash, role, barangay, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['System Administrator', 'sysadmin', 'admin@gingoog.gov.ph', hash, 'Super Administrator', 'All', 'Active']
    )
    console.log('Default admin created: sysadmin / Admin@1234')
  }
}

module.exports = { getDb, run, get, all, initDb }
