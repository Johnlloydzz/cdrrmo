// scripts/geocode-puroks.js
//
require('dotenv').config()
//
// One-time batch job: attempts to find an approximate latitude/longitude for
// every purok that doesn't have one yet, using the same free Nominatim
// (OpenStreetMap) geocoding service already used elsewhere in the app for
// barangays with no boundary_geojson.
//
// Query pattern: "{purok name}, {barangay name}, Gingoog City, Misamis
// Oriental, Philippines" — many puroks/sitios are too hyper-local to be
// indexed by OpenStreetMap, so this will NOT find every purok. Any purok
// left ungeocoded simply falls back to the household-centroid approximation
// already used in GISMap.jsx (see purokLabelPositions).
//
// Nominatim's usage policy requires: max 1 request/second, and a descriptive
// User-Agent identifying the application — both are respected below.
// https://operations.osmfoundation.org/policies/nominatim/
//
// Safe to re-run: only geocodes puroks where latitude/longitude is still
// NULL, so it never overwrites a location that was already found (or
// manually corrected later).
//
// Run once from drrmis/backend: node scripts/geocode-puroks.js

const { all, run } = require('../db/database')

const DELAY_MS = 1100 // Nominatim allows max 1 req/sec — pad slightly for safety
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'PDRA-GingoogCity-CDRRMO/1.0 (capstone project, purok geocoding)' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  if (!data.length) return null
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
}

async function geocodePuroks() {
  const puroks = await all(`
    SELECT p.id, p.name, b.name AS barangay_name
    FROM puroks p JOIN barangays b ON p.barangay_id = b.id
    WHERE p.latitude IS NULL OR p.longitude IS NULL
    ORDER BY b.name, p.name
  `)

  console.log(`Found ${puroks.length} purok(s) without a location. Geocoding one at a time (~1/sec)...\n`)

  let found = 0, notFound = 0

  for (const p of puroks) {
    const query = `${p.name}, ${p.barangay_name}, Gingoog City, Misamis Oriental, Philippines`
    try {
      const result = await geocode(query)
      if (result) {
        await run('UPDATE puroks SET latitude = ?, longitude = ? WHERE id = ?', [result.lat, result.lng, p.id])
        console.log(`  ✓ ${p.barangay_name} / ${p.name} -> ${result.lat}, ${result.lng}`)
        found++
      } else {
        console.log(`  - ${p.barangay_name} / ${p.name} -> not found (will use household-centroid fallback)`)
        notFound++
      }
    } catch (err) {
      console.log(`  ! ${p.barangay_name} / ${p.name} -> error: ${err.message}`)
      notFound++
    }
    await sleep(DELAY_MS)
  }

  console.log(`\nDone. ${found} geocoded, ${notFound} not found (those will still show a label once households with coordinates are added to them).`)
  process.exit(0)
}

geocodePuroks().catch(err => { console.error(err); process.exit(1) })