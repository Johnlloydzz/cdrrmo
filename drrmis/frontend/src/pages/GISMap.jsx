import { useState, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, GeoJSON, Polyline, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Layers, Search, MapPin, Navigation, Building2, Phone, Share2, Route } from 'lucide-react'
import { apiGet } from '../utils/api'
import { SkeletonList } from '../components/Skeleton'

// Fix Leaflet default icons in Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom pin icon for barangay markers (distinct from evacuation/incident pins)
const barangayIcon = new L.DivIcon({
  className: 'barangay-pin',
  html: `<div style="background:#1d4ed8;width:14px;height:14px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 14],
  popupAnchor: [0, -14],
})

// Gingoog City center coordinates
const CENTER = [8.8231, 125.1109]

// CDRRMO Gingoog City office — confirmed exact coordinates.
const CDRRMO_OFFICE = [8.828643971706757, 125.09931555101235]

const cdrrmoIcon = new L.DivIcon({
  className: 'cdrrmo-office-pin',
  html: `<div style="background:#059669;width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 18],
  popupAnchor: [0, -18],
})

// Straight-line distance in km between two [lat, lng] points (haversine formula)
function distanceKm([lat1, lng1], [lat2, lng2]) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const LAYERS = [
  { id: 'street',    label: 'Street View',   url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' },
  { id: 'satellite', label: 'Satellite',     url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' },
  { id: 'terrain',   label: 'Terrain',       url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png' },
]

// Free, public, no-API-key overlay tiles (Esri's ArcGIS Online reference
// layers, commonly used this way in Leaflet projects) for the "Roads" and
// "Rivers" Map Layers toggles — real data, not placeholders.
const ROADS_OVERLAY_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}'
const RIVERS_OVERLAY_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Hydro_Reference_Overlay/MapServer/tile/{z}/{y}/{x}'

const OVERLAYS = ['Barangay Boundaries','Purok Boundaries','Roads','Rivers','Flood Zones','Landslide Zones','Household Locations']

// Official CDRA (Climate and Disaster Risk Assessment) susceptibility colors,
// matching the City of Gingoog CLUP Landslide and Flood Susceptibility Map.
const LANDSLIDE_COLOR = { High: '#dc2626', Moderate: '#15803d', Low: '#eab308' }
const FLOOD_COLOR = { High: '#7c3aed', Low: '#d6c9a8' }

// Approximate centroid (average of vertices) for a Polygon or MultiPolygon.
// Used to place a barangay pin and as a fly-to fallback when no boundary is loaded yet.
function getCentroid(geojson) {
  if (!geojson) return null
  try {
    let rings = []
    if (geojson.type === 'Polygon') {
      rings = [geojson.coordinates[0]]
    } else if (geojson.type === 'MultiPolygon') {
      rings = geojson.coordinates.map(poly => poly[0])
    } else {
      return null
    }
    let sumLat = 0, sumLng = 0, count = 0
    rings.forEach(ring => {
      ring.forEach(([lng, lat]) => {
        sumLat += lat
        sumLng += lng
        count++
      })
    })
    if (count === 0) return null
    return [sumLat / count, sumLng / count]
  } catch {
    return null
  }
}

// Leaflet computes its size once at mount, which can be wrong in a flexbox
// layout before the browser finishes settling the flex sizing — a
// ResizeObserver on the container catches that (and any later resize) and
// tells Leaflet to recalculate, so the map never needs an actual window
// resize (e.g. pressing F11) to display correctly.
function MapResizeHandler() {
  const map = useMap()
  useEffect(() => {
    const container = map.getContainer()
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(container)
    // Belt-and-suspenders: catches cases where the flex layout hadn't
    // fully settled when Leaflet first measured its container, without
    // needing an actual window resize (like pressing F11) to fix itself.
    const raf = requestAnimationFrame(() => map.invalidateSize())
    const timers = [100, 300, 600].map(ms => setTimeout(() => map.invalidateSize(), ms))
    return () => {
      observer.disconnect()
      cancelAnimationFrame(raf)
      timers.forEach(clearTimeout)
    }
  }, [map])
  return null
}

// Helper component: pans/zooms the map to fit the selected barangay's boundary
// (fallbackCenter is optional — used to fly to a centroid point when there's no boundary polygon)
function FlyToBoundary({ geojsonLayer, fallbackCenter }) {
  const map = useMap()
  useEffect(() => {
    map.invalidateSize()
    if (geojsonLayer) {
      const bounds = geojsonLayer.getBounds()
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [30, 30] })
        return
      }
    }
    if (fallbackCenter) {
      map.flyTo(fallbackCenter, 15, { duration: 0.8 })
    }
  }, [geojsonLayer, fallbackCenter, map])
  return null
}

