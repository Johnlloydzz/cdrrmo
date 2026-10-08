// scripts/copy-database.js
//
// Copies EVERYTHING from one Turso database to another: every table, its
// rows, and its indexes. Use it when moving the system to a new Turso
// account (for example, handing it over to the CDRRMO's own account).
//
// The old database is only READ; nothing in it is changed or deleted.
// The new database must be EMPTY (freshly created). The script stops if it
// already has tables, so it can never overwrite real data by accident.
//
// Usage (PowerShell, from drrmis/backend), one line at a time:
//   $env:OLD_DB_URL="libsql://old-database-url"
//   $env:OLD_DB_TOKEN="old-token"
//   $env:NEW_DB_URL="libsql://new-database-url"
//   $env:NEW_DB_TOKEN="new-token"
//   node scripts/copy-database.js
//
// At the end it prints the row count of every table in both databases so
// you can confirm they match.

const { createClient } = require('@libsql/client')

const BATCH = 200 // rows per insert batch

function need(name) {
  const v = process.env[name]
  if (!v) { console.error(`Missing ${name}. Set it first, e.g.  $env:${name}="..."`); process.exit(1) }
  return v
}

const q = name => `"${name.replace(/"/g, '""')}"`

async function tablesOf(db) {
  const r = await db.execute(
    `SELECT name, sql FROM sqlite_master
     WHERE type = 'table' AND sql IS NOT NULL
       AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'libsql_%' AND name NOT LIKE '_litestream%'
     ORDER BY name`)
  return r.rows.map(row => ({ name: row.name, sql: row.sql }))
}

// Parents before children, so foreign keys always point at rows that exist.
async function sortByForeignKeys(db, tables) {
  const names = new Set(tables.map(t => t.name))
  const deps = new Map()
  for (const t of tables) {
    const fk = await db.execute(`PRAGMA foreign_key_list(${q(t.name)})`)
    deps.set(t.name, new Set(fk.rows.map(r => r.table).filter(p => names.has(p) && p !== t.name)))
  }
  const out = [], done = new Set()
  while (out.length < tables.length) {
    const ready = tables.filter(t => !done.has(t.name) && [...deps.get(t.name)].every(d => done.has(d)))
    const next = ready.length ? ready : tables.filter(t => !done.has(t.name)) // cycle: just continue
    for (const t of next) { out.push(t); done.add(t.name) }
  }
  return out
}

async function count(db, table) {
  const r = await db.execute(`SELECT COUNT(*) AS n FROM ${q(table)}`)
  return Number(r.rows[0].n)
}

async function main() {
  const oldDb = createClient({ url: need('OLD_DB_URL'), authToken: need('OLD_DB_TOKEN') })
  const newDb = createClient({ url: need('NEW_DB_URL'), authToken: need('NEW_DB_TOKEN') })

  if (process.env.OLD_DB_URL === process.env.NEW_DB_URL) {
    console.error('OLD_DB_URL and NEW_DB_URL are the same database. Stopping.'); process.exit(1)
  }

  const existing = await tablesOf(newDb)
  if (existing.length) {
    console.error(`The new database already has ${existing.length} table(s): ${existing.map(t => t.name).join(', ')}`)
    console.error('Create a fresh, empty database and try again. Nothing was changed.')
    process.exit(1)
  }

  const tables = await sortByForeignKeys(oldDb, await tablesOf(oldDb))
  console.log(`Copying ${tables.length} tables...`)

  // 1) Tables (same CREATE statements as the old database).
  for (const t of tables) await newDb.execute(t.sql)

  // 2) Rows, in batches, ordered by rowid so ids stay exactly the same.
  for (const t of tables) {
    const cols = (await oldDb.execute(`PRAGMA table_info(${q(t.name)})`)).rows.map(r => r.name)
    const insert = `INSERT INTO ${q(t.name)} (${cols.map(q).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`
    const total = await count(oldDb, t.name)
    let copied = 0
    let lastRowid = null
    let withoutRowid = false
    while (true) {
      let res
      if (!withoutRowid) {
        try {
          res = await oldDb.execute({
            sql: `SELECT rowid AS __rowid, ${cols.map(q).join(', ')} FROM ${q(t.name)}
                  ${lastRowid === null ? '' : 'WHERE rowid > ?'} ORDER BY rowid LIMIT ${BATCH}`,
            args: lastRowid === null ? [] : [lastRowid],
          })
        } catch {
          withoutRowid = true // WITHOUT ROWID table: fall back to OFFSET paging
        }
      }
      if (withoutRowid) {
        res = await oldDb.execute(`SELECT ${cols.map(q).join(', ')} FROM ${q(t.name)} LIMIT ${BATCH} OFFSET ${copied}`)
      }
      if (!res.rows.length) break
      await newDb.batch(res.rows.map(row => ({ sql: insert, args: cols.map(c => row[c] ?? null) })), 'write')
      copied += res.rows.length
      if (!withoutRowid) lastRowid = res.rows[res.rows.length - 1].__rowid
      process.stdout.write(`\r  ${t.name.padEnd(28)} ${copied.toLocaleString()} / ${total.toLocaleString()}`)
      if (res.rows.length < BATCH) break
    }
    process.stdout.write(`\r  ${t.name.padEnd(28)} ${copied.toLocaleString()} / ${total.toLocaleString()}\n`)
  }

  // 3) Indexes and triggers.
  const extras = await oldDb.execute(
    `SELECT sql FROM sqlite_master
     WHERE type IN ('index', 'trigger') AND sql IS NOT NULL
       AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'libsql_%'`)
  for (const row of extras.rows) await newDb.execute(row.sql)
  console.log(`Created ${extras.rows.length} indexes/triggers.`)

  // 4) Check: same number of rows in every table.
  console.log('\nTable                         old        new')
  let ok = true
  for (const t of tables) {
    const [a, b] = await Promise.all([count(oldDb, t.name), count(newDb, t.name)])
    if (a !== b) ok = false
    console.log(`${t.name.padEnd(28)} ${String(a).padStart(7)} ${String(b).padStart(10)}  ${a === b ? 'OK' : 'MISMATCH'}`)
  }
  console.log(ok ? '\nDONE: every table matches. ✅' : '\nSome tables do not match. ❌ Do not switch yet.')
  process.exit(ok ? 0 : 1)
}

main().catch(err => { console.error('\nFailed:', err.message); process.exit(1) })