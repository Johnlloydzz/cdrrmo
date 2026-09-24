import { useState, useEffect, useMemo, useRef, Component } from 'react'
import { createPortal } from 'react-dom'
import { MapContainer, TileLayer, GeoJSON, Polygon, Polyline, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { Search, Plus, Pencil, Trash2, MapPin, Undo2, RotateCcw } from 'lucide-react'
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api'
import { SkeletonTableRows } from '../components/Skeleton'

const RISK = { High: 'badge-red', Medium: 'badge-orange', Low: 'badge-green' }
const GINGOOG_CENTER = [8.8231, 125.1109]
const emptyForm = { barangay_id: '', name: '', flood_risk: 'Low', flood_threshold_m: '1.0', landslide_risk: 'Low' }

// A small round dot, draggable — used for each boundary vertex. Leaflet's
// CircleMarker can't be dragged (only Marker supports that), so a plain
// Marker with a tiny custom icon stands in for the dot look instead.
const vertexIcon = L.divIcon({
  className: '',
  html: '<div style="width:12px;height:12px;border-radius:50%;background:#2563eb;border:2px solid white;box-shadow:0 0 2px rgba(0,0,0,0.4);"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
})

// Safety net: if anything inside the boundary map throws, only the map box
// shows a message — the rest of the page (and the whole app) stays up
// instead of going completely blank.
class MapErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false } }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err) { console.error('Boundary map error:', err) }
  render() {
    if (this.state.failed) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center p-4 bg-gray-50">
          <p className="text-sm text-gray-600 mb-2">The map had a problem displaying.</p>
          <button type="button" className="btn-secondary text-xs px-3 py-1.5" onClick={() => this.setState({ failed: false })}>Reload map</button>
        </div>
      )
    }
    return this.props.children
  }
}

// GeoJSON stores rings as [lng, lat]; Leaflet works in [lat, lng] — these
// two helpers keep that conversion in one place instead of scattered
// throughout the component.
function geojsonToLatLngs(geojson) {
  try {
    const g = typeof geojson === 'string' ? JSON.parse(geojson) : geojson
    const ring = g?.type === 'Polygon' ? g.coordinates?.[0] : null
    if (!ring) return []
    // Drop the closing point GeoJSON repeats at the end of the ring.
    return ring.slice(0, -1).map(([lng, lat]) => [lat, lng])
  } catch { return [] }
}
function latLngsToGeojson(points) {
  if (points.length < 3) return null
  const ring = points.map(([lat, lng]) => [lng, lat])
  ring.push(ring[0]) // close the ring
  return JSON.stringify({ type: 'Polygon', coordinates: [ring] })
}

// Captures clicks on the embedded map to add boundary vertices one at a
// time — a Barangay Official traces their purok's boundary themselves,
// since they're the only one who actually knows where it runs.
function BoundaryClickCapture({ onAddPoint }) {
  useMapEvents({ click(e) { onAddPoint([e.latlng.lat, e.latlng.lng]) } })
  return null
}

// Inserts a new vertex into the edge it's closest to, instead of always
// appending it at the end. Appending at the end means the new point always
// connects back to the very first point (the polygon's closing edge),
// which makes lines cross whenever someone adds a point "in between"
// existing ones. This picks the edge where adding the point stretches the
// outline the least — the same way Google My Maps inserts a vertex.
function insertPointSmart(points, pt) {
  if (points.length < 3) return [...points, pt]
  // Scale longitude by cos(latitude) so distances are roughly true meters
  // rather than raw degrees (a degree of longitude is shorter than a
  // degree of latitude here).
  const k = Math.cos((pt[0] * Math.PI) / 180)
  const d = (a, b) => Math.hypot(a[0] - b[0], (a[1] - b[1]) * k)
  let bestIndex = points.length
  let bestCost = Infinity
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    const cost = d(a, pt) + d(pt, b) - d(a, b)
    if (cost < bestCost) { bestCost = cost; bestIndex = i + 1 }
  }
  return [...points.slice(0, bestIndex), pt, ...points.slice(bestIndex)]
}