// Zooms/pans the map to fit the whole CDRRMO-office-to-barangay route whenever
// `trigger` changes (used by the "Directions" button in the info panel).
function FocusRoute({ trigger, coords }) {
  const map = useMap()
  useEffect(() => {
    if (trigger === 0 || !coords || coords.length < 2) return
    map.fitBounds(L.latLngBounds(coords), { padding: [50, 50] })
  }, [trigger]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

export default function GISMap() {
  const [activeLayer, setActiveLayer] = useState('street')
  const [hazardLayer, setHazardLayer] = useState('landslide') // 'landslide' | 'flood' | 'none'
  const [activeOverlays, setActiveOverlays] = useState(['Landslide Zones','Household Locations','Purok Boundaries'])
  const [search, setSearch] = useState('')
  const [barangays, setBarangays] = useState([])
  const [households, setHouseholds] = useState([])
  const [barangaysLoading, setBarangaysLoading] = useState(true)
  const [wakingUp, setWakingUp] = useState(false)
  const [selectedBarangay, setSelectedBarangay] = useState(null)
  const [showPurokList, setShowPurokList] = useState(false)
  const [geojsonLayerRef, setGeojsonLayerRef] = useState(null)
  const [shareCopied, setShareCopied] = useState(false)

  useEffect(() => {
    setShowPurokList(false)
  }, [selectedBarangay?.id])

  useEffect(() => {
    setBarangaysLoading(true)
    apiGet('/barangays', { onColdStart: () => setWakingUp(true) }).then(setBarangays).catch(() => {}).finally(() => setBarangaysLoading(false))
    apiGet('/households').then(setHouseholds).catch(() => {})
  }, [])

  // "Flood Zones" and "Landslide Zones" drive the same underlying hazard
  // choropleth (a barangay can only be filled with one hazard's color at a
  // time), so checking one automatically unchecks the other — checking
  // both together isn't a state the map can actually render.
  const toggleOverlay = (o) => {
    if (o === 'Flood Zones' || o === 'Landslide Zones') {
      const turningOn = !activeOverlays.includes(o)
      setHazardLayer(turningOn ? (o === 'Flood Zones' ? 'flood' : 'landslide') : 'none')
      setActiveOverlays(prev => {
        const other = o === 'Flood Zones' ? 'Landslide Zones' : 'Flood Zones'
        const withoutBoth = prev.filter(x => x !== 'Flood Zones' && x !== 'Landslide Zones')
        return turningOn ? [...withoutBoth, o] : withoutBoth
      })
      return
    }
    setActiveOverlays(prev => prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o])
  }

  const layer = LAYERS.find(l => l.id === activeLayer)

  // Pre-compute centroid for every barangay that has boundary data (for pins + fly-to fallback)
  const barangaysWithCentroid = useMemo(() => {
    return barangays.map(b => {
      if (!b.boundary_geojson) return { ...b, centroid: null }
      try {
        return { ...b, centroid: getCentroid(JSON.parse(b.boundary_geojson)) }
      } catch {
        return { ...b, centroid: null }
      }
    })
  }, [barangays])

  const filteredBarangays = barangaysWithCentroid.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase())
  )

  // Purok label position: prefer the purok's own geocoded location (from
  // scripts/geocode-puroks.js) when available. If a purok wasn't found by
  // the geocoder (many sitios are too hyper-local for OpenStreetMap), fall
  // back to averaging the lat/lng of that purok's registered households —
  // a purok with neither has no label to show yet.
  const purokLabelPositions = useMemo(() => {
    if (!selectedBarangay) return []
    const byPurok = {}
    for (const h of households) {
      if (!h.purok_id || !h.latitude || !h.longitude) continue
      if (!byPurok[h.purok_id]) byPurok[h.purok_id] = { sumLat: 0, sumLng: 0, count: 0, name: h.purok_name }
      byPurok[h.purok_id].sumLat += Number(h.latitude)
      byPurok[h.purok_id].sumLng += Number(h.longitude)
      byPurok[h.purok_id].count += 1
    }
    const centroids = new Map()
    for (const [purokId, v] of Object.entries(byPurok)) {
      centroids.set(Number(purokId), { name: v.name, lat: v.sumLat / v.count, lng: v.sumLng / v.count })
    }

    const positions = []
    for (const p of (selectedBarangay.puroks || [])) {
      if (p.latitude && p.longitude) {
        positions.push({ purokId: p.id, name: p.name, lat: p.latitude, lng: p.longitude })
      } else if (centroids.has(p.id)) {
        positions.push({ purokId: p.id, ...centroids.get(p.id) })
      }
    }
    return positions
  }, [households, selectedBarangay])

  // Auto-select + fly to the barangay once the search narrows down to a single match
  useEffect(() => {
    if (search.trim().length > 0 && filteredBarangays.length === 1) {
      setSelectedBarangay(filteredBarangays[0])
    }
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedGeojson = (() => {
    if (!selectedBarangay?.boundary_geojson) return null
    try {
      return JSON.parse(selectedBarangay.boundary_geojson)
    } catch {
      return null
    }
  })()

  // When a selected barangay has no boundary (and so no centroid), look up its
  // approximate location via OpenStreetMap Nominatim so we can still fly the map there.
  const [geocodedCenter, setGeocodedCenter] = useState(null)
  const [geocoding, setGeocoding] = useState(false)

  useEffect(() => {
    setShowRoute(false)
  }, [selectedBarangay])

  useEffect(() => {
    setGeocodedCenter(null)
    if (!selectedBarangay || selectedBarangay.centroid) return

    let cancelled = false
    setGeocoding(true)
    const query = encodeURIComponent(`${selectedBarangay.name}, Gingoog City, Misamis Oriental, Philippines`)
    fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`)
      .then(res => res.json())
      .then(results => {
        if (cancelled || !results?.[0]) return
        setGeocodedCenter([parseFloat(results[0].lat), parseFloat(results[0].lon)])
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setGeocoding(false) })

    return () => { cancelled = true }
  }, [selectedBarangay])

  // Real road-following route from the CDRRMO office to the selected barangay's
  // location, fetched from OSRM (free, no API key). Falls back to a straight line
  // if the routing service is unreachable or finds no drivable path.
  const [routeCoords, setRouteCoords] = useState(null)
  const [routeInfo, setRouteInfo] = useState(null) // { distanceKm, durationMin }
  const [routing, setRouting] = useState(false)
  const [focusRoute, setFocusRoute] = useState(0)
  const [showRoute, setShowRoute] = useState(false)

  const destination = selectedBarangay?.centroid || geocodedCenter

  useEffect(() => {
    setRouteCoords(null)
    setRouteInfo(null)
    if (!destination) return

    let cancelled = false
    setRouting(true)
    const url = `https://router.project-osrm.org/route/v1/driving/${CDRRMO_OFFICE[1]},${CDRRMO_OFFICE[0]};${destination[1]},${destination[0]}?overview=full&geometries=geojson`
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return
        const route = data?.routes?.[0]
        if (!route) return
        setRouteCoords(route.geometry.coordinates.map(([lng, lat]) => [lat, lng]))
        setRouteInfo({ distanceKm: route.distance / 1000, durationMin: route.duration / 60 })
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setRouting(false) })

    return () => { cancelled = true }
  }, [destination])

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:h-[calc(100vh-140px)] lg:min-h-96">
      {/* Left panel */}
      <div className="w-full lg:w-72 lg:flex-shrink-0 space-y-3 lg:overflow-y-auto order-2 lg:order-2">
        {/* Search */}
        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Search size={15} /> Search</h3>
          <input className="input text-sm" placeholder="Search barangay…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Barangay list — click to highlight boundary */}
        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Building2 size={15} /> Barangays</h3>
          <div className="space-y-0.5 max-h-56 overflow-y-auto">
            {barangaysLoading && (
              <>
                {wakingUp && <p className="text-xs text-gray-400 pb-2">Waking up the server… (up to a minute)</p>}
                <SkeletonList rows={6} />
              </>
            )}
            {!barangaysLoading && filteredBarangays.map(b => (
              <button
                key={b.id}
                onClick={() => setSelectedBarangay(b)}
                className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                  selectedBarangay?.id === b.id ? 'bg-primary-100 text-primary-700 font-medium' : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                {b.name}
                {!b.boundary_geojson && <span className="text-xs text-gray-400 ml-1">(no boundary)</span>}
              </button>
            ))}
            {!barangaysLoading && filteredBarangays.length === 0 && (
              <p className="text-xs text-gray-400 py-2">No barangays found.</p>
            )}
          </div>
        </div>

        {/* Selected barangay info */}
        {selectedBarangay && (
          <div className="card p-4">
            <h3 className="font-semibold text-sm mb-2">{selectedBarangay.name}</h3>
            {selectedBarangay.image_url && (
              <img
                src={selectedBarangay.image_url}
                alt={selectedBarangay.name}
                className="w-full h-32 object-cover rounded-lg mb-2 border border-gray-200"
                onError={e => e.target.style.display = 'none'}
              />
            )}
            <p className="text-xs text-gray-500">Captain: {selectedBarangay.captain_name || '—'}</p>
            <p className="text-xs text-gray-500">Population: {(selectedBarangay.resident_count || 0).toLocaleString()}</p>
            <p className="text-xs text-gray-500">Risk level: {selectedBarangay.risk_level}</p>
            <div className="grid grid-cols-3 gap-2 mt-2 mb-1">
              <button
                type="button"
                onClick={() => setShowPurokList(v => !v)}
                disabled={!selectedBarangay.purok_count}
                className="bg-primary-50 hover:bg-primary-100 rounded-lg py-2 text-center disabled:cursor-default disabled:hover:bg-primary-50"
              >
                <p className="text-lg font-bold text-primary-700">{selectedBarangay.purok_count ?? 0}</p>
                <p className="text-[10px] text-gray-500 uppercase">Puroks {selectedBarangay.purok_count > 0 && (showPurokList ? '▲' : '▼')}</p>
              </button>
              <div className="bg-primary-50 rounded-lg py-2 text-center">
                <p className="text-lg font-bold text-primary-700">{selectedBarangay.household_count ?? 0}</p>
                <p className="text-[10px] text-gray-500 uppercase">Households</p>
              </div>
              <div className="bg-primary-50 rounded-lg py-2 text-center">
                <p className="text-lg font-bold text-primary-700">{selectedBarangay.resident_count ?? 0}</p>
                <p className="text-[10px] text-gray-500 uppercase">Residents</p>
              </div>
            </div>
            {showPurokList && selectedBarangay.puroks?.length > 0 && (
              <div className="mb-2 max-h-40 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
                {selectedBarangay.puroks.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-2 py-1.5 text-xs">
                    <span className="text-gray-700">{p.name}</span>
                    <span className={
                      p.flood_risk === 'High' ? 'text-red-600 font-medium' :
                      p.flood_risk === 'Moderate' ? 'text-amber-600 font-medium' :
                      'text-green-600 font-medium'
                    }>{p.flood_risk}</span>
                  </div>
                ))}
              </div>
            )}
            {selectedBarangay.contact_number ? (
              <a
                href={`tel:${selectedBarangay.contact_number.replace(/\s+/g, '')}`}
                className="mt-2 flex items-center justify-center gap-2 w-full bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
              >
                📞 Call {selectedBarangay.contact_number}
              </a>
            ) : (
              <p className="text-xs text-amber-600 mt-2">No emergency contact number on file.</p>
            )}
            {(selectedBarangay.centroid || geocodedCenter) && (
              <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                <span className="w-2 h-0.5 bg-emerald-600 inline-block flex-shrink-0" />
                {routing && !routeInfo && 'Calculating route…'}
                {routeInfo && `${routeInfo.distanceKm.toFixed(1)} km · ~${Math.round(routeInfo.durationMin)} min drive from CDRRMO Office`}
                {!routing && !routeInfo && `~${distanceKm(CDRRMO_OFFICE, selectedBarangay.centroid || geocodedCenter).toFixed(1)} km from CDRRMO Office (straight line)`}
              </p>
            )}
            <div className="flex items-center gap-2 mt-3">
              <a
                href={selectedBarangay.contact_number ? `tel:${selectedBarangay.contact_number.replace(/\s+/g, '')}` : undefined}
                className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                  selectedBarangay.contact_number
                    ? 'bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer'
                    : 'bg-gray-50 text-gray-300 pointer-events-none'
                }`}
                title={selectedBarangay.contact_number ? `Call ${selectedBarangay.contact_number}` : 'No contact number on file'}
              >
                <Phone size={16} />
                Call
              </a>
              {(selectedBarangay.centroid || geocodedCenter) ? (
                <button
                  type="button"
                  onClick={() => { setShowRoute(true); setFocusRoute(f => f + 1) }}
                  className="flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                  title="Show route on map"
                >
                  <Route size={16} />
                  Directions
                </button>
              ) : (
                <div className="flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-xs font-medium bg-gray-50 text-gray-300">
                  <Route size={16} />
                  Directions
                </div>
              )}
              <button
                onClick={() => {
                  const text = `${selectedBarangay.name} — Gingoog City${selectedBarangay.contact_number ? `\nContact: ${selectedBarangay.contact_number}` : ''}`
                  navigator.clipboard?.writeText(text)
                  setShareCopied(true)
                  setTimeout(() => setShareCopied(false), 1500)
                }}
                className="flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-xs font-medium bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                title="Copy barangay info"
              >
                <Share2 size={16} />
                {shareCopied ? 'Copied!' : 'Share'}
              </button>
            </div>
            {!selectedBarangay.boundary_geojson && (
              <p className="text-xs text-amber-600 mt-2">No boundary data uploaded for this barangay yet.</p>
            )}
            {!selectedBarangay.centroid && geocoding && (
              <p className="text-xs text-gray-400 mt-1">Locating on map…</p>
            )}
            {!selectedBarangay.centroid && !geocoding && !geocodedCenter && (
              <p className="text-xs text-gray-400 mt-1">Location not found on the map.</p>
            )}
          </div>
        )}

        {/* Base layers */}
        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Layers size={15} /> Base Layer</h3>
          <div className="space-y-1">
            {LAYERS.map(l => (
              <label key={l.id} className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-gray-50">
                <input type="radio" name="layer" value={l.id} checked={activeLayer === l.id} onChange={() => setActiveLayer(l.id)} className="text-primary-600" />
                <span className="text-sm">{l.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Overlays */}
        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><MapPin size={15} /> Map Layers</h3>
          <div className="space-y-1">
            {OVERLAYS.map(o => (
              <label key={o} className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-gray-50">
                <input type="checkbox" checked={activeOverlays.includes(o)} onChange={() => toggleOverlay(o)} className="rounded text-primary-600" />
                <span className="text-sm">{o}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-3">Legend</h3>
          <div className="space-y-2">
            {hazardLayer === 'landslide' && [
              { color: LANDSLIDE_COLOR.High, label: 'High Susceptibility to Landslide' },
              { color: LANDSLIDE_COLOR.Moderate, label: 'Moderate Susceptibility to Landslide' },
              { color: LANDSLIDE_COLOR.Low, label: 'Low Susceptibility to Landslide' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: l.color }} />
                {l.label}
              </div>
            ))}
            {hazardLayer === 'flood' && [
              { color: FLOOD_COLOR.High, label: 'High Susceptibility of Flooding' },
              { color: FLOOD_COLOR.Low, label: 'Low Susceptibility of Flooding' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: l.color }} />
                {l.label}
              </div>
            ))}
            <div className="border-t border-gray-100 my-2" />
            {[
              { color: '#dc2626', label: 'Household — High Flood-Risk Zone (Geofenced)' },
              { color: '#3b82f6', label: 'Household — Outside High-Risk Zone' },
              { color: '#0ea5e9', label: 'Selected Barangay Boundary' },
              { color: '#059669', label: 'CDRRMO Office / Driving Route' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="h-[70vh] lg:h-auto lg:flex-1 rounded-xl overflow-hidden shadow-sm border border-gray-200 relative order-1 lg:order-1">
        <MapContainer center={CENTER} zoom={13} className="w-full h-full" zoomControl={true}>
          <MapResizeHandler />
          <TileLayer
            key={activeLayer}
            url={layer.url}
            attribution={layer.attribution || '&copy; OpenStreetMap contributors'}
          />

          {/* Roads / Rivers reference overlays — free public Esri tiles, no
              API key. Always mounted with opacity 0/1 (rather than
              mounted/unmounted) so the CSS transition in index.css fades
              them in/out smoothly instead of popping. */}
          <TileLayer url={ROADS_OVERLAY_URL} opacity={activeOverlays.includes('Roads') ? 0.9 : 0} zIndex={5} />
          <TileLayer url={RIVERS_OVERLAY_URL} opacity={activeOverlays.includes('Rivers') ? 0.9 : 0} zIndex={5} />

          {/* Barangay Boundaries — plain outline, no fill, independent of
              whichever hazard choropleth (or none) is currently showing, so
              boundaries stay visible even with hazard layers off. */}
          {activeOverlays.includes('Barangay Boundaries') && barangaysWithCentroid.filter(b => b.boundary_geojson).map(b => {
            let geo
            try { geo = JSON.parse(b.boundary_geojson) } catch { return null }
            return (
              <GeoJSON
                key={`outline-${b.id}`}
                data={geo}
                style={{ color: '#334155', weight: 1.5, fillOpacity: 0, opacity: 0.8 }}
                eventHandlers={{ click: () => setSelectedBarangay(b) }}
              />
            )
          })}

          {/* CDRA Hazard Susceptibility choropleth — all barangays, colored to match the official CDRA maps */}
          {hazardLayer !== 'none' && barangaysWithCentroid.filter(b => b.boundary_geojson).map(b => {
            let geo
            try { geo = JSON.parse(b.boundary_geojson) } catch { return null }
            const color = hazardLayer === 'landslide'
              ? (LANDSLIDE_COLOR[b.landslide_susceptibility] || LANDSLIDE_COLOR.Low)
              : (FLOOD_COLOR[b.flood_susceptibility] || FLOOD_COLOR.Low)
            return (
              <GeoJSON
                key={`hz-${hazardLayer}-${b.id}`}
                data={geo}
                style={{ color: '#555', weight: 0.5, fillColor: color, fillOpacity: 0.55 }}
                eventHandlers={{ click: () => setSelectedBarangay(b) }}
              />
            )
          })}

          {/* Selected barangay boundary outline */}
          {selectedGeojson && (
            <>
              <GeoJSON
                key={selectedBarangay.id}
                data={selectedGeojson}
                style={{ color: '#0ea5e9', weight: 3, fillColor: '#0ea5e9', fillOpacity: 0.1 }}
                ref={setGeojsonLayerRef}
              />
              <FlyToBoundary geojsonLayer={geojsonLayerRef} fallbackCenter={selectedBarangay?.centroid || geocodedCenter} />
            </>
          )}
          {!selectedGeojson && selectedBarangay && (selectedBarangay.centroid || geocodedCenter) && (
            <FlyToBoundary geojsonLayer={null} fallbackCenter={selectedBarangay.centroid || geocodedCenter} />
          )}

          {/* Fallback pin for the selected barangay when it has no boundary yet, using the geocoded location */}
          {selectedBarangay && !selectedBarangay.centroid && geocodedCenter && (
            <Marker position={geocodedCenter} icon={barangayIcon} />
          )}

          {/* CDRRMO Office — always visible reference point */}
          <Marker position={CDRRMO_OFFICE} icon={cdrrmoIcon}>
            <Popup><strong>CDRRMO Office</strong><br />Gingoog City</Popup>
          </Marker>

          {/* Route from CDRRMO office to the selected barangay's location — only after clicking Directions */}
          {selectedBarangay && destination && showRoute && (
            <>
              <Polyline
                positions={routeCoords || [CDRRMO_OFFICE, destination]}
                pathOptions={
                  routeCoords
                    ? { color: '#059669', weight: 4, opacity: 0.85 }
                    : { color: '#059669', weight: 3, dashArray: '8, 8' }
                }
              />
              <FocusRoute trigger={focusRoute} coords={routeCoords || [CDRRMO_OFFICE, destination]} />
            </>
          )}

          {/* Barangay name pins — always visible, click to select (details show in the right-side panel) */}
          {barangaysWithCentroid.filter(b => b.centroid).map(b => (
            <Marker
              key={`brgy-${b.id}`}
              position={b.centroid}
              icon={barangayIcon}
              eventHandlers={{ click: () => setSelectedBarangay(b) }}
            />
          ))}

          {/* Purok boundaries — real drawn polygons where a Barangay Official
              has traced one; falls back to just a name label (at the
              average location of that purok's registered households) for
              puroks that don't have a boundary on file yet. */}
          {activeOverlays.includes('Purok Boundaries') && barangaysWithCentroid.flatMap(b => (b.puroks || [])
            .filter(p => p.boundary_geojson)
            .map(p => {
              let geo
              try { geo = JSON.parse(p.boundary_geojson) } catch { return null }
              return (
                <GeoJSON
                  key={`purok-boundary-${p.id}`}
                  data={geo}
                  style={{ color: '#2563eb', weight: 1.5, fillColor: '#2563eb', fillOpacity: 0.08, dashArray: '4, 3' }}
                />
              )
            })
          )}
          {activeOverlays.includes('Purok Boundaries') && purokLabelPositions.map(p => (
            <Marker
              key={`purok-label-${p.purokId}`}
              position={[p.lat, p.lng]}
              icon={L.divIcon({
                className: '',
                html: `<div style="font-size:11px;font-weight:700;color:#57534e;text-shadow:0 1px 2px rgba(255,255,255,0.9),0 -1px 2px rgba(255,255,255,0.9);white-space:nowrap;pointer-events:none">${p.name.toUpperCase()}</div>`,
                iconSize: [0, 0],
              })}
            />
          ))}

          {/* Household locations — colored by geofencing risk status (red = within high flood-risk purok) */}
          {activeOverlays.includes('Household Locations') && households.filter(h => h.latitude && h.longitude).map(h => (
            <Circle
              key={`hh-${h.id}`}
              center={[h.latitude, h.longitude]}
              radius={15}
              pathOptions={{
                color: h.in_flood_risk_zone ? '#dc2626' : '#3b82f6',
                fillColor: h.in_flood_risk_zone ? '#dc2626' : '#3b82f6',
                fillOpacity: 0.7,
              }}
            >
              <Popup>
                <strong>{h.household_id}</strong> — {h.head_family}<br />
                {h.in_flood_risk_zone ? '⚠️ Within high flood-risk zone (geofenced)' : 'Outside high-risk zone'}
              </Popup>
            </Circle>
          ))}
        </MapContainer>

        {/* Map toolbar overlay */}
        <div className="absolute bottom-3 right-3 z-[400] flex flex-col gap-2">
          <button className="bg-white shadow rounded-lg p-2 hover:bg-gray-50" title="My Location">
            <Navigation size={16} className="text-gray-600" />
          </button>
        </div>

      </div>
    </div>
  )
}