'use strict'
/**
 * PDRA regression test suite (backend API).
 *
 * Run from the backend folder:   node tests/regression.js
 *
 * - Starts its OWN copy of the server on port 5056 with a throw-away local
 *   database (tests/.regression.db). It never touches the live Turso database.
 * - Runs every test case, prints PASS/FAIL, and writes tests/regression-results.json.
 * - Exit code 0 = all passed, 1 = at least one failed.
 * Needs Node 18+ (built-in fetch).
 */
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const BACKEND = path.join(__dirname, '..')
process.chdir(BACKEND) // so the relative database path means the same thing for the server and for this script
const PORT = process.env.TEST_PORT || '5056'
const BASE = `http://localhost:${PORT}/api`
const DB_REL = './tests/.regression.db'
const DB_URL = 'file:' + DB_REL
const cleanDb = () => { for (const s of ['', '-wal', '-shm', '-journal']) { try { fs.unlinkSync(path.join(BACKEND, 'tests', '.regression.db' + s)) } catch {} } }

const results = []
let currentModule = ''
const mod = name => { currentModule = name; console.log(`\n== ${name}`) }
async function tc(id, title, expected, fn) {
  const t0 = Date.now()
  let pass = false, actual = ''
  try { const r = await fn(); pass = !!r[0]; actual = String(r[1] ?? '') } catch (e) { actual = 'Error: ' + e.message }
  results.push({ id, module: currentModule, title, expected, actual, result: pass ? 'PASS' : 'FAIL', ms: Date.now() - t0 })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${id}  ${title}${pass ? '' : '   -> ' + actual}`)
}
async function api(method, p, body, token) {
  const res = await fetch(BASE + p, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  let json = null; try { json = await res.json() } catch {}
  return { status: res.status, body: json, headers: res.headers }
}
const idOf = (b, k) => (b && (b.id ?? (b[k] && b[k].id)))
const has = (b, text) => JSON.stringify(b ?? '').toLowerCase().includes(text.toLowerCase())

async function waitForServer(logRef) {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(BASE + '/health'); if (r.ok && /PDRA API running/.test(logRef.text)) return } catch {}
    await new Promise(r => setTimeout(r, 500))
  }
  throw new Error('Server did not start. Log:\n' + logRef.text.slice(-1500))
}

// White-box fixture: a purok INSIDE a drawn flood area and one OUTSIDE it, so geofencing can be verified.
async function seedGeofencingFixture() {
  const { createClient } = require('@libsql/client')
  const { insideHazardArea } = require('../utils/householdRisk')
  const db = createClient({ url: DB_URL })
  const bs = (await db.execute("SELECT id,name,flood_area_geojson FROM barangays WHERE flood_area_geojson IS NOT NULL AND flood_area_geojson != '' AND flood_susceptibility != 'Low'")).rows
  let pick = null
  for (const b of bs) {
    const rings = []
    const walk = o => { if (!o) return; if (o.features) o.features.forEach(f => walk(f.geometry)); else if (o.geometry) walk(o.geometry); else if (o.type === 'Polygon') rings.push(o.coordinates[0]); else if (o.type === 'MultiPolygon') o.coordinates.forEach(p => rings.push(p[0])) }
    walk(JSON.parse(b.flood_area_geojson))
    for (const ring of rings) {
      for (let i = 0; i + 2 < ring.length && !pick; i++) {
        const lng = (ring[i][0] + ring[i + 1][0] + ring[i + 2][0]) / 3, lat = (ring[i][1] + ring[i + 1][1] + ring[i + 2][1]) / 3
        if (insideHazardArea({ latitude: lat, longitude: lng }, b.flood_area_geojson)) pick = { b, lat, lng }
      }
      if (pick) break
    }
    if (pick) break
  }
  if (!pick) throw new Error('No barangay with a drawn flood area was found to build the geofencing fixture')
  const bid = Number(pick.b.id)
  const ins = async (sql, args) => Number((await db.execute({ sql, args })).lastInsertRowid)
  const pIn = await ins('INSERT INTO puroks (barangay_id, name, latitude, longitude) VALUES (?,?,?,?)', [bid, 'REG Purok Inside', pick.lat, pick.lng])
  const pOut = await ins('INSERT INTO puroks (barangay_id, name, latitude, longitude) VALUES (?,?,?,?)', [bid, 'REG Purok Outside', 0.5, 0.5])
  const hh = (code, head, pid) => ins('INSERT INTO households (household_id, barangay_id, purok_id, head_family) VALUES (?,?,?,?)', [code, bid, pid, head])
  const h1 = await hh('HH-90001', 'Reg Head One', pIn), h2 = await hh('HH-90002', 'Reg Head Two', pIn), h3 = await hh('HH-90003', 'Reg Head Three', pOut)
  let n = 0
  const res = (hid, pid, name, sex, bd, rel) => ins('INSERT INTO residents (resident_id, household_id, barangay_id, purok_id, last_name, first_name, name, sex, birthdate, relation_to_head) VALUES (?,?,?,?,?,?,?,?,?,?)', ['RES-9' + String(++n).padStart(4, '0'), hid, bid, pid, 'Reg', name, name, sex, bd, rel])
  await res(h1, pIn, 'A One', 'Male', '1990-03-02', 'Head'); await res(h1, pIn, 'B Child', 'Female', '2021-06-10', 'Child'); await res(h1, pIn, 'C Senior', 'Female', '1950-01-05', 'Parent')
  await res(h2, pIn, 'D Two', 'Male', '1992-02-02', 'Head'); await res(h2, pIn, 'E Two', 'Female', '1993-04-04', 'Spouse')
  await res(h3, pOut, 'F Three', 'Male', '1990-01-01', 'Head')
  return { barangayId: bid, barangayName: pick.b.name, purokIn: pIn, purokOut: pOut }
}

async function main() {
  cleanDb()
  const logRef = { text: '' }
  const server = spawn(process.execPath, ['server.js'], {
    cwd: BACKEND, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, TURSO_DATABASE_URL: DB_URL, TURSO_AUTH_TOKEN: 'regression', JWT_SECRET: 'regression-test-secret-not-for-production-123456',
      NODE_ENV: 'development', PORT, KEEP_AWAKE: 'off', SEED_CDRRMO_PASSWORD: '', SEED_BRGY_PASSWORD: '' },
  })
  server.stdout.on('data', d => { logRef.text += d }); server.stderr.on('data', d => { logRef.text += d })
  const stop = () => { try { server.kill() } catch {} }
  process.on('exit', stop)

  try {
    await waitForServer(logRef)
    const pw = {
      cdrrmo: (logRef.text.match(/created: cdrrmo01 — temporary password: (\S+)/) || [])[1],
      brgy: (logRef.text.match(/created: brgy\.sanjuan — temporary password: (\S+)/) || [])[1],
    }
    if (!pw.cdrrmo || !pw.brgy) throw new Error('Could not read the generated demo passwords from the server log')
    const login = (u, p) => api('POST', '/auth/login', { username: u, password: p })
    const fx = await seedGeofencingFixture()

    // ───────────────────────────────────────────── 1. Authentication
    mod('Authentication and sessions')
    let C = '', O = '', O2 = '', brgyId = null
    await tc('TC-AUTH-01', 'CDRRMO Personnel can sign in', 'HTTP 200, token and role "CDRRMO Personnel"', async () => {
      const r = await login('cdrrmo01', pw.cdrrmo); C = r.body?.token || ''
      return [r.status === 200 && C && (r.body.user?.role || r.body.role) === 'CDRRMO Personnel', `HTTP ${r.status}`] })
    await tc('TC-AUTH-02', 'Barangay Official can sign in', 'HTTP 200, token and role "Barangay Official"', async () => {
      const r = await login('brgy.sanjuan', pw.brgy); O = r.body?.token || ''
      return [r.status === 200 && O && (r.body.user?.role || r.body.role) === 'Barangay Official', `HTTP ${r.status}`] })
    await tc('TC-AUTH-03', 'Wrong password is rejected', 'HTTP 401 "Invalid credentials"', async () => {
      const r = await login('cdrrmo01', 'definitely-wrong'); return [r.status === 401, `HTTP ${r.status}`] })
    await tc('TC-AUTH-04', 'Unknown username is rejected', 'HTTP 401', async () => {
      const r = await login('no.such.user', 'whatever123'); return [r.status === 401, `HTTP ${r.status}`] })
    await tc('TC-AUTH-05', 'Sign-in with missing fields is refused', 'HTTP 400', async () => {
      const r = await api('POST', '/auth/login', { username: 'cdrrmo01' }); return [r.status === 400, `HTTP ${r.status}`] })
    await tc('TC-AUTH-06', 'Old hard-coded demo passwords no longer work (security fix)', 'Both attempts HTTP 401', async () => {
      const a = await login('cdrrmo01', 'Cdrrmo' + '@1234'), b = await login('brgy.sanjuan', 'Brgy' + '@1234')
      return [a.status === 401 && b.status === 401, `HTTP ${a.status} / ${b.status}`] })
    await tc('TC-AUTH-07', 'Protected page data needs a sign-in', 'HTTP 401 without a token', async () => {
      const r = await api('GET', '/residents'); return [r.status === 401, `HTTP ${r.status}`] })
    await tc('TC-AUTH-08', 'A tampered token is refused', 'HTTP 401', async () => {
      const r = await api('GET', '/residents', undefined, C.slice(0, -4) + 'abcd'); return [r.status === 401, `HTTP ${r.status}`] })
    await tc('TC-AUTH-09', 'Account locks after 5 wrong tries', '6th attempt returns HTTP 429', async () => {
      let last = 0; for (let i = 0; i < 6; i++) last = (await login('lockout.probe', 'bad-password-' + i)).status
      return [last === 429, `6th attempt HTTP ${last}`] })
    await tc('TC-AUTH-10', 'Signed-in user can read their own profile', 'HTTP 200 with the username', async () => {
      const r = await api('GET', '/auth/me', undefined, C); return [r.status === 200 && has(r.body, 'cdrrmo01'), `HTTP ${r.status}`] })

    // ───────────────────────────────────────────── 2. User management
    mod('User management (CDRRMO only)')
    let u2id = null
    await tc('TC-USER-01', 'CDRRMO sees the user list', 'HTTP 200, at least 2 users', async () => {
      const r = await api('GET', '/users', undefined, C); const n = Array.isArray(r.body) ? r.body.length : (r.body?.rows?.length ?? 0)
      brgyId = (Array.isArray(r.body) ? r.body : r.body?.rows || []).find(u => u.username === 'brgy.sanjuan')?.barangay_id ?? null
      return [r.status === 200 && n >= 2, `HTTP ${r.status}, ${n} users`] })
    await tc('TC-USER-02', 'CDRRMO creates a Barangay Official for another barangay', 'HTTP 201', async () => {
      const r = await api('POST', '/users', { name: 'Reg Official Two', username: 'reg.official2', email: 'reg.official2@test.local', password: 'RegTest#2026', role: 'Barangay Official', barangay_id: fx.barangayId }, C)
      u2id = r.body?.id; return [r.status === 201 && u2id, `HTTP ${r.status} ${r.body?.error || ''}`] })
    await tc('TC-USER-03', 'Creating a user with missing fields is refused', 'HTTP 400', async () => {
      const r = await api('POST', '/users', { name: 'X' }, C); return [r.status === 400, `HTTP ${r.status}`] })
    await tc('TC-USER-04', 'Duplicate username is refused', 'HTTP 400', async () => {
      const r = await api('POST', '/users', { name: 'Dup', username: 'reg.official2', email: 'dup@test.local', password: 'RegTest#2026', role: 'CDRRMO Personnel' }, C); return [r.status === 400, `HTTP ${r.status} ${r.body?.error || ''}`] })
    await tc('TC-USER-05', 'Only one Barangay Official per barangay', 'HTTP 400 for a second official in the same barangay', async () => {
      const r = await api('POST', '/users', { name: 'Second', username: 'reg.official3', email: 'reg.official3@test.local', password: 'RegTest#2026', role: 'Barangay Official', barangay_id: fx.barangayId }, C); return [r.status === 400, `HTTP ${r.status} ${r.body?.error || ''}`] })
    await tc('TC-USER-06', 'Barangay Official cannot open User Management data', 'HTTP 403', async () => {
      const r = await api('GET', '/users', undefined, O); return [r.status === 403, `HTTP ${r.status}`] })
    await tc('TC-USER-07', 'Barangay Official cannot create users', 'HTTP 403', async () => {
      const r = await api('POST', '/users', { name: 'Hack', username: 'hack', email: 'h@test.local', password: 'RegTest#2026', role: 'CDRRMO Personnel' }, O); return [r.status === 403, `HTTP ${r.status}`] })
    await tc('TC-USER-08', 'CDRRMO edits a user', 'HTTP 200', async () => {
      const r = await api('PUT', `/users/${u2id}`, { name: 'Reg Official Two Edited', email: 'reg.official2@test.local', role: 'Barangay Official', barangay_id: fx.barangayId }, C); return [r.status === 200, `HTTP ${r.status} ${r.body?.error || ''}`] })
    await tc('TC-AUTH-11', 'Change password: too short, wrong current, then success', '400, 400, then 200 and the new password works, the old one does not', async () => {
      const t = (await login('reg.official2', 'RegTest#2026')).body?.token; O2 = t || ''
      const short = await api('POST', '/auth/change-password', { currentPassword: 'RegTest#2026', newPassword: 'short' }, t)
      const wrong = await api('POST', '/auth/change-password', { currentPassword: 'not-the-password', newPassword: 'NewPass#2026' }, t)
      const ok = await api('POST', '/auth/change-password', { currentPassword: 'RegTest#2026', newPassword: 'NewPass#2026' }, t)
      const newLogin = await login('reg.official2', 'NewPass#2026'), oldLogin = await login('reg.official2', 'RegTest#2026'); O2 = newLogin.body?.token || ''
      return [short.status === 400 && wrong.status === 400 && ok.status === 200 && newLogin.status === 200 && oldLogin.status === 401, `${short.status}, ${wrong.status}, ${ok.status}, new ${newLogin.status}, old ${oldLogin.status}`] })

    // ───────────────────────────────────────────── 3. Account requests
    mod('Account requests')
    const barangaysList = (await api('GET', '/account-requests/barangays')).body
    const freeBrgy = (Array.isArray(barangaysList) ? barangaysList : []).find(b => b.id !== brgyId && b.id !== fx.barangayId)
    let reqId = null
    await tc('TC-ACC-01', 'The request form can load barangays without signing in', 'HTTP 200, a list', async () => {
      const r = await api('GET', '/account-requests/barangays'); return [r.status === 200 && Array.isArray(r.body) && r.body.length > 0, `HTTP ${r.status}, ${Array.isArray(r.body) ? r.body.length : 0} barangays`] })
    await tc('TC-ACC-02', 'A valid request is accepted', 'HTTP 201', async () => {
      const r = await api('POST', '/account-requests', { name: 'Reg Applicant', email: 'reg.applicant@test.local', contact: '09171234567', barangay_id: freeBrgy?.id, position: 'Barangay Secretary', message: 'regression test' })
      return [r.status === 201 || r.status === 200, `HTTP ${r.status} ${r.body?.error || ''}`] })
    await tc('TC-ACC-03', 'Missing fields are refused', 'HTTP 400', async () => {
      const r = await api('POST', '/account-requests', { name: 'No Email' }); return [r.status === 400, `HTTP ${r.status}`] })
    await tc('TC-ACC-04', 'An invalid mobile number is refused', 'HTTP 400', async () => {
      const r = await api('POST', '/account-requests', { name: 'Bad Phone', email: 'bad.phone@test.local', contact: '12345', barangay_id: freeBrgy?.id }); return [r.status === 400, `HTTP ${r.status}`] })
    await tc('TC-ACC-05', 'The same mobile number cannot request twice', 'HTTP 400', async () => {
      const r = await api('POST', '/account-requests', { name: 'Dup Phone', email: 'dup.phone@test.local', contact: '09171234567', barangay_id: freeBrgy?.id }); return [r.status === 400, `HTTP ${r.status}`] })
    await tc('TC-ACC-06', 'An email that already has an account cannot request', 'HTTP 400', async () => {
      const r = await api('POST', '/account-requests', { name: 'Has Account', email: 'carlos@cdrrmo.gov.ph', contact: '09181234567', barangay_id: freeBrgy?.id }); return [r.status === 400, `HTTP ${r.status}`] })
    await tc('TC-ACC-07', 'CDRRMO sees the pending request', 'HTTP 200, request listed', async () => {
      const r = await api('GET', '/account-requests', undefined, C)
      const rows = Array.isArray(r.body) ? r.body : (r.body?.rows || []); const found = rows.find(x => x.email === 'reg.applicant@test.local'); reqId = found?.id
      return [r.status === 200 && !!found, `HTTP ${r.status}, ${rows.length} request(s)`] })
    await tc('TC-ACC-08', 'Barangay Official cannot see account requests', 'HTTP 403', async () => {
      const r = await api('GET', '/account-requests', undefined, O); return [r.status === 403, `HTTP ${r.status}`] })
    await tc('TC-ACC-09', 'CDRRMO approves a request', 'HTTP 200 and the request status becomes "Approved" (the account itself is created in User Management, see TC-USER-02)', async () => {
      const r = await api('PUT', `/account-requests/${reqId}/approve`, {}, C)
      return [r.status === 200 && r.body?.status === 'Approved', `HTTP ${r.status}, status ${r.body?.status}`] })
    await tc('TC-ACC-10', 'CDRRMO rejects a request', 'HTTP 200 and the status becomes "Rejected"', async () => {
      const mk = await api('POST', '/account-requests', { name: 'Reg Reject', email: 'reg.reject@test.local', contact: '09191234567', barangay_id: freeBrgy?.id })
      const list = await api('GET', '/account-requests', undefined, C); const rid3 = (Array.isArray(list.body) ? list.body : (list.body?.rows || [])).find(x => x.email === 'reg.reject@test.local')?.id
      const r = await api('PUT', `/account-requests/${rid3}/reject`, {}, C)
      return [mk.status < 300 && r.status === 200 && r.body?.status === 'Rejected', `HTTP ${r.status}, status ${r.body?.status}`] })

    // ───────────────────────────────────────────── 4. Purok
    mod('Purok management')
    let pid = null
    await tc('TC-PUR-01', 'Barangay Official adds a purok', 'HTTP 201', async () => {
      const r = await api('POST', '/puroks', { name: 'Purok Regression' }, O); pid = idOf(r.body, 'purok'); return [r.status === 201 && pid, `HTTP ${r.status}`] })
    await tc('TC-PUR-02', 'A duplicate purok name is refused', 'HTTP 400', async () => {
      const r = await api('POST', '/puroks', { name: 'Purok Regression' }, O); return [r.status === 400, `HTTP ${r.status}`] })
    await tc('TC-PUR-03', 'An empty purok name is refused', 'HTTP 400', async () => {
      const r = await api('POST', '/puroks', { name: '   ' }, O); return [r.status === 400, `HTTP ${r.status}`] })
    await tc('TC-PUR-04', 'CDRRMO cannot add a purok (view-only)', 'HTTP 403', async () => {
      const r = await api('POST', '/puroks', { name: 'X' }, C); return [r.status === 403, `HTTP ${r.status}`] })
    await tc('TC-PUR-05', 'Barangay Official renames their own purok', 'HTTP 200', async () => {
      const r = await api('PUT', `/puroks/${pid}`, { name: 'Purok Regression Renamed' }, O); return [r.status === 200, `HTTP ${r.status} ${r.body?.error || ''}`] })
    await tc('TC-PUR-06', 'An official of another barangay cannot edit it', 'HTTP 403', async () => {
      const r = await api('PUT', `/puroks/${pid}`, { name: 'Hijacked' }, O2); return [r.status === 403 || r.status === 404, `HTTP ${r.status}`] })
    await tc('TC-PUR-07', 'CDRRMO cannot delete a purok', 'HTTP 403', async () => {
      const r = await api('DELETE', `/puroks/${pid}`, undefined, C); return [r.status === 403, `HTTP ${r.status}`] })

    // ───────────────────────────────────────────── 5. Residents
    mod('Resident management')
    let rid = null, rid2 = null
    const resBody = (o = {}) => ({ last_name: 'Cruz', first_name: 'Maria', birthdate: '1985-03-02', sex: 'Female', relation_to_head: 'Head', purok_id: pid, ...o })
    await tc('TC-RES-01', 'Barangay Official registers a resident', 'HTTP 201', async () => {
      const r = await api('POST', '/residents', resBody(), O); rid = idOf(r.body, 'resident'); return [r.status === 201 && rid, `HTTP ${r.status} ${r.body?.error || ''}`] })
    await tc('TC-RES-02', 'A purok is required', 'HTTP 400', async () => {
      const r = await api('POST', '/residents', resBody({ purok_id: undefined }), O); return [r.status === 400, `HTTP ${r.status}`] })
    await tc('TC-RES-03', 'An invalid contact number is refused', 'HTTP 400', async () => {
      const r = await api('POST', '/residents', resBody({ contact_number: '123' }), O); return [r.status === 400, `HTTP ${r.status}`] })
    await tc('TC-RES-04', 'A future birthdate is refused', 'HTTP 400', async () => {
      const r = await api('POST', '/residents', resBody({ birthdate: '2099-01-01' }), O); return [r.status === 400, `HTTP ${r.status}`] })
    await tc('TC-RES-05', 'A missing first name is refused', 'HTTP 400', async () => {
      const r = await api('POST', '/residents', resBody({ first_name: '' }), O); return [r.status === 400, `HTTP ${r.status}`] })
    await tc('TC-RES-06', 'CDRRMO cannot register residents (view-only)', 'HTTP 403', async () => {
      const r = await api('POST', '/residents', resBody(), C); return [r.status === 403, `HTTP ${r.status}`] })
    await tc('TC-RES-07', 'CDRRMO sees the new resident right away (list and cards)', 'Resident in the list; total went up', async () => {
      const list = await api('GET', '/residents?page=1&limit=50', undefined, C); const stats = await api('GET', '/residents/stats', undefined, C)
      return [list.status === 200 && (list.body?.rows || []).some(r => r.id === rid) && stats.body?.total >= 7, `list HTTP ${list.status}, total ${stats.body?.total}`] })
    await tc('TC-RES-08', 'Search finds the resident; a bad search returns none', 'Found for "maria"; 0 for "zzzz"', async () => {
      const a = await api('GET', '/residents?page=1&limit=50&search=maria', undefined, C), b = await api('GET', '/residents?page=1&limit=50&search=zzzzqq', undefined, C)
      return [a.body?.total >= 1 && b.body?.total === 0, `maria ${a.body?.total}, zzzz ${b.body?.total}`] })
    await tc('TC-RES-09', 'Pagination limits the page size', 'limit=2 returns at most 2 rows and a total', async () => {
      const r = await api('GET', '/residents?page=1&limit=2', undefined, C); return [r.status === 200 && (r.body?.rows || []).length <= 2 && r.body?.total >= 7, `${(r.body?.rows || []).length} row(s), total ${r.body?.total}`] })
    await tc('TC-RES-10', 'Barangay Official edits their resident', 'HTTP 200', async () => {
      const r = await api('PUT', `/residents/${rid}`, resBody({ first_name: 'Mariana' }), O); return [r.status === 200, `HTTP ${r.status} ${r.body?.error || ''}`] })
    await tc('TC-RES-11', 'An official of another barangay cannot edit or see it', 'Not editable (403/404) and not in their list', async () => {
      const put = await api('PUT', `/residents/${rid}`, resBody({ first_name: 'Hijack' }), O2); const list = await api('GET', '/residents?page=1&limit=50&search=Mariana', undefined, O2)
      return [(put.status === 403 || put.status === 404) && (list.body?.total === 0), `PUT HTTP ${put.status}, their list total ${list.body?.total}`] })
    await tc('TC-RES-12', 'Age-group cards count residents correctly', 'Stats include Child, Teen, Adult and Senior counts', async () => {
      const r = await api('GET', '/residents/stats', undefined, C); return [r.status === 200 && 'Child (1-12)' in r.body && 'Senior (60+)' in r.body, JSON.stringify(r.body)] })

    // ───────────────────────────────────────────── 6. Households
    mod('Household management')
    let hid = null
    await tc('TC-HH-01', 'A household needs a head of family', 'HTTP 400 without a head', async () => {
      const r = await api('POST', '/households', { purok_id: pid }, O); return [r.status === 400, `HTTP ${r.status}`] })
    await tc('TC-HH-02', 'Only a resident marked "Head" can be head', 'HTTP 400 for a "Child" resident', async () => {
      const c = await api('POST', '/residents', resBody({ first_name: 'Kid', birthdate: '2018-01-01', relation_to_head: 'Child' }), O); rid2 = idOf(c.body, 'resident')
      const r = await api('POST', '/households', { purok_id: pid, head_resident_id: rid2 }, O); return [r.status === 400, `HTTP ${r.status} ${r.body?.error || ''}`] })
    await tc('TC-HH-03', 'Barangay Official registers a household', 'HTTP 201', async () => {
      const r = await api('POST', '/households', { purok_id: pid, head_resident_id: rid }, O); hid = idOf(r.body, 'household'); return [r.status === 201 && hid, `HTTP ${r.status} ${r.body?.error || ''}`] })
    await tc('TC-HH-04', 'The same head cannot start a second household', 'HTTP 400', async () => {
      const r = await api('POST', '/households', { purok_id: pid, head_resident_id: rid }, O); return [r.status === 400, `HTTP ${r.status}`] })
    await tc('TC-HH-05', 'CDRRMO cannot register households (view-only)', 'HTTP 403', async () => {
      const r = await api('POST', '/households', { purok_id: pid, head_resident_id: rid }, C); return [r.status === 403, `HTTP ${r.status}`] })
    await tc('TC-HH-06', 'CDRRMO sees the new household right away', 'Household in the list', async () => {
      const r = await api('GET', '/households?page=1&limit=50', undefined, C); return [r.status === 200 && (r.body?.rows || []).some(h => h.id === hid), `HTTP ${r.status}, total ${r.body?.total}`] })
    await tc('TC-HH-07', 'An official of another barangay cannot see or delete it', 'Not in their list; DELETE refused', async () => {
      const list = await api('GET', '/households?page=1&limit=50', undefined, O2); const del = await api('DELETE', `/households/${hid}`, undefined, O2)
      return [!(list.body?.rows || []).some(h => h.id === hid) && (del.status === 403 || del.status === 404), `their list has it: ${(list.body?.rows || []).some(h => h.id === hid)}, DELETE HTTP ${del.status}`] })

    mod('Geofencing rule for puroks without a map location')
    // A purok with no map location can't be checked against the drawn flood area, so the system counts it as inside (cautious rule).
    await tc('TC-RISK-09', 'A purok without a map location in a flood-prone barangay is counted as at risk (cautious rule)', 'The official\'s household (purok with no location) appears in the planning report', async () => {
      const r = await api('GET', '/reports/households-at-risk?hazard=flood&basis=planning', undefined, O)
      return [r.status === 200 && r.body?.summary?.households_at_risk === 1, `HTTP ${r.status}, ${r.body?.summary?.households_at_risk} household(s)`] })

    mod('Deleting records')
    await tc('TC-DEL-01', 'Barangay Official deletes a household, resident and purok', 'HTTP 200 for each', async () => {
      const h = await api('DELETE', `/households/${hid}`, undefined, O); const r1 = await api('DELETE', `/residents/${rid}`, undefined, O); const r2 = await api('DELETE', `/residents/${rid2}`, undefined, O); const p = await api('DELETE', `/puroks/${pid}`, undefined, O)
      return [h.status === 200 && r1.status === 200 && r2.status === 200 && p.status === 200, `${h.status}, ${r1.status}, ${r2.status}, ${p.status}`] })

    // ───────────────────────────────────────────── 7. Hazard / risk / geofencing
    mod('Risk assessment and geofencing')
    const puroksRisk = async (tok = C) => (await api('GET', '/risk-assessment/puroks', undefined, tok)).body || []
    const flag = (rows, id) => rows.find(p => p.purok_id === id)?.in_flood_risk_zone
    await tc('TC-RISK-01', 'Risk summary lists every barangay', 'HTTP 200 and 79 barangays', async () => {
      const r = await api('GET', '/risk-assessment/summary', undefined, C); return [r.status === 200 && Array.isArray(r.body) && r.body.length === 79, `HTTP ${r.status}, ${Array.isArray(r.body) ? r.body.length : 0} barangays`] })
    await tc('TC-RISK-02', 'No heavy rain: nobody is flagged at risk', 'Inside and outside puroks are both not at risk', async () => {
      const rows = await puroksRisk(); return [flag(rows, fx.purokIn) === false && flag(rows, fx.purokOut) === false, `inside ${flag(rows, fx.purokIn)}, outside ${flag(rows, fx.purokOut)}`] })
    await tc('TC-RISK-03', 'Only CDRRMO can switch the heavy-rain drill', 'Official HTTP 403', async () => {
      const r = await api('PUT', '/settings/simulate-heavy-rain', { on: true }, O); return [r.status === 403, `HTTP ${r.status}`] })
    await tc('TC-RISK-04', 'Heavy-rain drill flags the purok inside the flood area only (geofencing)', 'Inside = at risk, outside = not', async () => {
      const on = await api('PUT', '/settings/simulate-heavy-rain', { on: true }, C); const rows = await puroksRisk()
      return [on.status === 200 && flag(rows, fx.purokIn) === true && flag(rows, fx.purokOut) === false, `drill HTTP ${on.status}, inside ${flag(rows, fx.purokIn)}, outside ${flag(rows, fx.purokOut)}`] })
    await tc('TC-RISK-05', 'A low flood level (0.5 m) stays under the 0.86 m threshold', 'Inside purok not at risk', async () => {
      const s = await api('PUT', '/settings/flood-level', { level_m: 0.5 }, C); const rows = await puroksRisk()
      return [s.status === 200 && flag(rows, fx.purokIn) === false, `set HTTP ${s.status}, inside ${flag(rows, fx.purokIn)}`] })
    await tc('TC-RISK-06', 'A higher flood level (1.0 m) puts the inside purok at risk', 'Inside purok at risk', async () => {
      const s = await api('PUT', '/settings/flood-level', { level_m: 1 }, C); const rows = await puroksRisk()
      return [s.status === 200 && flag(rows, fx.purokIn) === true, `set HTTP ${s.status}, inside ${flag(rows, fx.purokIn)}`] })
    await tc('TC-RISK-07', 'Flood level validation', '25 m and "abc" refused (400); Official refused (403)', async () => {
      const a = await api('PUT', '/settings/flood-level', { level_m: 25 }, C), b = await api('PUT', '/settings/flood-level', { level_m: 'abc' }, C), c = await api('PUT', '/settings/flood-level', { level_m: 1 }, O)
      return [a.status === 400 && b.status === 400 && c.status === 403, `${a.status}, ${b.status}, ${c.status}`] })
    await tc('TC-RISK-08', 'Heavy-rain drill sends a notification to Barangay Officials', 'The official\'s notifications mention the drill', async () => {
      const r = await api('GET', '/notifications', undefined, O); return [r.status === 200 && has(r.body, 'heavy rain simulation'), `HTTP ${r.status}`] })

    // ───────────────────────────────────────────── 8. Reports (new)
    mod('Reports: Households at Risk (new)')
    const rep = (q, tok = C) => api('GET', `/reports/households-at-risk${q}`, undefined, tok)
    const mine = r => ({ ...r.body?.summary })
    await tc('TC-RPT-01', 'Planning view counts the households inside the flood area', '1 purok, 2 households, 5 residents at risk', async () => {
      const r = await rep('?hazard=flood&basis=planning'); const s = mine(r)
      return [r.status === 200 && s.puroks_at_risk === 1 && s.households_at_risk === 2 && s.residents_at_risk === 5, `HTTP ${r.status}: ${s.puroks_at_risk} purok, ${s.households_at_risk} HH, ${s.residents_at_risk} residents`] })
    await tc('TC-RPT-02', 'Residents at risk are split correctly by age and sex', 'Child 1, Teen 0, Adult 3, Senior 1; Male 2, Female 3', async () => {
      const d = mine(await rep('?hazard=flood&basis=planning')).demographics || {}
      return [d.child === 1 && d.teen === 0 && d.adult === 3 && d.senior === 1 && d.male === 2 && d.female === 3, JSON.stringify(d)] })
    await tc('TC-RPT-03', 'The household outside the flood area is not listed as at risk', 'Only "Reg Head One/Two" listed', async () => {
      const r = await rep('?hazard=flood&basis=planning'); const heads = (r.body?.households || []).map(h => h.head_family).filter(n => n.startsWith('Reg Head'))
      return [heads.join() === 'Reg Head One,Reg Head Two', heads.join()] })
    await tc('TC-RPT-04', 'Live view follows the current alert', 'Drill on: same as planning (2 HH); drill off: 0', async () => {
      const on = mine(await rep('?hazard=flood&basis=live')).households_at_risk
      await api('PUT', '/settings/flood-level', { level_m: 0 }, C); await api('PUT', '/settings/simulate-heavy-rain', { on: false }, C)
      const off = mine(await rep('?hazard=flood&basis=live')).households_at_risk
      return [on === 2 && off === 0, `drill on ${on}, drill off ${off}`] })
    await tc('TC-RPT-05', 'Planning view does not depend on the weather', 'Still 2 households with the drill off', async () => {
      const r = mine(await rep('?hazard=flood&basis=planning')); return [r.households_at_risk === 2, `${r.households_at_risk}`] })
    await tc('TC-RPT-06', 'Purok filter narrows the report', 'Only the chosen purok (2 households)', async () => {
      const r = await rep(`?hazard=flood&basis=planning&purok_id=${fx.purokIn}`); const s = mine(r); return [r.status === 200 && s.puroks_total === 1 && s.households_total === 2, `${s.puroks_total} purok, ${s.households_total} HH`] })
    await tc('TC-RPT-07', 'Landslide report works', 'HTTP 200 with a summary', async () => {
      const r = await rep('?hazard=landslide'); return [r.status === 200 && !!r.body?.summary, `HTTP ${r.status}`] })
    await tc('TC-RPT-08', 'A Barangay Official only gets their own barangay', 'One barangay in scope, even if another id is requested', async () => {
      const r = await rep(`?hazard=flood&basis=planning&barangay_id=${fx.barangayId}`, O); return [r.status === 200 && r.body?.summary?.barangays_in_scope === 1 && r.body?.summary?.households_at_risk === 0, `scope ${r.body?.summary?.barangays_in_scope}, HH ${r.body?.summary?.households_at_risk}`] })
    await tc('TC-RPT-09', 'The official who owns the barangay sees its households', '2 households at risk', async () => {
      const r = await rep('?hazard=flood&basis=planning', O2); return [r.status === 200 && r.body?.summary?.households_at_risk === 2, `HTTP ${r.status}, HH ${r.body?.summary?.households_at_risk}`] })
    await tc('TC-RPT-10', 'The report needs a sign-in', 'HTTP 401', async () => {
      const r = await api('GET', '/reports/households-at-risk?hazard=flood'); return [r.status === 401, `HTTP ${r.status}`] })
    await tc('TC-RPT-11', 'The report carries who made it and when', 'generated_at, generated_by and role present', async () => {
      const b = (await rep('?hazard=flood&basis=planning')).body; return [!!b?.generated_at && b?.generated_by === 'Carlos Mendoza' && b?.role === 'CDRRMO Personnel', `${b?.generated_by} / ${b?.role}`] })

    // ───────────────────────────────────────────── 9. Settings
    mod('System settings')
    const base = { name: 'PDRA', address: 'Gingoog City', email: 'cdrrmo@example.com' }
    await tc('TC-SET-01', 'A 20-digit contact number is refused', 'HTTP 400', async () => {
      const r = await api('PUT', '/settings/system-info', { ...base, contact: '12345678901234567890' }, C); return [r.status === 400, `HTTP ${r.status}`] })
    await tc('TC-SET-02', 'A mobile number and a landline are accepted', 'HTTP 200 for both', async () => {
      const a = await api('PUT', '/settings/system-info', { ...base, contact: '09373536567' }, C), b = await api('PUT', '/settings/system-info', { ...base, contact: '(088) 861-1234' }, C); return [a.status === 200 && b.status === 200, `${a.status}, ${b.status}`] })
    await tc('TC-SET-03', 'An invalid email is refused', 'HTTP 400', async () => {
      const r = await api('PUT', '/settings/system-info', { ...base, contact: '09373536567', email: 'nope' }, C); return [r.status === 400, `HTTP ${r.status}`] })
    await tc('TC-SET-04', 'Barangay Official cannot change system information', 'HTTP 403', async () => {
      const r = await api('PUT', '/settings/system-info', { ...base, contact: '09373536567' }, O); return [r.status === 403, `HTTP ${r.status}`] })

    // ───────────────────────────────────────────── 10. Data and platform
    mod('Built-in data and platform')
    await tc('TC-SYS-01', 'Health check answers', 'HTTP 200 status ok', async () => { const r = await api('GET', '/health'); return [r.status === 200 && r.body?.status === 'ok', `HTTP ${r.status}`] })
    await tc('TC-SYS-02', 'All 79 barangays have a drawn boundary', '79 with boundary data', async () => {
      const r = await api('GET', '/barangays', undefined, C); const n = (r.body || []).filter(b => b.boundary_geojson).length; return [(r.body || []).length === 79 && n === 79, `${(r.body || []).length} barangays, ${n} with boundary`] })
    await tc('TC-SYS-03', 'CDRA flood areas are loaded (barangays with a drawn flood area)', 'At least 12 barangays with a drawn flood area', async () => {
      const r = await api('GET', '/barangays', undefined, C); const n = (r.body || []).filter(b => b.flood_area_geojson).length; return [n >= 12, `${n} barangays`] })
    await tc('TC-SYS-04', 'CLUP zones are loaded', '210 zones', async () => {
      const r = await api('GET', '/clup-zones', undefined, C); const z = Array.isArray(r.body) ? r.body : (r.body?.zones || []); return [z.length === 210, `${z.length} zones`] })
    await tc('TC-SYS-05', 'An unknown address returns "not found"', 'HTTP 404', async () => { const r = await api('GET', '/nope'); return [r.status === 404, `HTTP ${r.status}`] })
    await tc('TC-SYS-06', 'The server log shows no errors during the whole run', 'No "error" lines', async () => {
      const bad = logRef.text.split('\n').filter(l => /error|TypeError|ReferenceError|unhandled|SQLITE/i.test(l) && !/temporary password/.test(l)); return [bad.length === 0, bad.length ? bad.slice(0, 2).join(' | ') : 'no error lines'] })

    mod('Clean-up')
    await tc('TC-DEL-02', 'CDRRMO deletes a test user', 'HTTP 200', async () => { const r = await api('DELETE', `/users/${u2id}`, undefined, C); return [r.status === 200, `HTTP ${r.status}`] })
  } finally {
    stop()
  }

  const passed = results.filter(r => r.result === 'PASS').length
  const summary = { run_at: new Date().toISOString(), node: process.version, total: results.length, passed, failed: results.length - passed }
  fs.writeFileSync(path.join(__dirname, 'regression-results.json'), JSON.stringify({ summary, results }, null, 2))
  console.log(`\nRESULT: ${passed}/${results.length} passed${summary.failed ? `, ${summary.failed} FAILED` : ' — ALL PASSED'}`)
  setTimeout(() => { cleanDb(); process.exit(summary.failed ? 1 : 0) }, 300)
}
main().catch(e => { console.error('Regression run aborted:', e.message); cleanDb(); process.exit(2) })