// Centers the embedded map on whichever boundary layer it's given — either
// the purok's own boundary if one's already drawn, or (as a fallback,
// falling all the way back to just the barangay's boundary) so the map is
// never just sitting on the whole city by default. Only runs once per
// layer, so it never yanks the view away while someone is mid-drawing.
function FitToBoundary({ geojsonLayer }) {
  const map = useMap()
  useEffect(() => {
    if (!geojsonLayer) return
    const bounds = geojsonLayer.getBounds()
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30] })
  }, [geojsonLayer, map])
  return null
}

export default function PurokManagement({ currentUser }) {
  const canAdd = currentUser?.role === 'Barangay Official' || currentUser?.role === 'CDRRMO Personnel'
  const isCdrrmo = currentUser?.role === 'CDRRMO Personnel'
  const [puroks, setPuroks] = useState([])
  const [barangays, setBarangays] = useState([])
  const [barangaysError, setBarangaysError] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [addingNew, setAddingNew] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [boundaryPoints, setBoundaryPoints] = useState([]) // [[lat,lng], ...] while drawing
  const [existingBoundary, setExistingBoundary] = useState(null) // untouched boundary_geojson, kept until re-drawn
  const [barangayBoundaryLayer, setBarangayBoundaryLayer] = useState(null) // ref to the background barangay outline, for fitBounds
  const [purokBoundaryLayer, setPurokBoundaryLayer] = useState(null) // ref to the purok's own existing boundary, for fitBounds
  const shapeRef = useRef(null) // the live line/polygon being drawn — updated directly during drags

  const load = () => {
    setLoading(true)
    apiGet('/puroks').then(setPuroks).catch(err => setError(err.message)).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    apiGet('/barangays').then(setBarangays).catch(err => setBarangaysError(err.message))
  }, [])

  const filtered = puroks.filter(p => (p.name || '').toLowerCase().includes(search.toLowerCase()) || (p.barangay_name || '').toLowerCase().includes(search.toLowerCase()))

  // Whether the boundary map is editable in this session — same rule as the
  // purok name: a Barangay Official can always draw/redraw it; CDRRMO can
  // only draw one when creating a brand-new purok (for a barangay with no
  // official yet), never on an existing one.
  const boundaryEditable = !(editing && isCdrrmo)

  const selectedBarangay = useMemo(() => barangays.find(b => String(b.id) === String(form.barangay_id)), [barangays, form.barangay_id])

  const openAdd = () => {
    setEditing(null)
    setForm(isCdrrmo ? emptyForm : { ...emptyForm, barangay_id: currentUser?.barangay_id || '' })
    setAddingNew(false)
    setBoundaryPoints([])
    setPointsHistory([])
    setExistingBoundary(null)
    setBarangayBoundaryLayer(null)
    setPurokBoundaryLayer(null)
    setShowModal(true)
  }
  const openEdit = (p) => {
    setEditing(p.id)
    setForm({ barangay_id: p.barangay_id || '', name: p.name || '', flood_risk: p.flood_risk || 'Low', flood_threshold_m: String(p.flood_threshold_m ?? '1.0'), landslide_risk: p.landslide_risk || 'Low' })
    setAddingNew(true) // editing always shows a free text name field for the existing purok
    setBoundaryPoints(geojsonToLatLngs(p.boundary_geojson))
    setPointsHistory([])
    setExistingBoundary(p.boundary_geojson || null)
    setBarangayBoundaryLayer(null)
    setPurokBoundaryLayer(null)
    setShowModal(true)
  }
  const handleDelete = async (id) => { if (!window.confirm('Delete this purok?')) return; try { await apiDelete(`/puroks/${id}`); load() } catch (err) { alert(err.message) } }

  // Undo history — each entry is the full list of points *before* a change,
  // so Undo reverts the last action (an added point OR a drag), not just
  // "remove the last item in the array" (which is wrong now that new points
  // can be inserted in the middle).
  const [pointsHistory, setPointsHistory] = useState([])
  // Time of the last drag release — the mouse-up that ends a drag can also
  // register as a map "click", which would drop an unwanted extra point
  // right where the vertex was released. Clicks right after a drag are ignored.
  const lastDragEndRef = useRef(0)

  const addBoundaryPoint = (pt) => {
    if (Date.now() - lastDragEndRef.current < 400) return
    setExistingBoundary(null)
    setPointsHistory(h => [...h, boundaryPoints])
    setBoundaryPoints(prev => insertPointSmart(prev, pt))
  }
  const updateBoundaryPoint = (index, newPt) => {
    lastDragEndRef.current = Date.now()
    setPointsHistory(h => [...h, boundaryPoints])
    setBoundaryPoints(prev => prev.map((pt, i) => i === index ? newPt : pt))
  }
  const undoBoundaryPoint = () => {
    if (pointsHistory.length === 0) { setBoundaryPoints(prev => prev.slice(0, -1)); return }
    setBoundaryPoints(pointsHistory[pointsHistory.length - 1])
    setPointsHistory(h => h.slice(0, -1))
  }
  const clearBoundary = () => { setBoundaryPoints([]); setPointsHistory([]); setExistingBoundary(null) }

  const handleSave = async () => {
    if (!form.name.trim() || !form.barangay_id) { alert('Purok name and barangay are required.'); return }
    if (!editing) {
      const isDuplicate = (barangays.find(b => String(b.id) === String(form.barangay_id))?.puroks || [])
        .some(p => p.name.toLowerCase() === form.name.trim().toLowerCase())
      if (isDuplicate && !window.confirm(`"${form.name}" already exists in this barangay. Add it again as a duplicate entry?`)) return
    }
    setSaving(true)
    try {
      const boundary_geojson = boundaryEditable ? (latLngsToGeojson(boundaryPoints) ?? (boundaryPoints.length === 0 ? null : existingBoundary)) : undefined
      const payload = { ...form, flood_threshold_m: parseFloat(form.flood_threshold_m) || 1.0, ...(boundary_geojson !== undefined ? { boundary_geojson } : {}) }
      if (editing) { await apiPut(`/puroks/${editing}`, payload) } else { await apiPost('/puroks', payload) }
      setShowModal(false); load()
    } catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="space-y-4">
      <div className="card p-4 flex gap-3 items-center justify-between">
        <div className="h-9 bg-gray-100 rounded flex-1 max-w-xs animate-pulse" />
        <div className="h-9 w-36 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>{['Purok', ...(isCdrrmo ? ['Barangay'] : []), 'Flood Risk','Flood Threshold (m)','Landslide Risk', ...(canAdd ? ['Actions'] : [])].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
          </thead>
          <tbody><SkeletonTableRows columns={isCdrrmo ? 5 : (canAdd ? 4 : 5)} rows={5} /></tbody>
        </table>
      </div>
    </div>
  )
  if (error) return <div className="card p-10 text-center text-red-600">{error}</div>

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search purok or barangay…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {canAdd && (
          <button className="btn-primary flex items-center gap-2 text-sm" onClick={openAdd}><Plus size={15} /> Add Purok</button>
        )}
      </div>
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200"><tr>{['Purok', ...(isCdrrmo ? ['Barangay'] : []), 'Flood Risk','Flood Threshold (m)','Landslide Risk','Boundary', ...(canAdd ? ['Actions'] : [])].map(h => <th key={h} className="table-head">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">{p.name}</td>
                  {isCdrrmo && <td className="table-cell">{p.barangay_name || '—'}</td>}
                  <td className="table-cell"><span className={RISK[p.flood_risk] || 'badge-gray'}>{p.flood_risk}</span></td>
                  <td className="table-cell text-center">{p.flood_threshold_m} m</td>
                  <td className="table-cell"><span className={RISK[p.landslide_risk] || 'badge-gray'}>{p.landslide_risk}</span></td>
                  <td className="table-cell text-xs text-gray-400">{p.boundary_geojson ? '✓ Drawn' : 'None'}</td>
                  {canAdd && (
                    <td className="table-cell">
                      <div className="flex gap-2">
                        <button className="p-1.5 rounded hover:bg-amber-50 text-amber-600" onClick={() => openEdit(p)}><Pencil size={15} /></button>
                        {!isCdrrmo && <button className="p-1.5 rounded hover:bg-red-50 text-red-600" onClick={() => handleDelete(p.id)}><Trash2 size={15} /></button>}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={isCdrrmo ? 6 : (canAdd ? 5 : 6)} className="table-cell text-center text-gray-400 py-6">No puroks found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <h3 className="text-lg font-semibold px-6 pt-6 pb-4 flex-shrink-0">{editing ? 'Edit Purok' : 'Add Purok'}</h3>

            <div className="overflow-y-auto px-6 pb-2 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Barangay</label>
                  <select className="input" value={form.barangay_id} onChange={e => { setForm({...form, barangay_id: e.target.value, name: ''}); setAddingNew(false) }} disabled={!!editing || !isCdrrmo}>
                    <option value="">Select barangay…</option>{barangays.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  {barangaysError && <p className="text-xs text-red-600 mt-1">Could not load barangay list: {barangaysError}</p>}
                </div>
                <div className="col-span-2">
                  <label className="label">Purok</label>
                  {!addingNew ? (
                    <select
                      className="input"
                      disabled={!form.barangay_id}
                      value={form.name}
                      onChange={e => {
                        if (e.target.value === '__new__') { setForm({...form, name: ''}); setAddingNew(true); return }
                        const match = (barangays.find(b => String(b.id) === String(form.barangay_id))?.puroks || [])
                          .find(p => p.name === e.target.value)
                        setForm({
                          ...form, name: e.target.value,
                          flood_risk: match?.flood_risk || 'Low',
                          flood_threshold_m: String(match?.flood_threshold_m ?? '1.0'),
                          landslide_risk: match?.landslide_risk || 'Low',
                        })
                      }}
                    >
                      <option value="">{form.barangay_id ? 'Select a purok…' : 'Select a barangay first'}</option>
                      {(barangays.find(b => String(b.id) === String(form.barangay_id))?.puroks || []).map(p => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                      {form.barangay_id && <option value="__new__">+ Add new purok…</option>}
                    </select>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        className="input"
                        autoFocus={!editing}
                        disabled={!!editing && isCdrrmo}
                        placeholder="Type new purok name…"
                        value={form.name}
                        onChange={e => setForm({...form, name: e.target.value})}
                      />
                      {!editing && <button type="button" className="btn-secondary whitespace-nowrap" onClick={() => { setAddingNew(false); setForm({...form, name: ''}) }}>Back to list</button>}
                    </div>
                  )}
                </div>
                {editing && isCdrrmo && (
                  <p className="text-xs text-gray-400 col-span-2 -mt-2">Purok name is set by the Barangay Official — view only here.</p>
                )}
                {isCdrrmo ? (
                  <>
                    <div><label className="label">Flood Risk (CDRA)</label><select className="input" value={form.flood_risk} onChange={e => setForm({...form, flood_risk: e.target.value})}><option>Low</option><option>Medium</option><option>High</option></select></div>
                    <div><label className="label">Flood Threshold (meters)</label><input className="input" type="number" step="0.1" value={form.flood_threshold_m} onChange={e => setForm({...form, flood_threshold_m: e.target.value})} /></div>
                    <div className="col-span-2"><label className="label">Landslide Risk (CDRA)</label><select className="input" value={form.landslide_risk} onChange={e => setForm({...form, landslide_risk: e.target.value})}><option>Low</option><option>Medium</option><option>High</option></select></div>
                  </>
                ) : (
                  <div className="col-span-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-2">Flood/Landslide Risk (CDRA) — set by CDRRMO only:</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className={RISK[form.flood_risk] || 'badge-gray'}>Flood: {form.flood_risk || 'Low'}</span>
                      <span className="badge-gray">Threshold: {form.flood_threshold_m || 1} m</span>
                      <span className={RISK[form.landslide_risk] || 'badge-gray'}>Landslide: {form.landslide_risk || 'Low'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Boundary drawing map — only whoever can rename the purok
                  (Barangay Official always; CDRRMO only for a brand-new one)
                  can draw or redraw its boundary, for the same reason: only
                  the barangay actually knows where their puroks are. */}
              {boundaryEditable && form.barangay_id && (
                <div>
                  <label className="label flex items-center gap-1.5"><MapPin size={13} /> Purok Boundary</label>
                  <p className="text-xs text-gray-500 mb-2">Click on the map to trace the boundary, point by point (needs at least 3). Drag any point afterward to fine-tune it.</p>
                  <div className="h-56 rounded-lg overflow-hidden border border-gray-200 relative">
                    <MapErrorBoundary>
                    <MapContainer center={GINGOOG_CENTER} zoom={13} className="w-full h-full">
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                      <BoundaryClickCapture onAddPoint={addBoundaryPoint} />

                      {/* Background reference: the barangay's own boundary
                          (light blue) — same as the pin on Register
                          Household, so it's immediately obvious this is the
                          right area even without picking the barangay by
                          name (it's already locked to their own). */}
                      {selectedBarangay?.boundary_geojson && (() => {
                        let geo
                        try { geo = JSON.parse(selectedBarangay.boundary_geojson) } catch { return null }
                        return (
                          <GeoJSON
                            key={`brgy-${selectedBarangay.id}`}
                            data={geo}
                            pathOptions={{ color: '#0ea5e9', weight: 2.5, fillColor: '#0ea5e9', fillOpacity: 0.06 }}
                            ref={setBarangayBoundaryLayer}
                          />
                        )
                      })()}

                      {/* The purok's own existing boundary, if it already
                          has one — shown only until the user starts
                          re-drawing (existingBoundary clears on first
                          click), at which point boundaryPoints takes over. */}
                      {existingBoundary && boundaryPoints.length === 0 && (() => {
                        let geo
                        try { geo = JSON.parse(existingBoundary) } catch { return null }
                        return <GeoJSON key="purok-existing" data={geo} pathOptions={{ color: '#2563eb', weight: 2, fillOpacity: 0.15 }} ref={setPurokBoundaryLayer} />
                      })()}

                      {/* Fit to whichever boundary is available, preferring
                          the purok's own (a tighter, more useful zoom) over
                          the barangay's if both exist. */}
                      <FitToBoundary geojsonLayer={purokBoundaryLayer || barangayBoundaryLayer} />

                      {boundaryPoints.map((pt, i) => (
                        <Marker
                          key={i}
                          position={pt}
                          icon={vertexIcon}
                          draggable
                          eventHandlers={{
                            // While dragging: move the line/polygon directly
                            // through Leaflet (no React re-render), so it
                            // follows the point live without re-rendering the
                            // whole map mid-drag — that re-rendering is what
                            // was occasionally crashing the page blank.
                            drag: (e) => {
                              const ll = e.target.getLatLng()
                              const pts = boundaryPoints.map((p, j) => j === i ? [ll.lat, ll.lng] : p)
                              if (shapeRef.current) shapeRef.current.setLatLngs(pts)
                            },
                            // On release: save the final position to state once.
                            dragend: (e) => { const ll = e.target.getLatLng(); updateBoundaryPoint(i, [ll.lat, ll.lng]) },
                          }}
                        />
                      ))}
                      {boundaryPoints.length >= 3
                        ? <Polygon ref={shapeRef} positions={boundaryPoints} pathOptions={{ color: '#2563eb', weight: 2, fillOpacity: 0.15 }} />
                        : boundaryPoints.length === 2
                          ? <Polyline ref={shapeRef} positions={boundaryPoints} pathOptions={{ color: '#2563eb', weight: 2 }} />
                          : null}
                    </MapContainer>
                    </MapErrorBoundary>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400">{boundaryPoints.length} point{boundaryPoints.length === 1 ? '' : 's'} placed</span>
                    <div className="flex gap-2">
                      <button type="button" onClick={undoBoundaryPoint} disabled={boundaryPoints.length === 0} className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1 disabled:opacity-40"><Undo2 size={12} /> Undo point</button>
                      <button type="button" onClick={clearBoundary} disabled={boundaryPoints.length === 0} className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1 disabled:opacity-40"><RotateCcw size={12} /> Clear</button>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-400">
                {isCdrrmo
                  ? 'Flood Risk and Threshold values are based on the CDRRMO\'s existing CDRA data and used for geofencing.'
                  : 'You can add or rename puroks and draw their boundary — the risk classification above is set by CDRRMO based on official CDRA data.'}
              </p>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button className="btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : (editing ? 'Save' : 'Add Purok')}</button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  )
}