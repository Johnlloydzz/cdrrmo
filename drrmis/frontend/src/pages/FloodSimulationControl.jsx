import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, GeoJSON, Marker, Tooltip, Popup } from 'react-leaflet'
import L from 'leaflet'
import { Waves, Mountain, AlertTriangle, X } from 'lucide-react'
import { apiGet, apiPut } from '../utils/api'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const CENTER = [8.8231, 125.1109]

const pinIcon = (color) => new L.DivIcon({
  className: '',
  html: `<div style="background:${color};width:16px;height:16px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`,
  iconSize: [16, 16], iconAnchor: [8, 16], popupAnchor: [0, -16],
})
const redPin = pinIcon('#dc2626')
const bluePin = pinIcon('#3b82f6')

export default function FloodSimulationControl() {
  const [hazard, setHazard] = useState('flood') // 'flood' | 'landslide'

  const [floodLevel, setFloodLevel] = useState(0)
  const [input, setInput] = useState('')
  const [updatedAt, setUpdatedAt] = useState(null)

  const [barangays, setBarangays] = useState([])
  const [households, setHouseholds] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [expanded, setExpanded] = useState(null)
  const [residents, setResidents] = useState([])
  const [residentsLoading, setResidentsLoading] = useState(false)

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

  const toggleFamily = (h) => {
    if (expanded === h.id) { setExpanded(null); return }
    setExpanded(h.id)
    setResidentsLoading(true)
    apiGet(`/residents?household_id=${h.id}`).then(setResidents).catch(() => {}).finally(() => setResidentsLoading(false))
  }

  if (loading) return <div className="card p-10 text-center text-gray-400">Loading…</div>

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          {isFlood ? <Waves size={20} className="text-blue-500" /> : <Mountain size={20} className="text-amber-600" />}
          Flood & Landslide Simulation Control
        </h1>
        <p className="text-sm text-gray-500 mt-1">Pick a hazard type to view its at-risk map and registered households/residents.</p>
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

      {/* Flood-only manual water level input */}
      {isFlood && (
        <div className="card p-4">
          <p className="text-xs text-gray-400 mb-3">
            No public real-time water-level feed exists for Gingoog City's rivers — PAGASA's live telemetry only covers major dam/river systems. Report the observed level here, based on PAGASA advisories or local gauges.
          </p>
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

      {/* Map */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-sm">{isFlood ? 'Flood' : 'Landslide'} Risk Map</h3>
          <p className="text-xs text-gray-400 mt-0.5">Red = at-risk barangay. Pins show household locations.</p>
        </div>
        <div className="h-[420px]">
          <MapContainer center={CENTER} zoom={12} className="w-full h-full">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
            {barangays.filter(b => b.boundary_geojson).map(b => {
              let geo
              try { geo = JSON.parse(b.boundary_geojson) } catch { return null }
              const atRisk = b[susceptKey] === 'High'
              const color = atRisk ? '#dc2626' : '#16a34a'
              return (
                <GeoJSON key={b.id} data={geo} pathOptions={{ color, weight: 1.5, fillColor: color, fillOpacity: atRisk ? 0.25 : 0.1 }}>
                  <Tooltip sticky>{b.name}</Tooltip>
                </GeoJSON>
              )
            })}
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