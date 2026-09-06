import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup } from 'react-leaflet'
import { AlertTriangle, Home, Users, X } from 'lucide-react'
import { apiGet } from '../utils/api'

const CENTER = [8.8231, 125.1109]

function getCentroid(geojson) {
  if (!geojson) return null
  try {
    let rings = []
    if (geojson.type === 'Polygon') rings = [geojson.coordinates[0]]
    else if (geojson.type === 'MultiPolygon') rings = geojson.coordinates.map(poly => poly[0])
    else return null
    let sumLat = 0, sumLng = 0, count = 0
    rings.forEach(ring => ring.forEach(([lng, lat]) => { sumLat += lat; sumLng += lng; count++ }))
    return count === 0 ? null : [sumLat / count, sumLng / count]
  } catch { return null }
}

export default function RiskAssessmentDashboard({ currentUser }) {
  const [summary, setSummary] = useState([])
  const [barangays, setBarangays] = useState([])
  const [loading, setLoading] = useState(true)
  const [wakingUp, setWakingUp] = useState(false)
  const [error, setError] = useState('')

  // Drill-down: Total Households card -> household list -> that household's residents
  const [showHouseholds, setShowHouseholds] = useState(false)
  const [households, setHouseholds] = useState([])
  const [householdsLoading, setHouseholdsLoading] = useState(false)
  const [expandedHousehold, setExpandedHousehold] = useState(null)
  const [residents, setResidents] = useState([])
  const [residentsLoading, setResidentsLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    setWakingUp(false)
    Promise.all([
      apiGet('/risk-assessment/summary', { onColdStart: () => setWakingUp(true) }),
      apiGet('/barangays'),
    ])
      .then(([s, b]) => { setSummary(s); setBarangays(b) })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Barangay Officials only see their own barangay's data
  const visible = currentUser?.role === 'Barangay Official'
    ? summary.filter(s => s.barangay_name === currentUser.barangay)
    : summary

  const totals = visible.reduce((acc, s) => ({
    households: acc.households + (s.total_households || 0),
    atRiskHouseholds: acc.atRiskHouseholds + (s.at_risk_households || 0),
    population: acc.population + (s.total_population || 0),
    atRiskPopulation: acc.atRiskPopulation + (s.at_risk_population || 0),
  }), { households: 0, atRiskHouseholds: 0, population: 0, atRiskPopulation: 0 })

  // Map bubbles: one per barangay, positioned at its boundary centroid,
  // sized and colored by how many at-risk households it has — same idea as
  // the Johns Hopkins COVID dashboard's case-count bubbles.
  const bubbles = visible.map(s => {
    const b = barangays.find(x => x.id === s.barangay_id)
    const centroid = b ? getCentroid(JSON.parse(b.boundary_geojson || 'null')) : null
    return centroid ? { ...s, centroid } : null
  }).filter(Boolean)

  const maxAtRisk = Math.max(1, ...bubbles.map(b => b.at_risk_households))
  const bubbleRadius = (count) => count === 0 ? 5 : 8 + (count / maxAtRisk) * 22

  const openHouseholdList = () => {
    setShowHouseholds(true)
    setExpandedHousehold(null)
    setHouseholdsLoading(true)
    apiGet('/households').then(setHouseholds).catch(() => {}).finally(() => setHouseholdsLoading(false))
  }

  const openHouseholdResidents = (h) => {
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
          <p className="text-xs text-gray-400 mt-0.5">Bubble size shows how many households are at risk in that barangay.</p>
        </div>
        <div className="h-[420px]">
          <MapContainer center={CENTER} zoom={12} className="w-full h-full">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
            {bubbles.map(b => (
              <CircleMarker
                key={b.barangay_id}
                center={b.centroid}
                radius={bubbleRadius(b.at_risk_households)}
                pathOptions={{
                  color: b.at_risk_households > 0 ? '#dc2626' : '#16a34a',
                  fillColor: b.at_risk_households > 0 ? '#dc2626' : '#16a34a',
                  fillOpacity: 0.55,
                  weight: 1.5,
                }}
              >
                <Tooltip direction="top" offset={[0, -4]}>{b.barangay_name}</Tooltip>
                <Popup>
                  <strong>{b.barangay_name}</strong><br />
                  {b.at_risk_households} of {b.total_households} households at risk<br />
                  {b.at_risk_population} of {b.total_population} residents at risk
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>

      <p className="text-xs text-gray-400 italic">
        "At-risk" households/population are those located within puroks classified as High flood-risk, per the CDRRMO's existing CDRA (Climate and Disaster Risk Assessment) data.
      </p>

      {/* Total Households drill-down: list of registered households, each
          expandable to show that household's residents (family members). */}
      {showHouseholds && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Registered Households ({households.length})</h3>
              <button onClick={() => setShowHouseholds(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto flex-1">
              {householdsLoading ? (
                <p className="text-center text-gray-400 py-10">Loading households…</p>
              ) : households.length === 0 ? (
                <p className="text-center text-gray-400 py-10">No households registered yet.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {households.map(h => (
                    <div key={h.id}>
                      <button
                        type="button"
                        onClick={() => openHouseholdResidents(h)}
                        className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 text-left"
                      >
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{h.head_family}</p>
                          <p className="text-xs text-gray-400">{h.household_id} · {h.barangay_name || '—'} · {h.purok_name || '—'}</p>
                        </div>
                        <span className="text-xs text-primary-600">{expandedHousehold === h.id ? 'Hide family ▲' : 'View family ▼'}</span>
                      </button>
                      {expandedHousehold === h.id && (
                        <div className="bg-gray-50 px-5 py-3">
                          {residentsLoading ? (
                            <p className="text-xs text-gray-400">Loading family members…</p>
                          ) : residents.length === 0 ? (
                            <p className="text-xs text-gray-400">No family members recorded for this household yet.</p>
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
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}