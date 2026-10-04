// Household geofencing — ONE place that decides whether a household is in a
// high flood-risk (or landslide-risk) zone. Used by /api/households and by
// the Risk Assessment Dashboard summary, so the cards, the map and the lists
// always show the same result.

const { get } = require('../db/database')
const { expireStaleFloodData } = require('../db/floodLevel')

// Ray-casting point-in-polygon on a GeoJSON ring ([lng, lat] pairs).
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
function purokPoint(boundaryStr, lat, lng) {
  if (boundaryStr) {
    try {
      const g = JSON.parse(boundaryStr)
      const ring = g?.type === 'Polygon' ? g.coordinates?.[0] : g?.type === 'MultiPolygon' ? g.coordinates?.[0]?.[0] : null
      if (ring && ring.length > 2) {
        const pts = ring.slice(0, -1)
        return { lng: pts.reduce((s, p) => s + p[0], 0) / pts.length, lat: pts.reduce((s, p) => s + p[1], 0) / pts.length }
      }
    } catch { /* fall through */ }
  }
  if (lat != null && lng != null) return { lat: Number(lat), lng: Number(lng) }
  return null
}

// True if the household's purok point is inside the barangay's drawn hazard area.
// No drawn area = the whole barangay carries its classification (true).
// A household without coordinates can't be checked, so it keeps the
// barangay/purok-level result (true).
function insideHazardArea(h, areaStr) {
  if (!areaStr) return true
  const lat = parseFloat(h.latitude), lng = parseFloat(h.longitude)
  if (isNaN(lat) || isNaN(lng)) return true
  try {
    const area = JSON.parse(areaStr)
    if (area?.type !== 'Polygon' || !area.coordinates?.[0]) return true
    return pointInRing(lng, lat, area.coordinates[0])
  } catch { return true }
}

// Flood rule: water at 0.86 m or more (practically 1 m) floods EVERY purok
// in a flood-prone area (red); 0.85 m and below, no purok is at risk yet
// (blue). One fixed line for the whole city — a purok's own threshold is
// not used. Change this one number (and the same one in the frontend's
// utils/geofence.js) to move the line.
const RED_LEVEL_M = 0.86
function effectiveThreshold() {
  return RED_LEVEL_M
}

// Current flood situation, in priority order:
//  1. A flood level reported by CDRRMO (Flood Simulation Control) — real,
//     citywide, compared with each purok's own flood threshold.
//  2. Live auto-detect's flagged barangays — treated as a 1 m flood there.
//  3. Otherwise the official CDRA purok classification (flood_risk = High).
async function loadRiskContext() {
  await expireStaleFloodData()
  const [levelRow, sourceRow, autoRow] = await Promise.all([
    get('SELECT value FROM system_settings WHERE key = ?', ['current_flood_level_m']),
    get('SELECT value FROM system_settings WHERE key = ?', ['current_flood_level_source']),
    get('SELECT value FROM system_settings WHERE key = ?', ['auto_flooded_barangay_ids']),
  ])
  const floodLevel = levelRow ? parseFloat(levelRow.value) : 0
  const manualActive = (sourceRow?.value || 'manual') === 'manual' && floodLevel > 0
  let autoBarangayIds = []
  try { autoBarangayIds = autoRow ? JSON.parse(autoRow.value) : [] } catch { autoBarangayIds = [] }
  return { floodLevel, manualActive, autoBarangayIds }
}

// Adds in_flood_risk_zone / in_landslide_risk_zone (+ purok_lat/lng) to
// household rows. Rows must include: barangay_flood_susceptibility,
// barangay_flood_area, barangay_landslide_area, flood_threshold_m,
// purok_flood_risk, purok_landslide_risk, purok_point_lat, purok_point_lng,
// purok_boundary, barangay_id. Helper fields are stripped from the result.
//
// Rules:
//  - A barangay classified LOW flood susceptibility is never high flood risk.
//  - If CDRRMO drew a flood/landslide area for the barangay, only puroks
//    INSIDE that shape (the violet part of the map) can be at risk — the
//    rest of the barangay is Low. The purok's point is the center of its
//    drawn boundary, or its geocoded location.
function withHouseholdRisk(rows, ctx) {
  const { floodLevel, manualActive, autoBarangayIds } = ctx
  return rows.map(({ barangay_flood_area, barangay_landslide_area, purok_point_lat, purok_point_lng, purok_boundary, latitude, longitude, ...raw }) => {
    const pt = purokPoint(purok_boundary, purok_point_lat, purok_point_lng)
    const h = { ...raw, purok_lat: pt?.lat ?? null, purok_lng: pt?.lng ?? null }
    const loc = { latitude: h.purok_lat, longitude: h.purok_lng }
    return {
      ...h,
      in_flood_risk_zone: (h.barangay_flood_susceptibility || 'Low') !== 'Low' && insideHazardArea(loc, barangay_flood_area) && (manualActive
        ? floodLevel >= effectiveThreshold(h.flood_threshold_m)
        : autoBarangayIds.includes(h.barangay_id)
          ? RED_LEVEL_M >= effectiveThreshold(h.flood_threshold_m)
          : h.purok_flood_risk === 'High'),
      // Landslide has no measured value like flood depth — always the static
      // official CDRA classification.
      in_landslide_risk_zone: h.purok_landslide_risk === 'High' && insideHazardArea(loc, barangay_landslide_area),
    }
  })
}

// The columns withHouseholdRisk() needs, for any households query
// (FROM households h LEFT JOIN barangays b ... LEFT JOIN puroks p ...).
const RISK_COLUMNS = `b.flood_susceptibility as barangay_flood_susceptibility, b.flood_area_geojson as barangay_flood_area,
  b.landslide_area_geojson as barangay_landslide_area, p.flood_risk as purok_flood_risk, p.flood_threshold_m,
  p.landslide_risk as purok_landslide_risk, p.latitude as purok_point_lat, p.longitude as purok_point_lng,
  p.boundary_geojson as purok_boundary`

module.exports = { loadRiskContext, withHouseholdRisk, RISK_COLUMNS, purokPoint, insideHazardArea, effectiveThreshold, RED_LEVEL_M }