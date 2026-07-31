// One-time script: automatically finds real, geotagged photos near each barangay's
// location using Wikimedia Commons (free, no API key needed) and saves them as the
// barangay's image_url via the live API.
//
// Coverage will vary — barangays near known landmarks (churches, plazas, schools,
// the city center) are more likely to have a nearby geotagged photo than small,
// rural barangays. Barangays with no match are simply left as-is (skipped).
//
// Already-set image_url values are NOT overwritten — only blank ones are filled in.
//
// HOW TO RUN:
//   node populate-images.js
// Requires Node 18+ (for built-in fetch). Check with: node -v

const API_URL = 'https://cdrrmo-backend.onrender.com/api'
const LOGIN = { username: 'cdrrmo01', password: 'Cdrrmo@1234' }

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php'
const USER_AGENT = 'DRRMIS-Gingoog-Capstone/1.0 (student capstone project; Gingoog City Colleges)'
const SEARCH_RADIUS_METERS = 3000 // how far from the barangay centroid to look for photos

// Same centroid math used in the GIS Map frontend (average of polygon vertices)
function getCentroid(geojson) {
  if (!geojson) return null
  try {
    let rings = []
    if (geojson.type === 'Polygon') rings = [geojson.coordinates[0]]
    else if (geojson.type === 'MultiPolygon') rings = geojson.coordinates.map(p => p[0])
    else return null
    let sumLat = 0, sumLng = 0, count = 0
    rings.forEach(ring => ring.forEach(([lng, lat]) => { sumLat += lat; sumLng += lng; count++ }))
    return count ? [sumLat / count, sumLng / count] : null
  } catch {
    return null
  }
}

async function findNearbyPhoto(lat, lon) {
  // Step 1: find geotagged files (namespace 6 = File) near this coordinate
  const searchUrl = `${COMMONS_API}?action=query&list=geosearch&gscoord=${lat}|${lon}` +
    `&gsradius=${SEARCH_RADIUS_METERS}&gslimit=5&gsnamespace=6&format=json&origin=*`
  const searchRes = await fetch(searchUrl, { headers: { 'User-Agent': USER_AGENT } })
  const searchData = await searchRes.json()
  const hits = searchData?.query?.geosearch || []
  if (hits.length === 0) return null

  // Step 2: get a usable direct image URL for the first hit
  const title = hits[0].title
  const infoUrl = `${COMMONS_API}?action=query&titles=${encodeURIComponent(title)}` +
    `&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json&origin=*`
  const infoRes = await fetch(infoUrl, { headers: { 'User-Agent': USER_AGENT } })
  const infoData = await infoRes.json()
  const pages = infoData?.query?.pages || {}
  const page = Object.values(pages)[0]
  const info = page?.imageinfo?.[0]
  return info?.thumburl || info?.url || null
}

async function main() {
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
  const listRes = await fetch(`${API_URL}/barangays`, { headers: { Authorization: `Bearer ${token}` } })
  const barangays = await listRes.json()
  console.log(`Fetched ${barangays.length} barangays.\n`)

  let found = 0, skippedHasImage = 0, skippedNoBoundary = 0, notFound = 0, failed = 0

  for (const b of barangays) {
    if (b.image_url) {
      console.log(`  [SKIP] ${b.name} — already has an image`)
      skippedHasImage++
      continue
    }
    if (!b.boundary_geojson) {
      console.log(`  [SKIP] ${b.name} — no boundary yet, can't locate it`)
      skippedNoBoundary++
      continue
    }

    let centroid
    try {
      centroid = getCentroid(JSON.parse(b.boundary_geojson))
    } catch {
      centroid = null
    }
    if (!centroid) {
      console.log(`  [SKIP] ${b.name} — couldn't compute location`)
      skippedNoBoundary++
      continue
    }

    try {
      const photoUrl = await findNearbyPhoto(centroid[0], centroid[1])
      if (!photoUrl) {
        console.log(`  [NONE] ${b.name} — no nearby photo found on Wikimedia Commons`)
        notFound++
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
        boundary_geojson: b.boundary_geojson,
        image_url: photoUrl,
      }
      const putRes = await fetch(`${API_URL}/barangays/${b.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      if (putRes.ok) {
        console.log(`  [OK]   ${b.name} — ${photoUrl}`)
        found++
      } else {
        console.log(`  [FAIL] ${b.name} — save failed (${putRes.status})`)
        failed++
      }
    } catch (err) {
      console.log(`  [FAIL] ${b.name} — ${err.message}`)
      failed++
    }

    // Be polite to the free Wikimedia API
    await new Promise(r => setTimeout(r, 300))
  }

  console.log('\n--- Summary ---')
  console.log(`Photos found & saved: ${found}`)
  console.log(`Skipped (already had an image): ${skippedHasImage}`)
  console.log(`Skipped (no boundary/location yet): ${skippedNoBoundary}`)
  console.log(`No nearby photo found: ${notFound}`)
  console.log(`Failed: ${failed}`)
}

main().catch(err => {
  console.error('Script error:', err)
  process.exit(1)
})