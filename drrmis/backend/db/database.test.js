const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

test('initDb seeds demo users required for login', async () => {
  const tempDbPath = path.join(__dirname, 'test-temp.db')
  if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath)

  process.env.DB_PATH = tempDbPath
  delete require.cache[require.resolve('./database')]

  const { initDb, get, getDb } = require('./database')
  await initDb()

  const expectedUsers = [
    { username: 'sysadmin', role: 'Super Administrator' },
    { username: 'cdrrmo01', role: 'CDRRMO Personnel' },
    { username: 'brgy.kioskos', role: 'Barangay Admin' },
    { username: 'responder01', role: 'Field Responder' },
  ]

  for (const expected of expectedUsers) {
    const user = await get('SELECT username, role FROM users WHERE username = ?', [expected.username])
    assert.ok(user, `Expected seeded user ${expected.username}`)
    assert.equal(user.role, expected.role)
  }

  await new Promise((resolve, reject) => {
    getDb().close((err) => (err ? reject(err) : resolve()))
  })
  fs.unlinkSync(tempDbPath)
})
