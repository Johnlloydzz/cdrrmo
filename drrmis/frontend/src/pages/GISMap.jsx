import { useState, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, GeoJSON, useMap } from 'react-leaflet'
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

const MARKERS = [
  { id: 1, type: 'Evacuation', label: 'Central Gym', lat: 8.8245, lng: 125.1120, color: '#22c55e' },
  { id: 2, type: 'Evacuation', label: 'Kioskos Elem School', lat: 8.8190, lng: 125.1060, color: '#22c55e' },
  { id: 3, type: 'Incident',   label: 'INC-001 Flood (Active)', lat: 8.8175, lng: 125.1045, color: '#ef4444' },
  { id: 4, type: 'Incident',   label: 'INC-002 Landslide (Resolved)', lat: 8.8260, lng: 125.1150, color: '#f59e0b' },
  { id: 5, type: 'Hazard',     label: 'Flood Zone - Kioskos', lat: 8.8180, lng: 125.1050, color: '#3b82f6', radius: 500 },
]

const LAYERS = [
  { id: 'street',    label: 'Street View',   url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' },
  { id: 'satellite', label: 'Satellite',     url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' },
  { id: 'terrain',   label: 'Terrain',       url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png' },
]

const OVERLAYS = ['Barangay Boundaries','Purok Boundaries','Roads','Rivers','Flood Zones','Landslide Zones','Evacuation Centers','Incident Locations','Household Locations']

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

export default function GISMap() {
  const [activeLayer, setActiveLayer] = useState('street')
  const [activeOverlays, setActiveOverlays] = useState(['Flood Zones','Evacuation Centers','Incident Locations'])
  const [search, setSearch] = useState('')
  const [barangays, setBarangays] = useState([])
  const [selectedBarangay, setSelectedBarangay] = useState(null)
  const [geojsonLayerRef, setGeojsonLayerRef] = useState(null)
  const [shareCopied, setShareCopied] = useState(false)

  useEffect(() => {
    apiGet('/barangays').then(setBarangays).catch(() => {})
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

  return (
    <div className="flex gap-4 h-[calc(100vh-140px)] min-h-96">
      {/* Left panel */}
      <div className="w-72 flex-shrink-0 space-y-3 overflow-y-auto">
        {/* Search */}
        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Search size={15} /> Search</h3>
          <input className="input text-sm" placeholder="Search barangay…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Barangay list — click to highlight boundary */}
        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Building2 size={15} /> Barangays</h3>
          <div className="space-y-0.5 max-h-56 overflow-y-auto">
            {filteredBarangays.map(b => (
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
            {filteredBarangays.length === 0 && (
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
            {[
              { color: '#ef4444', label: 'Active Incident' },
              { color: '#f59e0b', label: 'Resolved Incident' },
              { color: '#22c55e', label: 'Evacuation Center' },
              { color: '#3b82f6', label: 'Flood Zone' },
              { color: '#8b5cf6', label: 'Landslide Zone' },
              { color: '#dc2626', label: 'Selected Barangay Boundary' },
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
      <div className="flex-1 rounded-xl overflow-hidden shadow-sm border border-gray-200 relative">
        <MapContainer center={CENTER} zoom={13} className="w-full h-full" zoomControl={true}>
          <TileLayer
            key={activeLayer}
            url={layer.url}
            attribution='&copy; OpenStreetMap contributors'
          />

          {/* Selected barangay boundary outline */}
          {selectedGeojson && (
            <>
              <GeoJSON
                key={selectedBarangay.id}
                data={selectedGeojson}
                style={{ color: '#dc2626', weight: 3, fillColor: '#dc2626', fillOpacity: 0.15 }}
                ref={setGeojsonLayerRef}
              >
                <Popup>
                  <strong>{selectedBarangay.name}</strong><br />
                  {selectedBarangay.image_url && (
                    <img src={selectedBarangay.image_url} alt={selectedBarangay.name} style={{ width: '160px', borderRadius: '6px', marginTop: '4px' }} />
                  )}
                  {selectedBarangay.contact_number ? (
                    <a
                      href={`tel:${selectedBarangay.contact_number.replace(/\s+/g, '')}`}
                      style={{ display: 'block', marginTop: '6px', background: '#dc2626', color: 'white', textAlign: 'center', padding: '5px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}
                    >
                      📞 Call {selectedBarangay.contact_number}
                    </a>
                  ) : (
                    <div style={{ fontSize: '11px', color: '#d97706', marginTop: '4px' }}>No emergency contact on file.</div>
                  )}
                </Popup>
              </GeoJSON>
              <FlyToBoundary geojsonLayer={geojsonLayerRef} fallbackCenter={selectedBarangay?.centroid || geocodedCenter} />
            </>
          )}
          {!selectedGeojson && selectedBarangay && (selectedBarangay.centroid || geocodedCenter) && (
            <FlyToBoundary geojsonLayer={null} fallbackCenter={selectedBarangay.centroid || geocodedCenter} />
          )}

          {/* Fallback pin for the selected barangay when it has no boundary yet, using the geocoded location */}
          {selectedBarangay && !selectedBarangay.centroid && geocodedCenter && (
            <Marker position={geocodedCenter} icon={barangayIcon}>
              <Popup>
                <strong>{selectedBarangay.name}</strong>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>Approximate location (no boundary drawn yet)</div>
              </Popup>
            </Marker>
          )}

          {/* Barangay name pins — always visible, click to select + view photo */}
          {barangaysWithCentroid.filter(b => b.centroid).map(b => (
            <Marker
              key={`brgy-${b.id}`}
              position={b.centroid}
              icon={barangayIcon}
              eventHandlers={{ click: () => setSelectedBarangay(b) }}
            >
              <Popup>
                <strong>{b.name}</strong>
                {b.image_url && (
                  <div>
                    <img src={b.image_url} alt={b.name} style={{ width: '160px', borderRadius: '6px', marginTop: '4px' }} />
                  </div>
                )}
                {!b.image_url && <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>No photo uploaded yet.</div>}
                {b.contact_number ? (
                  <a
                    href={`tel:${b.contact_number.replace(/\s+/g, '')}`}
                    style={{ display: 'block', marginTop: '6px', background: '#dc2626', color: 'white', textAlign: 'center', padding: '5px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}
                  >
                    📞 Call {b.contact_number}
                  </a>
                ) : (
                  <div style={{ fontSize: '11px', color: '#d97706', marginTop: '4px' }}>No emergency contact on file.</div>
                )}
              </Popup>
            </Marker>
          ))}

          {/* Flood zone circle */}
          {activeOverlays.includes('Flood Zones') && MARKERS.filter(m => m.type === 'Hazard').map(m => (
            <Circle key={m.id} center={[m.lat, m.lng]} radius={m.radius} pathOptions={{ color: m.color, fillColor: m.color, fillOpacity: 0.2 }}>
              <Popup><strong>{m.label}</strong><br />Hazard Zone</Popup>
            </Circle>
          ))}

          {/* Incident markers */}
          {activeOverlays.includes('Incident Locations') && MARKERS.filter(m => m.type === 'Incident').map(m => (
            <Marker key={m.id} position={[m.lat, m.lng]}>
              <Popup><strong>{m.label}</strong></Popup>
            </Marker>
          ))}

          {/* Evacuation center markers */}
          {activeOverlays.includes('Evacuation Centers') && MARKERS.filter(m => m.type === 'Evacuation').map(m => (
            <Marker key={m.id} position={[m.lat, m.lng]}>
              <Popup><strong>{m.label}</strong><br />Evacuation Center</Popup>
            </Marker>
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
          <div className="absolute top-3 right-3 z-[400] w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
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
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${(selectedBarangay.centroid || geocodedCenter)[0]},${(selectedBarangay.centroid || geocodedCenter)[1]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                    title="Get directions"
                  >
                    <Route size={16} />
                    Directions
                  </a>
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