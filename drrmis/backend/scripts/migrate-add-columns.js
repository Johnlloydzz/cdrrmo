// scripts/migrate-add-columns.js
//
// SAFE, NON-DESTRUCTIVE migration for existing production databases created
// before later schema additions (barangay_id, boundary_geojson, resident_id,
// timestamps, etc.). This does NOT touch, modify, or delete any existing row
// — it only checks each table's actual columns (via PRAGMA table_info) and
// adds whichever ones are missing, with a safe nullable definition.
//
// Run once from drrmis/backend: node scripts/migrate-add-columns.js
//
// This does NOT call initDb() / seedBarangays() / seedDefaultAdmin() —
// it only touches table structure, never inserts or overwrites rows.

const { getDb } = require('../db/database')

// Expected columns per table, with a safe ALTER-compatible definition.
// (No NOT NULL / UNIQUE here — those constraints can't be safely retrofitted
// onto a table that may already have rows; existing app code already relies
// on schema.js for fresh installs, this script only patches old ones.)
const EXPECTED_COLUMNS = {
  users: {
    name: `TEXT`,
    email: `TEXT`,
    barangay_id: `INTEGER REFERENCES barangays(id)`,
    status: `TEXT DEFAULT 'Active'`,
    last_login: `TEXT`,
    created_at: `TEXT`,
    updated_at: `TEXT`,
  },
  barangays: {
    risk_level: `TEXT DEFAULT 'Low'`,
    flood_susceptibility: `TEXT DEFAULT 'Low'`,
    landslide_susceptibility: `TEXT DEFAULT 'Low'`,
    population: `INTEGER DEFAULT 0`,
    boundary_geojson: `TEXT`,
    created_at: `TEXT`,
    updated_at: `TEXT`,
  },
  puroks: {
    flood_risk: `TEXT DEFAULT 'Low'`,
    flood_threshold_m: `REAL DEFAULT 1.0`,
    landslide_risk: `TEXT DEFAULT 'Low'`,
    created_at: `TEXT`,
  },
  households: {
    household_id: `TEXT`,
    purok_id: `INTEGER REFERENCES puroks(id)`,
    latitude: `REAL`,
    longitude: `REAL`,
    contact: `TEXT`,
    created_at: `TEXT`,
    updated_at: `TEXT`,
  },
  residents: {
    resident_id: `TEXT`,
    age_bracket: `TEXT`,
    relation_to_head: `TEXT`,
    created_at: `TEXT`,
  },
}

function getColumns(db, table) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${table})`, [], (err, rows) => {
      if (err) reject(err)
      else resolve(rows.map(r => r.name))
    })
  })
}

function runSql(db, sql) {
  return new Promise((resolve, reject) => {
    db.run(sql, [], function (err) {
      if (err) reject(err)
      else resolve()
    })
  })
}

async function migrate() {
  const db = getDb()
  let addedCount = 0

  for (const [table, columns] of Object.entries(EXPECTED_COLUMNS)) {
    let existing
    try {
      existing = await getColumns(db, table)
    } catch (err) {
      console.log(`  ! Table "${table}" not found — skipping (run initDb first if this table should exist)`)
      continue
    }

    for (const [colName, colDef] of Object.entries(columns)) {
      if (existing.includes(colName)) continue
      const sql = `ALTER TABLE ${table} ADD COLUMN ${colName} ${colDef}`
      try {
        await runSql(db, sql)
        console.log(`  + Added ${table}.${colName}`)
        addedCount++
      } catch (err) {
        console.log(`  ! Failed to add ${table}.${colName}: ${err.message}`)
      }
    }
  }

  console.log(`\nMigration complete. ${addedCount} column(s) added. No existing rows were modified or deleted.`)
  process.exit(0)
}

migrate().catch(err => { console.error(err); process.exit(1) })