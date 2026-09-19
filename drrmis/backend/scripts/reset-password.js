// scripts/reset-password.js
//
// EMERGENCY password reset — bypasses the entire app, including the login
// system itself. Use this when NO ONE can get into User Management to reset
// a password normally (e.g. the only CDRRMO Personnel account is locked
// out). Run this locally, on your own machine, with your Render/Turso
// credentials — never expose this as an API route.
//
// Requires the same environment variables the backend itself uses:
//   TURSO_DATABASE_URL and TURSO_AUTH_TOKEN
// Easiest way to set these for a one-off run: copy them from Render's
// Environment tab into a local .env file in drrmis/backend (if you don't
// already have one), since this script loads dotenv just like server.js.
//
// Usage (from drrmis/backend):
//   node scripts/reset-password.js <username> <newPassword>
//
// Example:
//   node scripts/reset-password.js cdrrmo01 MyNewPassword123

require('dotenv').config()
const bcrypt = require('bcryptjs')
const { get, run } = require('../db/database')

async function main() {
  const [username, newPassword] = process.argv.slice(2)

  if (!username || !newPassword) {
    console.error('Usage: node scripts/reset-password.js <username> <newPassword>')
    process.exit(1)
  }
  if (newPassword.length < 8) {
    console.error('Password must be at least 8 characters.')
    process.exit(1)
  }

  const user = await get('SELECT id, name, username, role FROM users WHERE username = ?', [username])
  if (!user) {
    console.error(`No user found with username "${username}".`)
    process.exit(1)
  }

  const hash = await bcrypt.hash(newPassword, 12)
  await run(
    `UPDATE users SET password_hash = ?, updated_at = datetime('now', '+8 hours') WHERE id = ?`,
    [hash, user.id]
  )

  console.log(`Password reset for ${user.name} (${user.username}, ${user.role}).`)
  console.log(`New password: ${newPassword}`)
  console.log('You can log in with this now.')
  process.exit(0)
}

main().catch(err => {
  console.error('Failed to reset password:', err.message)
  process.exit(1)
})