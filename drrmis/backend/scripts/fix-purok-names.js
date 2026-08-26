// scripts/fix-purok-names.js
//
// Corrects 5 purok names that were mis-transcribed in the initial seed,
// found by re-checking the source text directly against the Gingoog City
// Statistical Yearbook 2022, Table II.36 "Sitios/Puroks by Barangay".
//
// Uses UPDATE (never delete+insert) so any households already linked to
// these puroks (via purok_id) keep their link — only the name text changes.
//
// Safe to re-run: only updates a row if its current name still matches the
// known-wrong spelling, so running this twice is a no-op the second time.
//
// Run once from drrmis/backend: node scripts/fix-purok-names.js

const { all, get, run } = require('../db/database')

const CORRECTIONS = [
  { barangay: 'Bagubad',   wrong: 'Bofal',    correct: 'Batal' },
  { barangay: 'Mimbunga',  wrong: 'Elizolde', correct: 'Elizalde' },
  { barangay: 'Odiongan',  wrong: 'Tabique',  correct: 'Tabigue' },
  { barangay: 'Libertad',  wrong: 'Tigbaw',   correct: 'Tigbao' },
  { barangay: 'Kibuging',  wrong: 'Ki-iwang', correct: 'Kiiwang' },
]

async function fixPurokNames() {
  let fixed = 0, notFound = 0

  for (const c of CORRECTIONS) {
    const barangay = await get('SELECT id FROM barangays WHERE name = ?', [c.barangay])
    if (!barangay) {
      console.log(`  ! Barangay "${c.barangay}" not found — skipped`)
      notFound++
      continue
    }
    const purok = await get('SELECT id FROM puroks WHERE barangay_id = ? AND name = ?', [barangay.id, c.wrong])
    if (!purok) {
      console.log(`  - ${c.barangay} / "${c.wrong}" not found (already fixed, or never existed) — skipped`)
      notFound++
      continue
    }
    await run('UPDATE puroks SET name = ? WHERE id = ?', [c.correct, purok.id])
    console.log(`  ✓ ${c.barangay}: "${c.wrong}" -> "${c.correct}"`)
    fixed++
  }

  console.log(`\nDone. ${fixed} renamed, ${notFound} skipped (not found or already correct).`)
  process.exit(0)
}

fixPurokNames().catch(err => { console.error(err); process.exit(1) })