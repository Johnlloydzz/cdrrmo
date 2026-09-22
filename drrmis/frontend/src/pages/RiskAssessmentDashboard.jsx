import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MapContainer, TileLayer, GeoJSON, Marker, Tooltip, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { AlertTriangle, X, MapPin, Search, Building2, ShieldAlert, Waves } from 'lucide-react'
import { apiGet } from '../utils/api'
import { SkeletonStatCards, SkeletonList, SkeletonBlock } from '../components/Skeleton'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Official CDRA (Climate and Disaster Risk Assessment) flood susceptibility
// colors — same palette as Hazard Map & Geofencing and Flood Simulation
// Control, matching the City of Gingoog CLUP Flood Susceptibility Map.
const FLOOD_COLOR = { High: '#7c3aed', Low: '#d6c9a8' }

// Red pin for households within a high flood-risk (geofenced) zone
const redPinIcon = new L.DivIcon({
  className: 'household-pin',
  html: `<div class="household-pin-focused" style="background:#dc2626;width:16px;height:16px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 16],
  popupAnchor: [0, -16],
})
// Blue pin for households outside the high-risk zone
const bluePinIcon = new L.DivIcon({
  className: 'household-pin',
  html: `<div class="household-pin-focused" style="background:#3b82f6;width:16px;height:16px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`,
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

// Leaflet computes its size once, when the map first mounts. In a flexbox
// layout like this page's (map container is flex-1, sized by its parent's
// remaining space), that size isn't final yet at mount time — the browser
// hasn't finished settling the flex layout — so Leaflet can end up zoomed
// in on a container size that's wrong, without ever correcting itself
// afterward (that's why resizing the window, e.g. via F11, "fixes" it: a
// resize event is exactly what tells Leaflet to recalculate). A
// ResizeObserver on the map's own container catches every future size
// change — including the very first "settling" right after mount — and
// calls invalidateSize() so this fixes itself without needing a real resize.
function MapResizeHandler() {
  const map = useMap()
  useEffect(() => {
    const container = map.getContainer()
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(container)
    return () => observer.disconnect()
  }, [map])
  return null
}

// Fits the map to the selected barangay's boundary — same click-to-zoom
// behavior as the Hazard Map & Geofencing page.
function FitToBoundary({ geojsonLayer }) {
  const map = useMap()
  useEffect(() => {
    if (!geojsonLayer) return
    // Make sure Leaflet's idea of the container size is current before
    // fitting bounds to it — otherwise it can fit against a stale (often
    // zero or wrong) size from before the flex layout settled.
    map.invalidateSize()
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
  const [filterAtRiskOnly, setFilterAtRiskOnly] = useState(false)
  const [expandedHousehold, setExpandedHousehold] = useState(null)
  const [residents, setResidents] = useState([])
  const [residentsLoading, setResidentsLoading] = useState(false)
  const [flyTarget, setFlyTarget] = useState(null)
  const [focusedHousehold, setFocusedHousehold] = useState(null)
  const [floodLevel, setFloodLevel] = useState(0)

  // "Barangays in Risk Zone" card -> list of at-risk barangays -> pick one
  // to see its at-risk households -> pick a household to see its family.
  const [showRiskBarangays, setShowRiskBarangays] = useState(false)

  const loadDashboardData = () =>
    Promise.all([
      apiGet('/risk-assessment/summary'),
      apiGet('/households'),
      apiGet('/settings/flood-level'),
    ]).then(([s, h, fl]) => { setSummary(s); setHouseholds(h); setFloodLevel(fl.level_m) })

  useEffect(() => {
    setLoading(true)
    setWakingUp(false)
    Promise.all([
      apiGet('/risk-assessment/summary', { onColdStart: () => setWakingUp(true) }),
      apiGet('/barangays'),
      apiGet('/households'),
      apiGet('/settings/flood-level'),
    ])
      .then(([s, b, h, fl]) => { setSummary(s); setBarangays(b); setHouseholds(h); setFloodLevel(fl.level_m) })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))

    // The flood level is now set from a separate Flood Simulation Control
    // page — poll here so the Dashboard's figures stay current even though
    // the two pages aren't directly connected.
    const interval = setInterval(() => loadDashboardData().catch(() => {}), 20000)
    return () => clearInterval(interval)
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
  const barangaysInRiskZoneCount = Object.values(atRiskByBarangay).filter(s => (s.at_risk_households || 0) > 0).length

  const scrollToMap = () => {
    document.getElementById('dashboard-map-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const filteredBarangays = visibleBarangays.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))

  const selectedGeojson = (() => {
    if (!selectedBarangay?.boundary_geojson) return null
    try { return JSON.parse(selectedBarangay.boundary_geojson) } catch { return null }
  })()
  const selectedStats = selectedBarangay ? atRiskByBarangay[selectedBarangay.id] : null

  // When a barangay is selected, the summary cards and the household
  // drill-down list narrow to just that barangay — otherwise they show the
  // city-wide (or, for a Barangay Official, their own barangay's) totals.
  const displayTotals = selectedBarangay && selectedStats ? {
    households: selectedStats.total_households || 0,
    atRiskHouseholds: selectedStats.at_risk_households || 0,
    population: selectedStats.total_population || 0,
    atRiskPopulation: selectedStats.at_risk_population || 0,
  } : totals

  const householdsToList = (selectedBarangay
    ? visibleHouseholds.filter(h => h.barangay_name === selectedBarangay.name)
    : visibleHouseholds
  ).filter(h => !filterAtRiskOnly || h.in_flood_risk_zone)

  const openHouseholdList = () => {
    setFilterAtRiskOnly(false)
    setShowHouseholds(true)
    setExpandedHousehold(null)
  }

  // Groups a household's residents into the shape CDRRMO actually wants to
  // see: Husband / Wife (keyed off relation_to_head + sex, falling back to
  // Head/Spouse order when sex wasn't recorded), Child, and Other (parents,
  // siblings, or any other relative living in that same house).
  const groupFamily = (list) => {
    const head = list.find(r => r.relation_to_head === 'Head') || null
    const spouse = list.find(r => r.relation_to_head === 'Spouse') || null
    let husband = null, wife = null
    ;[head, spouse].forEach(r => {
      if (!r) return
      if (r.sex === 'Male' && !husband) husband = r
      else if (r.sex === 'Female' && !wife) wife = r
    })
    if (!husband && !wife) { husband = head; wife = spouse }
    else {
      if (!husband && spouse && spouse !== wife) husband = spouse
      if (!wife && head && head !== husband) wife = head
    }
    const children = list.filter(r => r.relation_to_head === 'Child')
    const assignedIds = new Set([husband, wife, ...children].filter(Boolean).map(r => r.id))
    const others = list.filter(r => !assignedIds.has(r.id))
    return { husband, wife, children, others }
  }

  const flyToHousehold = (h) => {
    if (!h.latitude || !h.longitude) { alert('No location recorded for this household yet.'); return }
    setFlyTarget([h.latitude, h.longitude])
    setFocusedHousehold(h)
    setShowHouseholds(false)
  }

  const toggleFamily = (h) => {
    if (expandedHousehold === h.id) { setExpandedHousehold(null); return }
    setExpandedHousehold(h.id)
    setResidentsLoading(true)
    apiGet(`/residents?household_id=${h.id}`).then(setResidents).catch(() => {}).finally(() => setResidentsLoading(false))
  }

  if (loading) return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      <div className="flex-shrink-0">
        <div className="h-5 w-64 bg-gray-100 rounded animate-pulse mb-2" />
        <div className="h-3.5 w-96 max-w-full bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="flex-shrink-0"><SkeletonStatCards count={4} /></div>
      {wakingUp && (
        <div className="card p-3 text-center text-xs text-gray-400 flex items-center justify-center gap-2 flex-shrink-0">
          <div className="w-3 h-3 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
          Waking up the server… (up to a minute after a period of inactivity)
        </div>
      )}
      <div className="flex flex-col lg:flex-row gap-3 flex-1 min-h-0">
        <div className="w-full lg:w-64 lg:flex-shrink-0 space-y-3">
          <div className="card p-3"><div className="h-9 bg-gray-100 rounded animate-pulse" /></div>
          <div className="card p-3"><SkeletonList rows={7} /></div>
        </div>
        <div className="lg:flex-1 rounded-xl overflow-hidden">
          <SkeletonBlock className="h-[50vh] lg:h-full w-full" />
        </div>
      </div>
    </div>
  )
  if (error) return <div className="card p-10 text-center text-red-600">{error}</div>

  return (
    <div className="h-full flex flex-col gap-2.5 overflow-hidden">
      <div className="flex items-start justify-between gap-3 flex-shrink-0">
        <div>
          <h1 className="text-base font-semibold text-gray-800">Risk Assessment Dashboard</h1>
          <p className="text-xs text-gray-400">
            Projected households/population in high flood-risk zones, based on CDRA-aligned purok classification.
          </p>
        </div>
        {selectedBarangay && (
          <p className="text-xs text-primary-700 font-medium flex items-center gap-1 flex-shrink-0 pt-0.5">
            <Building2 size={12} /> {selectedBarangay.name} only
            <button type="button" onClick={() => setSelectedBarangay(null)} className="text-gray-400 hover:text-gray-600 underline ml-1">clear</button>
          </p>
        )}
      </div>

      {/* Smooth grid-rows collapse/expand instead of the banner just
          popping in or out when a flood simulation starts/ends. */}
      <div className={`grid transition-all duration-300 ease-out flex-shrink-0 ${floodLevel > 0 ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <div className="card p-2 bg-red-50 border border-red-200 flex items-center gap-2">
            <Waves size={13} className="text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-700">
              <strong>Active flood simulation:</strong> reported water level is {floodLevel} m — figures below reflect puroks whose flood threshold is at or below this level, overriding the static CDRA classification.
            </p>
          </div>
        </div>
      </div>

      <div className="card p-0 flex-shrink-0 overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
          <button type="button" onClick={() => setShowRiskBarangays(true)} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Waves size={17} className="text-blue-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-800 leading-tight">{barangaysInRiskZoneCount.toLocaleString()}</p>
              <p className="text-[11px] text-gray-500">Barangays in Risk Zone {floodLevel > 0 ? '(live)' : ''}</p>
            </div>
          </button>
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={17} className="text-red-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-red-600 leading-tight">{displayTotals.atRiskHouseholds.toLocaleString()}</p>
              <p className="text-[11px] text-gray-500">Households in High-Risk Zones</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={17} className="text-red-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-red-600 leading-tight">{displayTotals.atRiskPopulation.toLocaleString()}</p>
              <p className="text-[11px] text-gray-500">Population in High-Risk Zones</p>
            </div>
          </div>
        </div>
      </div>

      {/* Map section — same two-column layout as Hazard Map & Geofencing:
          barangay list on the left, click one to zoom to its boundary.
          flex-1 min-h-0 so this fills whatever space is left instead of a
          fixed height, keeping the whole page within the viewport with no
          page-level scroll. */}
      <div id="dashboard-map-section" className="flex flex-col lg:flex-row gap-3 flex-1 min-h-0">
        <div className="w-full lg:w-64 lg:flex-shrink-0 space-y-3 lg:overflow-y-auto order-2 lg:order-2">
          <div className="card p-3">
            <h3 className="font-semibold text-xs mb-2 flex items-center gap-1.5"><Search size={13} /> Search</h3>
            <input className="input text-sm py-1.5" placeholder="Search barangay…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="card p-3">
            <h3 className="font-semibold text-xs mb-2 flex items-center gap-1.5"><Building2 size={13} /> Barangays</h3>
            <div className="space-y-0.5 max-h-52 overflow-y-auto">
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
            <div className="card p-3 animate-[fadeIn_0.2s_ease-out]">
              <h3 className="font-semibold text-xs mb-2 flex items-center gap-1.5"><ShieldAlert size={13} /> {selectedBarangay.name}</h3>
              <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                <div className="bg-gray-50 rounded-lg py-1.5 text-center">
                  <p className="text-base font-bold text-gray-700">{selectedStats.total_households}</p>
                  <p className="text-[10px] text-gray-500 uppercase">Households</p>
                </div>
                <div className="bg-red-50 rounded-lg py-1.5 text-center">
                  <p className="text-base font-bold text-red-600">{selectedStats.at_risk_households}</p>
                  <p className="text-[10px] text-gray-500 uppercase">At-Risk</p>
                </div>
                <div className="bg-gray-50 rounded-lg py-1.5 text-center">
                  <p className="text-base font-bold text-gray-700">
                    {(() => {
                      const puroks = selectedBarangay.puroks || []
                      const atRisk = puroks.filter(p => floodLevel > 0 ? floodLevel >= p.flood_threshold_m : p.flood_risk === 'High').length
                      return `${atRisk} / ${puroks.length}`
                    })()}
                  </p>
                  <p className="text-[10px] text-gray-500 uppercase">Puroks At-Risk</p>
                </div>
                <div className="bg-red-50 rounded-lg py-1.5 text-center">
                  <p className="text-base font-bold text-red-600">{selectedStats.at_risk_population}</p>
                  <p className="text-[10px] text-gray-500 uppercase">At-Risk Pop.</p>
                </div>
              </div>
              {!selectedBarangay.boundary_geojson && (
                <p className="text-xs text-amber-600 mt-2">No boundary data uploaded for this barangay yet.</p>
              )}
              <button type="button" onClick={openHouseholdList} className="text-xs text-primary-600 hover:text-primary-800 underline mt-2">
                View household list for {selectedBarangay.name}
              </button>
            </div>
          )}

          <div className="card p-3">
            <h3 className="font-semibold text-xs mb-2">Legend</h3>
            <div className="space-y-1.5">
              {[
                { color: FLOOD_COLOR.High, label: 'High Susceptibility of Flooding' },
                { color: FLOOD_COLOR.Low, label: 'Low Susceptibility of Flooding' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-2 text-xs">
                  <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: l.color }} />
                  {l.label}
                </div>
              ))}
              <div className="border-t border-gray-100 my-1.5" />
              {[
                { color: '#dc2626', label: 'Household — High Flood-Risk Zone' },
                { color: '#3b82f6', label: 'Household — Outside High-Risk Zone' },
                { color: '#0ea5e9', label: 'Selected Barangay Boundary' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-2 text-xs">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: l.color }} />
                  {l.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="dashboard-map-container flex-1 min-h-[300px] lg:min-h-0 rounded-xl overflow-hidden shadow-sm border border-gray-200 relative order-1 lg:order-1 transition-shadow">
          <MapContainer center={CENTER} zoom={12} className="w-full h-full">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
            <MapResizeHandler />
            <FlyToHandler target={flyTarget} />

            {/* All barangays — colored by official CDRA flood susceptibility
                classification, same palette as Hazard Map & Geofencing and
                Flood Simulation Control. */}
            {visibleBarangays.filter(b => b.boundary_geojson).map(b => {
              let geo
              try { geo = JSON.parse(b.boundary_geojson) } catch { return null }
              const level = b.flood_susceptibility || 'Low'
              const color = FLOOD_COLOR[level] || FLOOD_COLOR.Low
              return (
                <GeoJSON
                  key={b.id}
                  data={geo}
                  pathOptions={{ color: '#555', weight: 0.5, fillColor: color, fillOpacity: 0.55 }}
                  eventHandlers={{ click: () => setSelectedBarangay(b) }}
                >
                  <Tooltip sticky>{b.name} — {level} flood susceptibility — {atRiskByBarangay[b.id]?.at_risk_households || 0} at-risk household{atRiskByBarangay[b.id]?.at_risk_households === 1 ? '' : 's'}</Tooltip>
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

            {/* Only the household most recently selected from the drill-down
                list gets a pin — it moves when a different family is picked,
                and disappears entirely when the Dashboard is left and
                revisited (this state resets on unmount). */}
            {focusedHousehold && (
              <Marker
                key={focusedHousehold.id}
                position={[focusedHousehold.latitude, focusedHousehold.longitude]}
                icon={focusedHousehold.in_flood_risk_zone ? redPinIcon : bluePinIcon}
              >
                <Popup eventHandlers={{ remove: () => setFocusedHousehold(null) }}>
                  <strong>{focusedHousehold.household_id}</strong> - {focusedHousehold.head_family}<br />{focusedHousehold.in_flood_risk_zone ? 'WARNING: Within high flood-risk zone (geofenced)' : 'Outside high-risk zone'}
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      </div>

      <p className="text-[11px] text-gray-400 italic flex-shrink-0">
        "At-risk" = within puroks classified High flood-risk (CDRRMO's CDRA data). Red dot in barangay list = has at-risk households.
      </p>

      {/* Total Households drill-down — docked to the right (away from the
          Dashboard's own Search/Barangays sidebar on the left), with a
          smooth slide-in/out transition rather than appearing instantly.
          Rendered via a portal straight into <body> so it always paints
          above absolutely everything else on the page (sidebar included),
          regardless of any ancestor's own stacking context. */}
      {createPortal(
      <div
        className={`fixed inset-0 z-[100] bg-black/40 transition-opacity duration-300 ${showHouseholds ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setShowHouseholds(false)}
      >
        <div
          className={`absolute top-0 right-0 h-full w-full sm:w-72 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${showHouseholds ? 'translate-x-0' : 'translate-x-full'}`}
          style={{ maxHeight: '100vh' }}
          onClick={e => e.stopPropagation()}
        >
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
              <h3 className="font-semibold text-gray-800 text-sm">
                {selectedBarangay ? selectedBarangay.name : 'All Barangays'}{filterAtRiskOnly ? ' — At-Risk Households' : ' Households'} ({householdsToList.length})
              </h3>
              <button onClick={() => setShowHouseholds(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto flex-1">
              {householdsToList.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">{filterAtRiskOnly ? 'No at-risk households here.' : 'No households registered yet.'}</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {householdsToList.map(h => (
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
                      ) : (() => {
                        const { husband, wife, children, others } = groupFamily(residents)
                        const Row = ({ label, value }) => (
                          <div className="flex gap-2 py-1 border-t border-gray-200 first:border-t-0">
                            <span className="text-gray-500 font-medium w-14 flex-shrink-0">{label}:</span>
                            <span className="text-gray-700">{value}</span>
                          </div>
                        )
                        return (
                          <div className="text-xs">
                            <p className="font-semibold text-gray-700 mb-1">Family</p>
                            <Row label="Husband" value={husband ? husband.name : '—'} />
                            <Row label="Wife" value={wife ? wife.name : '—'} />
                            <Row label="Child" value={children.length ? children.map(c => c.name).join(', ') : '—'} />
                            <Row label="Other" value={others.length ? others.map(o => `${o.name} (${o.relation_to_head})`).join(', ') : '—'} />
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
        </div>
      </div>,
      document.body
      )}

      {/* "Barangays in Risk Zone" card -> this list -> pick one to open its
          at-risk households (same slide-in panel as above, filtered).
          Also portal-rendered for the same reason as the panel above. */}
      {createPortal(
      <div
        className={`fixed inset-0 z-[100] bg-black/40 transition-opacity duration-300 ${showRiskBarangays ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setShowRiskBarangays(false)}
      >
        <div
          className={`absolute top-0 right-0 h-full w-full sm:w-72 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${showRiskBarangays ? 'translate-x-0' : 'translate-x-full'}`}
          style={{ maxHeight: '100vh' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
            <h3 className="font-semibold text-gray-800 text-sm">Barangays in Risk Zone ({barangaysInRiskZoneCount})</h3>
            <button onClick={() => setShowRiskBarangays(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
          <div className="overflow-y-auto flex-1">
            {barangaysInRiskZoneCount === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">No barangays currently in a risk zone.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {visible.filter(s => (s.at_risk_households || 0) > 0).map(s => {
                  const b = barangays.find(bb => bb.id === s.barangay_id)
                  return (
                    <button
                      key={s.barangay_id}
                      type="button"
                      onClick={() => {
                        if (b) setSelectedBarangay(b)
                        setFilterAtRiskOnly(true)
                        setShowRiskBarangays(false)
                        setShowHouseholds(true)
                        setExpandedHousehold(null)
                      }}
                      className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 text-left"
                    >
                      <span>
                        <span className="block font-medium text-gray-800 text-sm">{s.barangay_name}</span>
                        <span className="block text-xs text-gray-400">{s.at_risk_households} at-risk household{s.at_risk_households === 1 ? '' : 's'}</span>
                      </span>
                      <AlertTriangle size={15} className="text-red-500 flex-shrink-0" />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>,
      document.body
      )}
    </div>
  )
}