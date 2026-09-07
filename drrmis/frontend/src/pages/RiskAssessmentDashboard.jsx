import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, GeoJSON, Marker, Tooltip, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { AlertTriangle, Home, Users, X, MapPin, Search, Building2, ShieldAlert } from 'lucide-react'
import { apiGet } from '../utils/api'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Red pin for households within a high flood-risk (geofenced) zone
const redPinIcon = new L.DivIcon({
  className: 'household-pin',
  html: `<div style="background:#dc2626;width:16px;height:16px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 16],
  popupAnchor: [0, -16],
})
// Blue pin for households outside the high-risk zone
const bluePinIcon = new L.DivIcon({
  className: 'household-pin',
  html: `<div style="background:#3b82f6;width:16px;height:16px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 16],
  popupAnchor: [0, -16],
})

const CENTER = [8.8231, 125.1109]

// Re-centers/zooms the map whenever `target` changes — used so clicking a
// household in the drill-down list flies the map to that household's spot.
function FlyToHandler({ target }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo(target, 17, { duration: 1 })
  }, [target, map])
  return null
}

// Fits the map to the selected barangay's boundary — same click-to-zoom
// behavior as the Hazard Map & Geofencing page.
function FitToBoundary({ geojsonLayer }) {
  const map = useMap()
  useEffect(() => {
    if (!geojsonLayer) return
    const bounds = geojsonLayer.getBounds()
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30] })
  }, [geojsonLayer, map])
  return null
}

