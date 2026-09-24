import { useState, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { MapContainer, TileLayer, GeoJSON, Marker, Tooltip, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Waves, Mountain, AlertTriangle, Search, Building2, ExternalLink, ChevronDown, Settings2 } from 'lucide-react'
import { apiGet, apiPut } from '../utils/api'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const CENTER = [8.8231, 125.1109]

// Official PAGASA color-coded rainfall warning thresholds (mm observed within
// one hour). Used to automatically classify the live rain reading below —
// this is the closest thing to a "real-time, automatic" flood early-warning
// signal we can build for free, since PAGASA has no live water-level API for
// Gingoog City specifically, but does publish these official rain thresholds.
function getRainfallWarning(mm) {
  if (mm == null) return null
  if (mm > 30) return { level: 'Red', color: '#dc2626', bg: '#fef2f2', message: 'Torrential rain — severe flooding expected. Evacuation of low-lying and high-risk areas should begin.' }
  if (mm >= 15) return { level: 'Orange', color: '#ea580c', bg: '#fff7ed', message: 'Intense rain — flooding is a real threat. Be ready for pre-emptive evacuation.' }
  if (mm >= 7.5) return { level: 'Yellow', color: '#ca8a04', bg: '#fefce8', message: 'Heavy rain — flooding possible in low-lying areas. Monitor conditions closely.' }
  return { level: 'None', color: '#16a34a', bg: '#f0fdf4', message: 'No heavy rainfall detected at this time.' }
}

// Official CDRA (Climate and Disaster Risk Assessment) susceptibility colors —
// same palette as Hazard Map & Geofencing, matching the City of Gingoog CLUP
// Landslide and Flood Susceptibility Map.
const LANDSLIDE_COLOR = { High: '#dc2626', Moderate: '#15803d', Low: '#eab308' }
const FLOOD_COLOR = { High: '#7c3aed', Low: '#d6c9a8' }

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

// Same fix as GISMap/RiskAssessmentDashboard — a ResizeObserver keeps
// Leaflet's container size correct as the flex layout settles, so the map
// never needs a real window resize (e.g. F11) to display correctly.
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

export default function FloodSimulationControl() {
  const isDisplayMode = useLocation().pathname === '/flood-control/display'
  const [hazard, setHazard] = useState('flood') // 'flood' | 'landslide'

  const [floodLevel, setFloodLevel] = useState(0)
  const [floodSource, setFloodSource] = useState('manual')
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

  // Controls (manual water level input, live weather/river data, barangay
  // search) start collapsed — the client wants the map itself to be the
  // first thing seen, with these tucked away until needed.
  const [showControls, setShowControls] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  const barangaysWithCentroid = useMemo(() => barangays.map(b => {
    if (!b.boundary_geojson) return { ...b, centroid: null }
    try { return { ...b, centroid: getCentroid(JSON.parse(b.boundary_geojson)) } } catch { return { ...b, centroid: null } }
  }), [barangays])

  // Live reference data for Gingoog City — Open-Meteo's weather forecast
  // (current rainfall) and Global Flood API (GloFAS river discharge), both
  // free, no API key, CORS-enabled, and fetched directly from the browser.
  const [liveWeather, setLiveWeather] = useState(null)
  const [liveFlood, setLiveFlood] = useState(null)
  const [liveLoading, setLiveLoading] = useState(true)
  const [liveError, setLiveError] = useState(false)

  const [autoFloodedIds, setAutoFloodedIds] = useState([])

  const loadLiveData = () => {
    setLiveLoading(true)
    setLiveError(false)
    Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${CENTER[0]}&longitude=${CENTER[1]}&current=precipitation,rain&timezone=Asia%2FManila`).then(r => r.json()),
      fetch(`https://flood-api.open-meteo.com/v1/flood?latitude=${CENTER[0]}&longitude=${CENTER[1]}&daily=river_discharge&forecast_days=3&past_days=30`).then(r => r.json()),
    ])
      .then(([weather, flood]) => { setLiveWeather(weather); setLiveFlood(flood) })
      .catch(() => setLiveError(true))
      .finally(() => setLiveLoading(false))
  }

  useEffect(() => {
    loadLiveData()
    const interval = setInterval(loadLiveData, 5 * 60000)
    return () => clearInterval(interval)
  }, [])

  // Today's discharge vs. the last 30 days' average for this same river
  // point — how many times "normal" it currently is. Shown for reference;
  // the actual auto-detect decision now runs server-side on a schedule (see
  // /api/internal/flood-check), so it keeps working even with no browser
  // tab open. This page just displays the result.
  const dischargeRatio = useMemo(() => {
    const daily = liveFlood?.daily?.river_discharge
    if (!daily || daily.length < 4) return null
    const past = daily.slice(0, daily.length - 3) // exclude the 3 forecast days
    const baseline = past.reduce((sum, v) => sum + (v ?? 0), 0) / past.length
    const today = daily[past.length]
    if (!baseline || today == null) return null
    return today / baseline
  }, [liveFlood])

  // Re-poll just the auto-detect result periodically so this page reflects
  // what the server-side check decided, without a full page reload.
  useEffect(() => {
    const interval = setInterval(() => {
      apiGet('/settings/auto-flood-barangays').then(af => setAutoFloodedIds(af.barangay_ids || [])).catch(() => {})
    }, 2 * 60000)
    return () => clearInterval(interval)
  }, [])

  const load = () => {
    setLoading(true)
    Promise.all([
      apiGet('/settings/flood-level'),
      apiGet('/settings/auto-flood-barangays'),
      apiGet('/barangays'),
      apiGet('/households'),
    ])
      .then(([fl, af, b, h]) => {
        setFloodLevel(fl.level_m); setInput(String(fl.level_m)); setUpdatedAt(fl.updated_at); setFloodSource(fl.source || 'manual')
        setAutoFloodedIds(af.barangay_ids || [])
        setBarangays(b); setHouseholds(h)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleUpdate = async () => {
    const level = parseFloat(input)
    if (isNaN(level) || level < 0) { alert('Enter a valid, non-negative number of meters.'); return }
    setSaving(true)
    try { await apiPut('/settings/flood-level', { level_m: level, source: 'manual' }); load() }
    catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  const handleReset = async () => {
    if (!window.confirm('Reset to normal? This clears the active flood simulation and returns to the official CDRA classification.')) return
    setSaving(true)
    try { await apiPut('/settings/flood-level', { level_m: 0, source: 'manual' }); load() }
    catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  const isFlood = hazard === 'flood'
  const atRiskKey = isFlood ? 'in_flood_risk_zone' : 'in_landslide_risk_zone'
  const susceptKey = isFlood ? 'flood_susceptibility' : 'landslide_susceptibility'
  // A manually-entered level is a SIMULATION / drill that only affects
  // this page — the server no longer applies it to real figures (Dashboard,
  // GIS Map stay live). So while a simulation is running, the at-risk check
  // for flood is computed right here: the simulated level vs. each
  // household's purok threshold. Otherwise use the live server value.
  const simulating = isFlood && floodLevel > 0
  const isAtRisk = (h) => simulating ? floodLevel >= (h.flood_threshold_m ?? 1) : !!h[atRiskKey]
  const atRiskHouseholds = households.filter(isAtRisk)

  const autoFloodedBarangayNames = barangaysWithCentroid.filter(b => autoFloodedIds.includes(b.id)).map(b => b.name)

  const filteredBarangays = barangaysWithCentroid.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))

  const toggleFamily = (h) => {
    if (expanded === h.id) { setExpanded(null); return }
    setExpanded(h.id)
    setResidentsLoading(true)
    apiGet(`/residents?household_id=${h.id}`).then(setResidents).catch(() => {}).finally(() => setResidentsLoading(false))
  }

  if (loading) return <div className="card p-10 text-center text-gray-400">Loading…</div>

  return (
    <div className={isDisplayMode ? 'h-screen w-full overflow-hidden flex flex-col p-3 gap-2' : 'space-y-4'}>
      {!isDisplayMode && (
      <div className="flex items-start justify-between gap-3 flex-wrap flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            {isFlood ? <Waves size={20} className="text-blue-500" /> : <Mountain size={20} className="text-amber-600" />}
            Flood & Landslide Simulation Control
          </h1>
          <p className="text-sm text-gray-500 mt-1">Pick a hazard type to view its at-risk map and registered households/residents.</p>
        </div>
        <a
          href="/flood-control/display" target="pdra-bigscreen-display" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-800 border border-primary-200 rounded-lg px-3 py-1.5 flex-shrink-0"
        >
          <ExternalLink size={13} /> Open Big-Screen Display Mode
        </a>
      </div>
      )}

      {/* Hazard type toggle */}
      <div className="flex gap-2 flex-shrink-0">
        <button
          type="button" onClick={() => setHazard('flood')}
          className={`flex items-center gap-2 rounded-lg font-medium border ${isDisplayMode ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'} ${isFlood ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
        >
          <Waves size={isDisplayMode ? 13 : 16} /> Flood
        </button>
        <button
          type="button" onClick={() => setHazard('landslide')}
          className={`flex items-center gap-2 rounded-lg font-medium border ${isDisplayMode ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'} ${!isFlood ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
        >
          <Mountain size={isDisplayMode ? 13 : 16} /> Landslide
        </button>
      </div>

      {/* Map — same layout as Hazard Map & Geofencing: sidebar list + map */}
      <div className={`flex flex-col lg:flex-row gap-4 ${isDisplayMode ? 'flex-1 min-h-0' : 'lg:h-[520px]'}`}>
        <div className="w-full lg:w-64 lg:flex-shrink-0 space-y-3 lg:overflow-y-auto lg:order-2">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm flex items-center gap-2"><Building2 size={15} /> Barangays</h3>
              <button type="button" onClick={() => setShowSearch(v => !v)} className="text-gray-400 hover:text-primary-600" title="Search barangay">
                <Search size={15} />
              </button>
            </div>
            {showSearch && (
              <input className="input text-sm mb-3" placeholder="Search barangay…" value={search} onChange={e => setSearch(e.target.value)} autoFocus />
            )}
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

          {/* Simulation controls — manual water level input and live weather/
              river reference data. Collapsed by default so the map (with
              affected barangays already color-coded) is what's seen first.
              Lives here in the sidebar instead of a full-width bar at the
              top, so the map is what's immediately visible on page load. */}
          <div className="card p-0 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowControls(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Settings2 size={15} className="text-gray-400 flex-shrink-0" />
                <span>Simulation Controls</span>
              </span>
              <ChevronDown size={16} className={`text-gray-400 transition-transform flex-shrink-0 ${showControls ? 'rotate-180' : ''}`} />
            </button>
            {(floodLevel > 0 || autoFloodedIds.length > 0) && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {floodLevel > 0 && <span className="badge-red text-[10px]">Simulation: {floodLevel}m</span>}
                {autoFloodedIds.length > 0 && <span className="badge-red text-[10px]">Auto-flagged: {autoFloodedIds.length} barangay{autoFloodedIds.length > 1 ? 's' : ''}</span>}
              </div>
            )}

            {showControls && (
              <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-4">
                {/* Live reference data for Gingoog City — real-time rainfall
                    and river discharge, fetched directly from Open-Meteo. */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-xs flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                      Live Reference
                    </h3>
                    <button type="button" onClick={loadLiveData} className="text-xs text-primary-600 hover:text-primary-800">Refresh</button>
                  </div>
                  {liveLoading ? (
                    <p className="text-xs text-gray-400">Loading live data…</p>
                  ) : liveError ? (
                    <p className="text-xs text-red-500">Could not load live data right now.</p>
                  ) : (
                    <>
                      {(() => {
                        const rainMm = liveWeather?.current?.rain
                        const warning = getRainfallWarning(rainMm)
                        if (!warning || warning.level === 'None') return null
                        return (
                          <div className="rounded-lg p-2 mb-2 flex items-start gap-2" style={{ backgroundColor: warning.bg, border: `1px solid ${warning.color}` }}>
                            <AlertTriangle size={14} style={{ color: warning.color }} className="flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-semibold" style={{ color: warning.color }}>
                                {warning.level} Rainfall Warning — {rainMm} mm/hr
                              </p>
                              <p className="text-[11px] text-gray-600 mt-0.5">{warning.message}</p>
                            </div>
                          </div>
                        )
                      })()}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-blue-50 rounded-lg p-2 text-center">
                          <p className="text-sm font-bold text-blue-700">{liveWeather?.current?.rain ?? '—'} mm</p>
                          <p className="text-[9px] text-gray-500 uppercase">Current Rain</p>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-2 text-center">
                          <p className="text-sm font-bold text-amber-700">{liveFlood?.daily?.river_discharge?.[0] ?? '—'} m³/s</p>
                          <p className="text-[9px] text-gray-500 uppercase">Discharge</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2">
                        Source: Open-Meteo &amp; GloFAS. Discharge is volume flow, not water depth — a reference trend only.
                      </p>
                    </>
                  )}
                </div>

                {/* Flood-only manual water level input */}
                {isFlood ? (
                  <div className="border-t border-gray-100 pt-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <input type="number" step="0.1" min="0" className="input w-24 py-1.5 text-sm" placeholder="0.0" value={input} onChange={e => setInput(e.target.value)} />
                      <span className="text-xs text-gray-500">meters</span>
                      <button className="btn-primary text-xs px-3 py-1.5" onClick={handleUpdate} disabled={saving}>{saving ? 'Updating…' : 'Update'}</button>
                    </div>
                    {floodLevel > 0 && <button className="btn-secondary text-xs px-3 py-1.5 mt-2" onClick={handleReset} disabled={saving}>Reset to Normal</button>}
                    {floodLevel > 0 ? (
                      <p className="text-xs text-red-600 font-medium mt-2 flex items-start gap-1.5">
                        <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                        SIMULATION: <strong className="mx-1">{floodLevel} m</strong> — drill only, shown on this page. Dashboard and GIS Map stay live.
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-2">No simulation running — map shows live data (auto-detect or CDRA classification). Enter meters above to run a drill.</p>
                    )}
                    {updatedAt && <p className="text-[10px] text-gray-400 mt-1">Last updated: {updatedAt}</p>}
                    <p className="text-[10px] text-gray-400 mt-1">A manual level automatically resets to normal after 12 hours with no update — re-enter it if the flood is still ongoing.</p>

                    {autoFloodedBarangayNames.length > 0 && (
                      <p className="text-xs text-red-600 font-medium mt-2 flex items-start gap-1.5 pt-2 border-t border-gray-100">
                        <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                        Auto-detected in: <strong className="mx-1">{autoFloodedBarangayNames.join(', ')}</strong>
                      </p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-2 pt-2 border-t border-gray-100">
                      <strong>Auto-detect:</strong> server-side check every ~10 min — flags a barangay only when its own rain is PAGASA Red (&gt;30mm/hr) AND citywide river discharge is 50%+ above normal.
                    </p>
                  </div>
                ) : (
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs text-gray-500">
                      Landslide risk has no continuous measured value — this always uses the official CDRA classification.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flood-map-container h-[70vh] lg:h-auto lg:flex-1 rounded-xl overflow-hidden shadow-sm border border-gray-200 lg:order-1">
          <MapContainer center={CENTER} zoom={12} className="w-full h-full">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
            <MapResizeHandler />
            {selectedBarangay?.centroid && <FlyToBarangay target={selectedBarangay.centroid} />}

            {barangaysWithCentroid.filter(b => b.boundary_geojson).map(b => {
              let geo
              try { geo = JSON.parse(b.boundary_geojson) } catch { return null }
              const colorMap = isFlood ? FLOOD_COLOR : LANDSLIDE_COLOR
              const level = b[susceptKey] || 'Low'
              const color = colorMap[level] || colorMap.Low
              return (
                <GeoJSON
                  key={b.id} data={geo}
                  pathOptions={{ color: '#555', weight: 0.5, fillColor: color, fillOpacity: 0.55 }}
                  eventHandlers={{ click: () => setSelectedBarangay(b) }}
                >
                  <Tooltip sticky>{b.name} — {level} {isFlood ? 'flood' : 'landslide'} susceptibility</Tooltip>
                </GeoJSON>
              )
            })}

            {/* Purok boundaries — real drawn polygons where a Barangay
                Official has traced one. */}
            {barangaysWithCentroid.flatMap(b => (b.puroks || [])
              .filter(p => p.boundary_geojson)
              .map(p => {
                let geo
                try { geo = JSON.parse(p.boundary_geojson) } catch { return null }
                return (
                  <GeoJSON
                    key={`purok-${p.id}`}
                    data={geo}
                    pathOptions={{ color: '#2563eb', weight: 1.5, fillOpacity: 0, dashArray: '4, 3' }}
                  >
                    <Tooltip sticky>{p.name}</Tooltip>
                  </GeoJSON>
                )
              })
            )}

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
              <Marker key={h.id} position={[h.latitude, h.longitude]} icon={isAtRisk(h) ? redPin : bluePin}>
                <Popup><strong>{h.household_id}</strong> - {h.head_family}<br />{isAtRisk(h) ? (simulating ? `SIMULATION: flooded at ${floodLevel} m` : `WARNING: Within high ${hazard}-risk zone`) : 'Outside high-risk zone'}</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  )
}