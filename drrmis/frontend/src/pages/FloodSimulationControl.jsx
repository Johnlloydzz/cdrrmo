import { useState, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, GeoJSON, Marker, Tooltip, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Waves, Mountain, AlertTriangle, Search, Building2, ExternalLink } from 'lucide-react'
import { apiGet, apiPut } from '../utils/api'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const CENTER = [8.8231, 125.1109]

const barangayIcon = new L.DivIcon({
  className: 'barangay-pin',
  html: `<div style="background:#1d4ed8;width:14px;height:14px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`,
  iconSize: [14, 14], iconAnchor: [7, 14], popupAnchor: [0, -14],
})
const pinIcon = (color) => new L.DivIcon({
  className: '',
  html: `<div style="background:${color};width:16px;height:16px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`,
  iconSize: [16, 16], iconAnchor: [8, 16], popupAnchor: [0, -16],
})
const redPin = pinIcon('#dc2626')
const bluePin = pinIcon('#3b82f6')

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

function FlyToBarangay({ target }) {
  const map = useMap()
  useEffect(() => { if (target) map.flyTo(target, 15, { duration: 0.8 }) }, [target, map])
  return null
}

export default function FloodSimulationControl() {
  const [hazard, setHazard] = useState('flood') // 'flood' | 'landslide'

  const [floodLevel, setFloodLevel] = useState(0)
  const [input, setInput] = useState('')
  const [updatedAt, setUpdatedAt] = useState(null)

  const [barangays, setBarangays] = useState([])
  const [households, setHouseholds] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedBarangay, setSelectedBarangay] = useState(null)

  const [expanded, setExpanded] = useState(null)
  const [residents, setResidents] = useState([])
  const [residentsLoading, setResidentsLoading] = useState(false)

  // Live reference data for Gingoog City — Open-Meteo's weather forecast
  // (current rainfall) and Global Flood API (GloFAS river discharge), both
  // free, no API key, CORS-enabled, and fetched directly from the browser.
  const [liveWeather, setLiveWeather] = useState(null)
  const [liveFlood, setLiveFlood] = useState(null)
  const [liveLoading, setLiveLoading] = useState(true)
  const [liveError, setLiveError] = useState(false)

  const loadLiveData = () => {
    setLiveLoading(true)
    setLiveError(false)
    Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${CENTER[0]}&longitude=${CENTER[1]}&current=precipitation,rain&timezone=Asia%2FManila`).then(r => r.json()),
      fetch(`https://flood-api.open-meteo.com/v1/flood?latitude=${CENTER[0]}&longitude=${CENTER[1]}&daily=river_discharge&forecast_days=3`).then(r => r.json()),
    ])
      .then(([weather, flood]) => { setLiveWeather(weather); setLiveFlood(flood) })
      .catch(() => setLiveError(true))
      .finally(() => setLiveLoading(false))
  }

  useEffect(() => { loadLiveData() }, [])

  const load = () => {
    setLoading(true)
    Promise.all([
      apiGet('/settings/flood-level'),
      apiGet('/barangays'),
      apiGet('/households'),
    ])
      .then(([fl, b, h]) => {
        setFloodLevel(fl.level_m); setInput(String(fl.level_m)); setUpdatedAt(fl.updated_at)
        setBarangays(b); setHouseholds(h)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleUpdate = async () => {
    const level = parseFloat(input)
    if (isNaN(level) || level < 0) { alert('Enter a valid, non-negative number of meters.'); return }
    setSaving(true)
    try { await apiPut('/settings/flood-level', { level_m: level }); load() }
    catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  const handleReset = async () => {
    if (!window.confirm('Reset to normal? This clears the active flood simulation and returns to the official CDRA classification.')) return
    setSaving(true)
    try { await apiPut('/settings/flood-level', { level_m: 0 }); load() }
    catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  const isFlood = hazard === 'flood'
  const atRiskKey = isFlood ? 'in_flood_risk_zone' : 'in_landslide_risk_zone'
  const susceptKey = isFlood ? 'flood_susceptibility' : 'landslide_susceptibility'
  const atRiskHouseholds = households.filter(h => h[atRiskKey])

  const barangaysWithCentroid = useMemo(() => barangays.map(b => {
    if (!b.boundary_geojson) return { ...b, centroid: null }
    try { return { ...b, centroid: getCentroid(JSON.parse(b.boundary_geojson)) } } catch { return { ...b, centroid: null } }
  }), [barangays])

  const filteredBarangays = barangaysWithCentroid.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))

  const toggleFamily = (h) => {
    if (expanded === h.id) { setExpanded(null); return }
    setExpanded(h.id)
    setResidentsLoading(true)
    apiGet(`/residents?household_id=${h.id}`).then(setResidents).catch(() => {}).finally(() => setResidentsLoading(false))
  }

  if (loading) return <div className="card p-10 text-center text-gray-400">Loading…</div>

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            {isFlood ? <Waves size={20} className="text-blue-500" /> : <Mountain size={20} className="text-amber-600" />}
            Flood & Landslide Simulation Control
          </h1>
          <p className="text-sm text-gray-500 mt-1">Pick a hazard type to view its at-risk map and registered households/residents.</p>
        </div>
        <a
          href="/flood-control/display" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-800 border border-primary-200 rounded-lg px-3 py-1.5 flex-shrink-0"
        >
          <ExternalLink size={13} /> Open Big-Screen Display Mode
        </a>
      </div>

      {/* Hazard type toggle */}
      <div className="flex gap-2">
        <button
          type="button" onClick={() => setHazard('flood')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border ${isFlood ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
        >
          <Waves size={16} /> Flood
        </button>
        <button
          type="button" onClick={() => setHazard('landslide')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border ${!isFlood ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
        >
          <Mountain size={16} /> Landslide
        </button>
      </div>

      {/* Live reference data for Gingoog City — real-time rainfall and river
          discharge, fetched directly from Open-Meteo (free, no key). */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Live Reference — Gingoog City ({CENTER[0]}, {CENTER[1]})
          </h3>
          <button type="button" onClick={loadLiveData} className="text-xs text-primary-600 hover:text-primary-800">Refresh</button>
        </div>
        {liveLoading ? (
          <p className="text-xs text-gray-400">Loading live data…</p>
        ) : liveError ? (
          <p className="text-xs text-red-500">Could not load live data right now — try Refresh.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-blue-700">{liveWeather?.current?.rain ?? '—'} mm</p>
                <p className="text-[10px] text-gray-500 uppercase">Current Rain</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-amber-700">{liveFlood?.daily?.river_discharge?.[0] ?? '—'} m³/s</p>
                <p className="text-[10px] text-gray-500 uppercase">River Discharge Today</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Source: Open-Meteo (rainfall/temperature) and GloFAS/Open-Meteo Flood API (river discharge). River discharge is volume flow (m³/s), not water depth — use it as a reference trend, not a direct meters reading, when estimating the level below.
            </p>
          </>
        )}
      </div>

      {/* Flood-only manual water level input + PAGASA reference */}
      {isFlood && (
        <div className="card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
            <p className="text-xs text-gray-400 max-w-xl">
              No confirmed public real-time water-level API exists for Gingoog City specifically. PAGASA's PANaHON network shows near real-time rainfall, temperature, and river water-level data nationwide — check it for the closest station to Gingoog, then report the observed level below.
            </p>
            <a
              href="https://www.panahon.gov.ph/" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-3 py-1.5 flex-shrink-0"
            >
              <ExternalLink size={13} /> Open PAGASA PANaHON (Real-Time)
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input type="number" step="0.1" min="0" className="input w-32" placeholder="0.0" value={input} onChange={e => setInput(e.target.value)} />
            <span className="text-sm text-gray-500">meters</span>
            <button className="btn-primary text-sm px-4 py-2" onClick={handleUpdate} disabled={saving}>{saving ? 'Updating…' : 'Update'}</button>
            {floodLevel > 0 && <button className="btn-secondary text-sm px-4 py-2" onClick={handleReset} disabled={saving}>Reset to Normal</button>}
          </div>
          {floodLevel > 0 ? (
            <p className="text-sm text-red-600 font-medium mt-3 flex items-start gap-2">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              Active simulation: reported level is <strong className="mx-1">{floodLevel} m</strong> — puroks with a threshold at or below this are now at-risk.
            </p>
          ) : (
            <p className="text-sm text-gray-500 mt-3">No active flood event reported — using the official CDRA flood susceptibility classification.</p>
          )}
          {updatedAt && <p className="text-xs text-gray-400 mt-1">Last updated: {updatedAt}</p>}
        </div>
      )}
      {!isFlood && (
        <div className="card p-4">
          <p className="text-sm text-gray-500">
            Landslide risk has no continuously measured value like flood depth, so this view always shows the official CDRA landslide susceptibility classification (no manual input needed).
          </p>
        </div>
      )}

      {/* Map — same layout as Hazard Map & Geofencing: sidebar list + map */}
      <div className="flex flex-col lg:flex-row gap-4 lg:h-[520px]">
        <div className="w-full lg:w-64 lg:flex-shrink-0 space-y-3 lg:overflow-y-auto">
          <div className="card p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Search size={15} /> Search</h3>
            <input className="input text-sm" placeholder="Search barangay…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="card p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Building2 size={15} /> Barangays</h3>
            <div className="space-y-0.5 max-h-64 overflow-y-auto">
              {filteredBarangays.map(b => (
                <button
                  key={b.id} onClick={() => setSelectedBarangay(b)}
                  className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors flex items-center justify-between ${
                    selectedBarangay?.id === b.id ? 'bg-primary-100 text-primary-700 font-medium' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span>{b.name}</span>
                  {b[susceptKey] === 'High' && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />}
                </button>
              ))}
              {filteredBarangays.length === 0 && <p className="text-xs text-gray-400 py-2">No barangays found.</p>}
            </div>
          </div>
        </div>

        <div className="flood-map-container h-[70vh] lg:h-auto lg:flex-1 rounded-xl overflow-hidden shadow-sm border border-gray-200">
          <MapContainer center={CENTER} zoom={12} className="w-full h-full">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
            {selectedBarangay?.centroid && <FlyToBarangay target={selectedBarangay.centroid} />}

            {barangaysWithCentroid.filter(b => b.boundary_geojson).map(b => {
              let geo
              try { geo = JSON.parse(b.boundary_geojson) } catch { return null }
              const atRisk = b[susceptKey] === 'High'
              const color = atRisk ? '#dc2626' : '#16a34a'
              return (
                <GeoJSON
                  key={b.id} data={geo}
                  pathOptions={{ color, weight: 1.5, fillColor: color, fillOpacity: atRisk ? 0.25 : 0.1 }}
                  eventHandlers={{ click: () => setSelectedBarangay(b) }}
                >
                  <Tooltip sticky>{b.name}</Tooltip>
                </GeoJSON>
              )
            })}

            {barangaysWithCentroid.filter(b => b.centroid).map(b => (
              <Marker key={`brgy-${b.id}`} position={b.centroid} icon={barangayIcon} eventHandlers={{ click: () => setSelectedBarangay(b) }} />
            ))}

            {/* Highlighted outline for the selected barangay — same blue
                style as Hazard Map & Geofencing */}
            {selectedBarangay?.boundary_geojson && (() => {
              let geo
              try { geo = JSON.parse(selectedBarangay.boundary_geojson) } catch { return null }
              return (
                <GeoJSON
                  key={`selected-${selectedBarangay.id}`}
                  data={geo}
                  pathOptions={{ color: '#0ea5e9', weight: 3, fillColor: '#0ea5e9', fillOpacity: 0.08 }}
                />
              )
            })()}

            {households.filter(h => h.latitude && h.longitude).map(h => (
              <Marker key={h.id} position={[h.latitude, h.longitude]} icon={h[atRiskKey] ? redPin : bluePin}>
                <Popup><strong>{h.household_id}</strong> - {h.head_family}<br />{h[atRiskKey] ? `WARNING: Within high ${hazard}-risk zone` : 'Outside high-risk zone'}</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* At-risk households/residents list */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-sm">Registered Households in High {isFlood ? 'Flood' : 'Landslide'}-Risk Zones ({atRiskHouseholds.length})</h3>
        </div>
        <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
          {atRiskHouseholds.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">No households currently at risk for this hazard.</p>
          ) : atRiskHouseholds.map(h => (
            <div key={h.id}>
              <button type="button" onClick={() => toggleFamily(h)} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 text-left">
                <span>
                  <span className="block font-medium text-gray-800 text-sm">{h.head_family}</span>
                  <span className="block text-xs text-gray-400">{h.household_id} - {h.barangay_name || '—'} - {h.purok_name || '—'}</span>
                </span>
                <span className="text-xs text-primary-600 flex-shrink-0">{expanded === h.id ? 'Hide ▲' : 'Residents ▼'}</span>
              </button>
              {expanded === h.id && (
                <div className="bg-gray-50 px-4 py-3">
                  {residentsLoading ? (
                    <p className="text-xs text-gray-400">Loading residents…</p>
                  ) : residents.length === 0 ? (
                    <p className="text-xs text-gray-400">No residents recorded yet.</p>
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
      </div>

      <p className="text-xs text-gray-400">
        {isFlood
          ? <>Algorithm: for each purok, <code className="bg-gray-100 px-1 rounded">at_risk = reported_level_m &ge; purok.flood_threshold_m</code>.</>
          : <>Algorithm: a household is at-risk when its purok's official landslide susceptibility classification is "High".</>}
      </p>
    </div>
  )
}