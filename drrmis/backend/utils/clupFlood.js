// Turns the CLUP map's "High Susceptibility of Flooding" (violet) areas into
// each barangay's Flood area — so GIS Map → Flood Zones, the Dashboard, Flood
// Simulation Control and the flood geofencing all use exactly the CLUP water.
//
// The CLUP areas are drawn biggest first, smaller ones on top. So the violet
// that is really visible = each violet area minus the areas drawn on top of
// it. That visible violet is cut by each barangay's boundary; the biggest
// piece becomes the barangay's flood area (one shape, editable as usual).
const pc = require('polygon-clipping')

const KM2_PER_DEG2 = 111.32 * 0.988 * 110.57 // near Gingoog (lat ~8.8°)
const MIN_KM2 = 0.005                         // ignore slivers smaller than ~70 m × 70 m

// GeoJSON Polygon/MultiPolygon → polygon-clipping MultiPolygon
function toMulti(g) {
  if (!g) return null
  if (g.type === 'Feature') g = g.geometry
  if (g.type === 'Polygon') return [g.coordinates]
  if (g.type === 'MultiPolygon') return g.coordinates
  return null
}

function ringArea(r) {
  let a = 0
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1])
  return Math.abs(a / 2)
}

function bbox(multi) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const poly of multi) for (const [x, y] of poly[0]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  return [x0, y0, x1, y1]
}
const overlap = (a, b) => a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3]

// Douglas–Peucker, so the area has a reasonable number of draggable points.
function simplify(pts, tol) {
  if (pts.length < 4) return pts
  const keep = new Array(pts.length).fill(false)
  keep[0] = keep[pts.length - 1] = true
  const stack = [[0, pts.length - 1]]
  while (stack.length) {
    const [s, e] = stack.pop()
    const [ax, ay] = pts[s], [bx, by] = pts[e]
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1e-12
    let best = -1, bi = -1
    for (let i = s + 1; i < e; i++) {
      const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / len
      if (d > best) { best = d; bi = i }
    }
    if (best > tol) { keep[bi] = true; stack.push([s, bi], [bi, e]) }
  }
  return pts.filter((_, i) => keep[i])
}

// zones: [{hazard, geojson(object)}] in drawing order. barangays: [{id, boundary_geojson(string)}]
// Returns Map(barangay id → GeoJSON Polygon string) for barangays that have CLUP violet.
function clupFloodAreas(zones, barangays) {
  const items = zones.map(z => ({ hazard: z.hazard, multi: toMulti(z.geojson) })).filter(z => z.multi)
  items.forEach(z => { z.box = bbox(z.multi) })
  const visible = []
  items.forEach((z, i) => {
    if (z.hazard !== 'HF') return
    const above = items.slice(i + 1).filter(o => overlap(o.box, z.box)).map(o => o.multi)
    const v = above.length ? pc.difference(z.multi, ...above) : z.multi
    if (v.length) visible.push(v)
  })
  const result = new Map()
  if (!visible.length) return result
  const violet = visible.length > 1 ? pc.union(...visible) : visible[0]
  const vBox = bbox(violet)
  for (const b of barangays) {
    let geo
    try { geo = toMulti(JSON.parse(b.boundary_geojson)) } catch { continue }
    if (!geo || !overlap(bbox(geo), vBox)) continue
    const inter = pc.intersection(geo, violet)
    let best = null, bestA = 0
    for (const poly of inter) { const a = ringArea(poly[0]); if (a > bestA) { bestA = a; best = poly[0] } }
    if (!best || bestA * KM2_PER_DEG2 < MIN_KM2) continue
    let ring = simplify(best.slice(0, -1), 0.00008).map(([x, y]) => [Math.round(x * 1e6) / 1e6, Math.round(y * 1e6) / 1e6])
    if (ring.length < 3) continue
    ring.push(ring[0])
    result.set(Number(b.id), JSON.stringify({ type: 'Polygon', coordinates: [ring] }))
  }
  return result
}

module.exports = { clupFloodAreas }