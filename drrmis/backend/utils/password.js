// One place for password hashing settings.
//
// bcrypt cost 10 is the OWASP-recommended minimum and takes about a quarter
// of the time of cost 12. That matters on Render's small free-tier CPU: the
// check runs on every sign-in, and with cost 12 a burst of officials signing
// in at the same time had to wait in line for half a minute.
const bcrypt = require('bcryptjs')

const BCRYPT_ROUNDS = 10

const hashPassword = (plain) => bcrypt.hash(plain, BCRYPT_ROUNDS)

// True for older hashes made with a higher cost (e.g. 12), so sign-in can
// quietly re-save them at the current cost.
function needsRehash(hash) {
  try { return bcrypt.getRounds(hash) !== BCRYPT_ROUNDS } catch { return false }
}

module.exports = { BCRYPT_ROUNDS, hashPassword, needsRehash }