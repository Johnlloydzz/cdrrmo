// One-time script: uploads real PSA/PSGC barangay boundaries for all 79 Gingoog City
// barangays into the live DRRMIS database via the backend API.
//
// HOW TO RUN:
//   1. Place this file and gingoog-barangay-boundaries.json in the same folder
//      (e.g. backend/scripts/)
//   2. node populate-boundaries.js
//
// Requires Node 18+ (for built-in fetch). Check with: node -v

const fs = require('fs')
const path = require('path')

const API_URL = 'https://cdrrmo-backend.onrender.com/api'
const LOGIN = { username: 'cdrrmo01', password: 'Cdrrmo@1234' } // CDRRMO Personnel — has edit rights

async function main() {
  const boundaries = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'gingoog-barangay-boundaries.json'), 'utf8')
  )

  console.log('Logging in...')
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(LOGIN),
  })
  const loginData = await loginRes.json()
  if (!loginRes.ok || !loginData.token) {
    console.error('Login failed:', loginData)
    process.exit(1)
  }
  const token = loginData.token
  console.log('Logged in successfully.')

  console.log('Fetching current barangay list...')
  const listRes = await fetch(`${API_URL}/barangays`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const barangays = await listRes.json()
  console.log(`Fetched ${barangays.length} barangays from the database.`)

  let updated = 0
  let skipped = 0
  let failed = 0

  for (const b of barangays) {
    const geometry = boundaries[b.name]
    if (!geometry) {
      console.log(`  [SKIP] No boundary data found for "${b.name}"`)
      skipped++
      continue
    }

    const payload = {
      name: b.name,
      captain: b.captain,
      secretary: b.secretary,
      population: b.population,
      families: b.families,
      houses: b.houses,
      risk_level: b.risk_level,
      status: b.status,
      boundary_geojson: JSON.stringify(geometry),
      image_url: b.image_url || null,
    }

    const putRes = await fetch(`${API_URL}/barangays/${b.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })

    if (putRes.ok) {
      console.log(`  [OK]   ${b.name}`)
      updated++
    } else {
      const err = await putRes.json().catch(() => ({}))
      console.log(`  [FAIL] ${b.name} — ${err.error || putRes.status}`)
      failed++
    }

    // Be gentle on the free-tier backend — small delay between requests
    await new Promise(r => setTimeout(r, 150))
  }

  console.log('\n--- Summary ---')
  console.log(`Updated: ${updated}`)
  console.log(`Skipped (no matching boundary data): ${skipped}`)
  console.log(`Failed: ${failed}`)
}

main().catch(err => {
  console.error('Script error:', err)
  process.exit(1)
})