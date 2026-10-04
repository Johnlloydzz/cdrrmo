// Frontend copy of the backend's geofence rule (backend/utils/householdRisk.js)
// for map colors computed in the browser: if CDRRMO drew a flood area for a
// barangay, only puroks INSIDE that violet shape can be at risk.

function pointInRing(lng, lat, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j]
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

// A purok's representative point: center of its drawn boundary, else its
// geocoded lat/lng, else null.
export function purokPoint(p) {
  if (p?.boundary_geojson) {
    try {
      const g = JSON.parse(p.boundary_geojson)
      const ring = g?.type === 'Polygon' ? g.coordinates?.[0] : g?.type === 'MultiPolygon' ? g.coordinates?.[0]?.[0] : null
      if (ring && ring.length > 2) {
        const pts = ring.slice(0, -1)
        return { lng: pts.reduce((s, q) => s + q[0], 0) / pts.length, lat: pts.reduce((s, q) => s + q[1], 0) / pts.length }
      }
    } catch { /* fall through */ }
  }
  if (p?.latitude != null && p?.longitude != null) return { lat: Number(p.latitude), lng: Number(p.longitude) }
  return null
}

// True if the purok is inside the barangay's drawn hazard area. No drawn
// area = the whole barangay counts (true). Unknown purok location = true
// (same as the backend).
export function purokInHazardArea(p, areaStr) {
  if (!areaStr) return true
  const pt = purokPoint(p)
  if (!pt || isNaN(pt.lat) || isNaN(pt.lng)) return true
  try {
    const area = JSON.parse(areaStr)
    if (area?.type !== 'Polygon' || !area.coordinates?.[0]) return true
    return pointInRing(pt.lng, pt.lat, area.coordinates[0])
  } catch { return true }
}