export default function RiskAssessmentDashboard({ currentUser }) {
  const [summary, setSummary] = useState([])
  const [barangays, setBarangays] = useState([])
  const [households, setHouseholds] = useState([])
  const [loading, setLoading] = useState(true)
  const [wakingUp, setWakingUp] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedBarangay, setSelectedBarangay] = useState(null)
  const [selectedGeojsonLayer, setSelectedGeojsonLayer] = useState(null)

  // Drill-down: Total Households card -> household list -> that household's residents
  const [showHouseholds, setShowHouseholds] = useState(false)
  const [expandedHousehold, setExpandedHousehold] = useState(null)
  const [residents, setResidents] = useState([])
  const [residentsLoading, setResidentsLoading] = useState(false)
  const [flyTarget, setFlyTarget] = useState(null)

  useEffect(() => {
    setLoading(true)
    setWakingUp(false)
    Promise.all([
      apiGet('/risk-assessment/summary', { onColdStart: () => setWakingUp(true) }),
      apiGet('/barangays'),
      apiGet('/households'),
    ])
      .then(([s, b, h]) => { setSummary(s); setBarangays(b); setHouseholds(h) })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Barangay Officials only see their own barangay's data
  const visible = currentUser?.role === 'Barangay Official'
    ? summary.filter(s => s.barangay_name === currentUser.barangay)
    : summary
  const visibleBarangayIds = new Set(visible.map(s => s.barangay_id))
  const visibleBarangays = barangays.filter(b => visibleBarangayIds.has(b.id))
  const visibleHouseholds = currentUser?.role === 'Barangay Official'
    ? households.filter(h => h.barangay_name === currentUser.barangay)
    : households

  const totals = visible.reduce((acc, s) => ({
    households: acc.households + (s.total_households || 0),
    atRiskHouseholds: acc.atRiskHouseholds + (s.at_risk_households || 0),
    population: acc.population + (s.total_population || 0),
    atRiskPopulation: acc.atRiskPopulation + (s.at_risk_population || 0),
  }), { households: 0, atRiskHouseholds: 0, population: 0, atRiskPopulation: 0 })

  const atRiskByBarangay = Object.fromEntries(visible.map(s => [s.barangay_id, s]))

  const filteredBarangays = visibleBarangays.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))

  const selectedGeojson = (() => {
    if (!selectedBarangay?.boundary_geojson) return null
    try { return JSON.parse(selectedBarangay.boundary_geojson) } catch { return null }
  })()
  const selectedStats = selectedBarangay ? atRiskByBarangay[selectedBarangay.id] : null
  const selectedHouseholds = selectedBarangay ? visibleHouseholds.filter(h => h.barangay_name === selectedBarangay.name) : []

  const openHouseholdList = () => {
    setShowHouseholds(true)
    setExpandedHousehold(null)
  }

  const flyToHousehold = (h) => {
    if (!h.latitude || !h.longitude) { alert('No location recorded for this household yet.'); return }
    setFlyTarget([h.latitude, h.longitude])
    setShowHouseholds(false)
  }

  const toggleFamily = (h) => {
    if (expandedHousehold === h.id) { setExpandedHousehold(null); return }
    setExpandedHousehold(h.id)
    setResidentsLoading(true)
    apiGet(`/residents?household_id=${h.id}`).then(setResidents).catch(() => {}).finally(() => setResidentsLoading(false))
  }

  if (loading) return (
    <div className="card p-10 text-center text-gray-400">
      {wakingUp ? (
        <>
          <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="font-medium text-gray-500">Waking up the server…</p>
          <p className="text-xs mt-1">This can take up to a minute after a period of inactivity. Thanks for your patience.</p>
        </>
      ) : 'Loading risk assessment data…'}
    </div>
  )
  if (error) return <div className="card p-10 text-center text-red-600">{error}</div>

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">Risk Assessment Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Projected households and population within high flood-risk zones, based on CDRA-aligned purok classification (geofencing).
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button type="button" onClick={openHouseholdList} className="card p-4 text-center hover:shadow-md hover:border-primary-300 border border-transparent transition-all cursor-pointer">
          <Home size={20} className="mx-auto mb-1 text-gray-400" />
          <p className="text-2xl font-bold text-gray-800">{totals.households.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Total Households</p>
        </button>
        <div className="card p-4 text-center">
          <AlertTriangle size={20} className="mx-auto mb-1 text-red-500" />
          <p className="text-2xl font-bold text-red-600">{totals.atRiskHouseholds.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Households in High-Risk Zones</p>
        </div>
        <div className="card p-4 text-center">
          <Users size={20} className="mx-auto mb-1 text-gray-400" />
          <p className="text-2xl font-bold text-gray-800">{totals.population.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Total Population</p>
        </div>
        <div className="card p-4 text-center">
          <AlertTriangle size={20} className="mx-auto mb-1 text-red-500" />
          <p className="text-2xl font-bold text-red-600">{totals.atRiskPopulation.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Population in High-Risk Zones</p>
        </div>
      </div>

      {/* Map section — same two-column layout as Hazard Map & Geofencing:
          barangay list on the left, click one to zoom to its boundary. */}
      <div className="flex flex-col lg:flex-row gap-4 lg:h-[560px]">
        <div className="w-full lg:w-64 lg:flex-shrink-0 space-y-3 lg:overflow-y-auto order-2 lg:order-1">
          <div className="card p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Search size={15} /> Search</h3>
            <input className="input text-sm" placeholder="Search barangay…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="card p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Building2 size={15} /> Barangays</h3>
            <div className="space-y-0.5 max-h-64 overflow-y-auto">
              {filteredBarangays.map(b => {
                const atRisk = (atRiskByBarangay[b.id]?.at_risk_households || 0) > 0
                return (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBarangay(b)}
                    className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors flex items-center justify-between ${
                      selectedBarangay?.id === b.id ? 'bg-primary-100 text-primary-700 font-medium' : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <span>{b.name}</span>
                    {atRisk && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />}
                  </button>
                )
              })}
              {filteredBarangays.length === 0 && <p className="text-xs text-gray-400 py-2">No barangays found.</p>}
            </div>
          </div>

          {selectedBarangay && selectedStats && (
            <div className="card p-4">
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2"><ShieldAlert size={15} /> {selectedBarangay.name}</h3>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="bg-gray-50 rounded-lg py-2 text-center">
                  <p className="text-lg font-bold text-gray-700">{selectedStats.total_households}</p>
                  <p className="text-[10px] text-gray-500 uppercase">Households</p>
                </div>
                <div className="bg-red-50 rounded-lg py-2 text-center">
                  <p className="text-lg font-bold text-red-600">{selectedStats.at_risk_households}</p>
                  <p className="text-[10px] text-gray-500 uppercase">At-Risk</p>
                </div>
                <div className="bg-gray-50 rounded-lg py-2 text-center">
                  <p className="text-lg font-bold text-gray-700">{selectedStats.total_population}</p>
                  <p className="text-[10px] text-gray-500 uppercase">Population</p>
                </div>
                <div className="bg-red-50 rounded-lg py-2 text-center">
                  <p className="text-lg font-bold text-red-600">{selectedStats.at_risk_population}</p>
                  <p className="text-[10px] text-gray-500 uppercase">At-Risk Pop.</p>
                </div>
              </div>
              {!selectedBarangay.boundary_geojson && (
                <p className="text-xs text-amber-600 mt-2">No boundary data uploaded for this barangay yet.</p>
              )}
            </div>
          )}
        </div>

        <div className="dashboard-map-container h-[70vh] lg:h-auto lg:flex-1 rounded-xl overflow-hidden shadow-sm border border-gray-200 relative order-1 lg:order-2">
          <MapContainer center={CENTER} zoom={12} className="w-full h-full">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
            <FlyToHandler target={flyTarget} />

            {/* All barangays — thin black outline only (no fill), so the map
                stays clean but boundaries are still faintly visible. The
                sidebar list's red dot shows which barangays are at-risk. */}
            {visibleBarangays.filter(b => b.boundary_geojson).map(b => {
              let geo
              try { geo = JSON.parse(b.boundary_geojson) } catch { return null }
              return (
                <GeoJSON
                  key={b.id}
                  data={geo}
                  pathOptions={{ color: '#000000', weight: 0.75, opacity: 0.4, fillColor: 'transparent', fillOpacity: 0 }}
                  eventHandlers={{ click: () => setSelectedBarangay(b) }}
                >
                  <Tooltip sticky>{b.name} — {atRiskByBarangay[b.id]?.at_risk_households || 0} at-risk household{atRiskByBarangay[b.id]?.at_risk_households === 1 ? '' : 's'}</Tooltip>
                </GeoJSON>
              )
            })}

            {/* Selected barangay — highlighted outline, same style as Hazard Map & Geofencing */}
            {selectedGeojson && (
              <>
                <GeoJSON
                  key={`selected-${selectedBarangay.id}`}
                  data={selectedGeojson}
                  pathOptions={{ color: '#0ea5e9', weight: 3, fillColor: '#0ea5e9', fillOpacity: 0.08 }}
                  ref={setSelectedGeojsonLayer}
                />
                <FitToBoundary geojsonLayer={selectedGeojsonLayer} />
              </>
            )}

            {/* Households — pin markers, colored by geofencing risk status */}
            {visibleHouseholds.filter(h => h.latitude && h.longitude).map(h => (
              <Marker
                key={h.id}
                position={[h.latitude, h.longitude]}
                icon={h.in_flood_risk_zone ? redPinIcon : bluePinIcon}
              >
                <Popup><strong>{h.household_id}</strong> — {h.head_family}<br />{h.in_flood_risk_zone ? '⚠️ Within high flood-risk zone (geofenced)' : 'Outside high-risk zone'}</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      <p className="text-xs text-gray-400 italic">
        "At-risk" households/population are those located within puroks classified as High flood-risk, per the CDRRMO's existing CDRA (Climate and Disaster Risk Assessment) data. Red dot in the barangay list = has at-risk households.
      </p>

      {/* Total Households drill-down — compact, fixed-height, scrollable list */}
      {showHouseholds && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: '22rem' }}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
              <h3 className="font-semibold text-gray-800 text-sm">Registered Households ({visibleHouseholds.length})</h3>
              <button onClick={() => setShowHouseholds(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto flex-1">
              {visibleHouseholds.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">No households registered yet.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {visibleHouseholds.map(h => (
                    <div key={h.id} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50">
                      <button type="button" onClick={() => flyToHousehold(h)} className="flex-1 flex items-center gap-2 text-left min-w-0" title="Fly to location on map">
                        <MapPin size={14} className="text-primary-500 flex-shrink-0" />
                        <span className="min-w-0">
                          <span className="block font-medium text-gray-800 text-sm truncate">{h.head_family}</span>
                          <span className="block text-xs text-gray-400 truncate">{h.household_id} · {h.barangay_name || '—'} · {h.purok_name || '—'}</span>
                        </span>
                      </button>
                      <button type="button" onClick={() => toggleFamily(h)} className="text-xs text-primary-600 flex-shrink-0 px-2 py-1 hover:bg-primary-50 rounded">
                        {expandedHousehold === h.id ? 'Hide ▲' : 'Family ▼'}
                      </button>
                    </div>
                  ))}
                  {expandedHousehold && (
                    <div className="bg-gray-50 px-4 py-3">
                      {residentsLoading ? (
                        <p className="text-xs text-gray-400">Loading family members…</p>
                      ) : residents.length === 0 ? (
                        <p className="text-xs text-gray-400">No family members recorded yet.</p>
                      ) : (
                        <table className="w-full text-xs">
                          <thead><tr className="text-gray-400"><th className="text-left font-medium py-1">Name</th><th className="text-left font-medium py-1">Relation</th><th className="text-left font-medium py-1">Birthdate</th></tr></thead>
                          <tbody>
                            {residents.map(r => (
                              <tr key={r.id} className="border-t border-gray-200">
                                <td className="py-1.5 text-gray-700">{r.name}</td>
                                <td className="py-1.5 text-gray-500">{r.relation_to_head}</td>
                                <td className="py-1.5 text-gray-500">{r.birthdate}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}