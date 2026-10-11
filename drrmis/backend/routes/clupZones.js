// CLUP Landslide & Flood Susceptibility Map — editable colored areas shown
// in GIS Map → Map Layers → "CLUP Landslide & Flood Map".
// Everyone signed in can view; only CDRRMO Personnel can change them.
// Display only: these areas do not change flood alerts or geofencing.
const router = require('express').Router()
const { all, get, run, seedClupZones } = require('../db/database')
const { authenticate } = require('../middleware/auth')

const HAZARDS = ['HL', 'ML', 'LL', 'HF', 'LF']

router.use(authenticate)

function onlyCdrrmo(req, res, next) {
  if (req.user.role !== 'CDRRMO Personnel') return res.status(403).json({ error: 'Only CDRRMO Personnel can edit the CLUP map.' })
  next()
}

// A simple polygon: one ring of 3+ [lng, lat] points inside the Gingoog area.
function cleanPolygon(g) {
  const ring = g?.type === 'Polygon' && Array.isArray(g.coordinates) ? g.coordinates[0] : null
  if (!Array.isArray(ring) || ring.length < 4 || ring.length > 20000) return null
  const pts = []
  for (const p of ring) {
    const lng = Number(p?.[0]), lat = Number(p?.[1])
    if (!Number.isFinite(lng) || !Number.isFinite(lat) || lng < 124.5 || lng > 125.7 || lat < 8.3 || lat > 9.2) return null
    pts.push([Math.round(lng * 1e6) / 1e6, Math.round(lat * 1e6) / 1e6])
  }
  const f = pts[0], l = pts[pts.length - 1]
  if (f[0] !== l[0] || f[1] !== l[1]) pts.push([f[0], f[1]])
  return { type: 'Polygon', coordinates: [pts] }
}

const toRow = r => ({ id: r.id, hazard: r.hazard, geojson: JSON.parse(r.geojson), sort_order: r.sort_order, updated_at: r.updated_at })

router.get('/', async (_req, res) => {
  try {
    const rows = await all('SELECT id, hazard, geojson, sort_order, updated_at FROM clup_zones ORDER BY sort_order, id')
    res.json(rows.map(toRow))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// New area — drawn on top of the others.
router.post('/', onlyCdrrmo, async (req, res) => {
  try {
    const { hazard } = req.body
    const geojson = cleanPolygon(req.body.geojson)
    if (!HAZARDS.includes(hazard)) return res.status(400).json({ error: 'Invalid color.' })
    if (!geojson) return res.status(400).json({ error: 'The area needs at least 3 points.' })
    const top = await get('SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM clup_zones')
    const r = await run('INSERT INTO clup_zones (hazard, geojson, sort_order) VALUES (?, ?, ?)', [hazard, JSON.stringify(geojson), top.n])
    res.status(201).json(toRow(await get('SELECT * FROM clup_zones WHERE id = ?', [r.lastID])))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Change an area's color and/or shape.
router.put('/:id', onlyCdrrmo, async (req, res) => {
  try {
    const row = await get('SELECT * FROM clup_zones WHERE id = ?', [req.params.id])
    if (!row) return res.status(404).json({ error: 'Area not found.' })
    const hazard = req.body.hazard ?? row.hazard
    if (!HAZARDS.includes(hazard)) return res.status(400).json({ error: 'Invalid color.' })
    let geo = row.geojson
    if (req.body.geojson !== undefined) {
      const g = cleanPolygon(req.body.geojson)
      if (!g) return res.status(400).json({ error: 'The area needs at least 3 points.' })
      geo = JSON.stringify(g)
    }
    await run("UPDATE clup_zones SET hazard = ?, geojson = ?, updated_at = datetime('now', '+8 hours') WHERE id = ?", [hazard, geo, row.id])
    res.json(toRow(await get('SELECT * FROM clup_zones WHERE id = ?', [row.id])))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/:id', onlyCdrrmo, async (req, res) => {
  try {
    const r = await run('DELETE FROM clup_zones WHERE id = ?', [req.params.id])
    if (!r.changes) return res.status(404).json({ error: 'Area not found.' })
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Put back the original areas traced from the CLUP map (removes all edits).
router.post('/reset', onlyCdrrmo, async (_req, res) => {
  try {
    await seedClupZones(true)
    const rows = await all('SELECT id, hazard, geojson, sort_order, updated_at FROM clup_zones ORDER BY sort_order, id')
    res.json(rows.map(toRow))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router