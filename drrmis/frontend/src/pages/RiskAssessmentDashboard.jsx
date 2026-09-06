import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, GeoJSON, Circle, Tooltip, Popup, useMap } from 'react-leaflet'
import { AlertTriangle, Home, Users, X, MapPin } from 'lucide-react'
import { apiGet } from '../utils/api'

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

export default function RiskAssessmentDashboard({ currentUser }) {
  const [summary, setSummary] = useState([])
  const [barangays, setBarangays] = useState([])
  const [households, setHouseholds] = useState([])
  const [loading, setLoading] = useState(true)
  const [wakingUp, setWakingUp] = useState(false)
  const [error, setError] = useState('')

  // Drill-down: Total Households card -> household list -> that household's residents
  const [showHouseholds, setShowHouseholds] = useState(false)
  const [householdsLoading, setHouseholdsLoading] = useState(false)
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
  const visibleHouseholds = currentUser?.role === 'Barangay Official'
    ? households.filter(h => h.barangay_name === currentUser.barangay)
    : households

  const totals = visible.reduce((acc, s) => ({
    households: acc.households + (s.total_households || 0),
    atRiskHouseholds: acc.atRiskHouseholds + (s.at_risk_households || 0),
    population: acc.population + (s.total_population || 0),
    atRiskPopulation: acc.atRiskPopulation + (s.at_risk_population || 0),
  }), { households: 0, atRiskHouseholds: 0, population: 0, atRiskPopulation: 0 })

  const atRiskByBarangay = Object.fromEntries(visible.map(s => [s.barangay_id, s.at_risk_households]))

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

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-sm">City-Wide Risk Map</h3>
          <p className="text-xs text-gray-400 mt-0.5">Red barangays have at least one at-risk household. Click a household in the list below to fly to its location.</p>
        </div>
        <div className="h-[420px]">
          <MapContainer center={CENTER} zoom={12} className="w-full h-full">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
            <FlyToHandler target={flyTarget} />

            {barangays.filter(b => visibleBarangayIds.has(b.id) && b.boundary_geojson).map(b => {
              let geo
              try { geo = JSON.parse(b.boundary_geojson) } catch { return null }
              const atRisk = atRiskByBarangay[b.id] > 0
              const color = atRisk ? '#dc2626' : '#16a34a'
              return (
                <GeoJSON key={b.id} data={geo} pathOptions={{ color, weight: 1.5, fillColor: color, fillOpacity: atRisk ? 0.28 : 0.12 }}>
                  <Tooltip sticky>{b.name} — {atRiskByBarangay[b.id] || 0} at-risk household{atRiskByBarangay[b.id] === 1 ? '' : 's'}</Tooltip>
                </GeoJSON>
              )
            })}

            {visibleHouseholds.filter(h => h.latitude && h.longitude).map(h => (
              <Circle
                key={h.id}
                center={[h.latitude, h.longitude]}
                radius={15}
                pathOptions={{ color: h.in_flood_risk_zone ? '#dc2626' : '#3b82f6', fillColor: h.in_flood_risk_zone ? '#dc2626' : '#3b82f6', fillOpacity: 0.7 }}
              >
                <Popup><strong>{h.household_id}</strong> — {h.head_family}<br />{h.in_flood_risk_zone ? '⚠️ Within high flood-risk zone' : 'Outside high-risk zone'}</Popup>
              </Circle>
            ))}
          </MapContainer>
        </div>
      </div>

      <p className="text-xs text-gray-400 italic">
        "At-risk" households/population are those located within puroks classified as High flood-risk, per the CDRRMO's existing CDRA (Climate and Disaster Risk Assessment) data.
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