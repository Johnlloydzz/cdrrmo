import { useState, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, GeoJSON, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Layers, Search, MapPin, Navigation, Building2, Phone, Share2, Route } from 'lucide-react'
import { apiGet } from '../utils/api'

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

const MARKERS = [
  { id: 5, type: 'Hazard', label: 'Flood Susceptibility Zone - San Juan', lat: 8.8180, lng: 125.1050, color: '#3b82f6', radius: 500 },
]

const LAYERS = [
  { id: 'modern',    label: 'Modern',        url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; OpenStreetMap contributors' },
  { id: 'street',    label: 'Street View',   url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' },
  { id: 'satellite', label: 'Satellite',     url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' },
  { id: 'terrain',   label: 'Terrain',       url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png' },
]

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

// Helper component: pans/zooms the map to fit the selected barangay's boundary
// (fallbackCenter is optional — used to fly to a centroid point when there's no boundary polygon)
function FlyToBoundary({ geojsonLayer, fallbackCenter }) {
  const map = useMap()
  useEffect(() => {
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
  const [activeLayer, setActiveLayer] = useState('modern')
  const [hazardLayer, setHazardLayer] = useState('landslide') // 'landslide' | 'flood' | 'none'
  const [activeOverlays, setActiveOverlays] = useState(['Flood Zones','Household Locations'])
  const [search, setSearch] = useState('')
  const [barangays, setBarangays] = useState([])
  const [households, setHouseholds] = useState([])
  const [barangaysLoading, setBarangaysLoading] = useState(true)
  const [wakingUp, setWakingUp] = useState(false)
  const [selectedBarangay, setSelectedBarangay] = useState(null)
  const [geojsonLayerRef, setGeojsonLayerRef] = useState(null)
  const [shareCopied, setShareCopied] = useState(false)

  useEffect(() => {
    setBarangaysLoading(true)
    apiGet('/barangays', { onColdStart: () => setWakingUp(true) }).then(setBarangays).catch(() => {}).finally(() => setBarangaysLoading(false))
    apiGet('/households').then(setHouseholds).catch(() => {})
  }, [])

  const toggleOverlay = (o) => setActiveOverlays(prev => prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o])

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
      <div className="w-full lg:w-72 lg:flex-shrink-0 space-y-3 lg:overflow-y-auto order-2 lg:order-1">
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
              <p className="text-xs text-gray-400 py-2 flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-primary-400 border-t-transparent rounded-full animate-spin inline-block" />
                {wakingUp ? 'Waking up the server… (up to a minute)' : 'Connecting to server…'}
              </p>
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
            <p className="text-xs text-gray-500">Captain: {selectedBarangay.captain || '—'}</p>
            <p className="text-xs text-gray-500">Population: {(selectedBarangay.population || 0).toLocaleString()}</p>
            <p className="text-xs text-gray-500">Risk level: {selectedBarangay.risk_level}</p>
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

        {/* CDRA Hazard Susceptibility Layer — matches the official CDRA maps */}
        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><MapPin size={15} /> Hazard Susceptibility (CDRA)</h3>
          <div className="space-y-1">
            {[
              { id: 'landslide', label: 'Landslide Susceptibility' },
              { id: 'flood',     label: 'Flood Susceptibility' },
              { id: 'none',      label: 'None' },
            ].map(o => (
              <label key={o.id} className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-gray-50">
                <input type="radio" name="hazardLayer" value={o.id} checked={hazardLayer === o.id} onChange={() => setHazardLayer(o.id)} className="text-primary-600" />
                <span className="text-sm">{o.label}</span>
              </label>
            ))}
          </div>
        </div>

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
      <div className="h-[70vh] lg:h-auto lg:flex-1 rounded-xl overflow-hidden shadow-sm border border-gray-200 relative order-1 lg:order-2">
        <MapContainer center={CENTER} zoom={13} className="w-full h-full" zoomControl={true}>
          <TileLayer
            key={activeLayer}
            url={layer.url}
            attribution={layer.attribution || '&copy; OpenStreetMap contributors'}
          />

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

          {/* Flood zone circle */}
          {activeOverlays.includes('Flood Zones') && MARKERS.filter(m => m.type === 'Hazard').map(m => (
            <Circle key={m.id} center={[m.lat, m.lng]} radius={m.radius} pathOptions={{ color: m.color, fillColor: m.color, fillOpacity: 0.2 }}>
              <Popup><strong>{m.label}</strong><br />Hazard Zone</Popup>
            </Circle>
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

        {/* Right-side barangay info panel — styled like a Google Maps place card */}
        {selectedBarangay && (
          <div className="absolute top-3 right-3 left-3 sm:left-auto z-[400] w-auto sm:w-80 max-w-full bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="relative">
              {selectedBarangay.image_url ? (
                <img
                  src={selectedBarangay.image_url}
                  alt={selectedBarangay.name}
                  className="w-full h-40 object-cover"
                  onError={e => e.target.style.display = 'none'}
                />
              ) :null}
              <button
                onClick={() => setSelectedBarangay(null)}
                className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full w-7 h-7 flex items-center justify-center shadow text-gray-600 text-sm"
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-4">
              <h3 className="font-semibold text-base text-gray-900">{selectedBarangay.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Risk level: <span className="font-medium">{selectedBarangay.risk_level}</span>
                {' · '}Pop. {(selectedBarangay.population || 0).toLocaleString()}
              </p>
              {(selectedBarangay.centroid || geocodedCenter) && (
                <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                  <span className="w-2 h-0.5 bg-emerald-600 inline-block" />
                  {routing && !routeInfo && 'Calculating route…'}
                  {routeInfo && `${routeInfo.distanceKm.toFixed(1)} km · ~${Math.round(routeInfo.durationMin)} min drive from CDRRMO Office`}
                  {!routing && !routeInfo && `~${distanceKm(CDRRMO_OFFICE, selectedBarangay.centroid || geocodedCenter).toFixed(1)} km from CDRRMO Office (straight line — no road route found)`}
                </p>
              )}

              {/* Google-style icon action row */}
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

              {/* Details */}
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                <p className="text-xs text-gray-500">Captain: <span className="text-gray-700">{selectedBarangay.captain || '—'}</span></p>
                <p className="text-xs text-gray-500">
                  Emergency contact: <span className="text-gray-700">{selectedBarangay.contact_number || 'Not on file'}</span>
                </p>
                {!selectedBarangay.boundary_geojson && (
                  <p className="text-xs text-amber-600 pt-1">No boundary data uploaded for this barangay yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}