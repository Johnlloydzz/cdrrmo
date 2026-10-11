// CLUP Landslide & Flood Susceptibility Map as REAL, editable colored areas
// (GIS Map → Map Layers → "CLUP Landslide & Flood Map").
//
// The areas were traced from the CLUP 2020–2029 map and clipped to the
// city's barangay boundaries. CDRRMO Personnel can fix them on the map:
//   • click an area → change its color, drag its points, save or delete it
//   • drag a small (half) dot between two points → adds a new point there
//   • double-click a point → removes it
//   • "Add new area" → click points on the map, then pick its color
// Areas are drawn biggest first, so a smaller area always sits on top of a
// bigger one (that is how "holes" of another color work).
// Display only — these areas do not change flood alerts or geofencing.

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, GeoJSON, Polygon, Polyline, Marker, Pane, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { Pencil, Plus, Trash2, Save, X, RotateCcw, Check } from 'lucide-react'
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api'
import { getStoredUser } from '../utils/storage'

export const CLUP_HAZARDS = [
  { code: 'HL', color: '#dc2626', label: 'High Susceptibility to Landslide' },
  { code: 'ML', color: '#15803d', label: 'Moderate Susceptibility to Landslide' },
  { code: 'LL', color: '#eab308', label: 'Low Susceptibility to Landslide' },
  { code: 'HF', color: '#7c3aed', label: 'High Susceptibility of Flooding' },
  { code: 'LF', color: '#d6c9a8', label: 'Low Susceptibility of Flooding' },
]
const COLOR = Object.fromEntries(CLUP_HAZARDS.map(h => [h.code, h.color]))
const LABEL = Object.fromEntries(CLUP_HAZARDS.map(h => [h.code, h.label]))

// GeoJSON ring [lng,lat] (closed) <-> Leaflet points [lat,lng] (open)
const toLatLngs = g => g.coordinates[0].slice(0, -1).map(([lng, lat]) => [lat, lng])
const toGeojson = pts => ({ type: 'Polygon', coordinates: [[...pts.map(([lat, lng]) => [lng, lat]), [pts[0][1], pts[0][0]]]] })

const vertexIcon = new L.DivIcon({ className: '', html: '<div style="width:10px;height:10px;background:#fff;border:2px solid #111827;border-radius:2px;box-shadow:0 0 2px rgba(0,0,0,.5)"></div>', iconSize: [10, 10], iconAnchor: [5, 5] })
const midIcon = new L.DivIcon({ className: '', html: '<div style="width:8px;height:8px;background:rgba(255,255,255,.6);border:1px solid #111827;border-radius:50%"></div>', iconSize: [8, 8], iconAnchor: [4, 4] })
const drawIcon = new L.DivIcon({ className: '', html: '<div style="width:10px;height:10px;background:#0ea5e9;border:2px solid #fff;border-radius:50%;box-shadow:0 0 2px rgba(0,0,0,.6)"></div>', iconSize: [10, 10], iconAnchor: [5, 5] })

// All state lives here; GISMap passes it to both the map layer and the panel.
export function useClupZones(active) {
  const user = getStoredUser()
  const canEdit = user?.role === 'CDRRMO Personnel'
  const [zones, setZones] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [draft, setDraft] = useState(null)       // { hazard, points } for the selected area while editing
  const [drawing, setDrawing] = useState(null)   // points of a new area being drawn
  const [newHazard, setNewHazard] = useState('HL')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!active || loaded) return
    apiGet('/clup-zones').then(z => { setZones(z); setLoaded(true) }).catch(e => setError(e.message || 'Could not load the CLUP map.'))
  }, [active, loaded])

  useEffect(() => { if (!active) { setEditMode(false); setSelectedId(null); setDraft(null); setDrawing(null) } }, [active])

  const select = useCallback((z) => {
    if (drawing) return
    setSelectedId(z.id); setDraft({ hazard: z.hazard, points: toLatLngs(z.geojson) }); setError('')
  }, [drawing])
  const cancel = () => { setSelectedId(null); setDraft(null); setError('') }

  const run = async (fn) => { setBusy(true); setError(''); try { await fn() } catch (e) { setError(e.message || 'Something went wrong.') } finally { setBusy(false) } }

  const save = () => run(async () => {
    if (!draft || draft.points.length < 3) throw new Error('An area needs at least 3 points.')
    const row = await apiPut(`/clup-zones/${selectedId}`, { hazard: draft.hazard, geojson: toGeojson(draft.points) })
    setZones(zs => zs.map(z => z.id === row.id ? row : z)); cancel()
  })
  const remove = () => run(async () => {
    if (!window.confirm('Delete this colored area?')) return
    await apiDelete(`/clup-zones/${selectedId}`)
    setZones(zs => zs.filter(z => z.id !== selectedId)); cancel()
  })
  const finishDrawing = () => run(async () => {
    if (!drawing || drawing.length < 3) throw new Error('Click at least 3 points on the map.')
    const row = await apiPost('/clup-zones', { hazard: newHazard, geojson: toGeojson(drawing) })
    setZones(zs => [...zs, row]); setDrawing(null)
  })
  const reset = () => run(async () => {
    if (!window.confirm('Put back the original CLUP areas? All your edits on this map will be removed.')) return
    const z = await apiPost('/clup-zones/reset', {})
    setZones(z); cancel(); setDrawing(null)
  })

  return { zones, loaded, error, canEdit, editMode, setEditMode, selectedId, draft, setDraft, drawing, setDrawing, newHazard, setNewHazard, busy, select, cancel, save, remove, finishDrawing, reset }
}

function DrawClicks({ s }) {
  useMapEvents({ click: e => { if (s.drawing) s.setDrawing(d => [...d, [e.latlng.lat, e.latlng.lng]]) } })
  return null
}

// Map part — goes inside <MapContainer>.
export function ClupZonesLayer({ s }) {
  const { zones, editMode, selectedId, draft, setDraft, drawing } = s
  // In edit mode the areas sit above the boundary lines so they can be clicked.
  const pane = editMode ? 'clup-edit' : 'clup-view'

  const shown = useMemo(() => zones.filter(z => z.id !== selectedId), [zones, selectedId])

  const movePoint = (i, ll) => setDraft(d => ({ ...d, points: d.points.map((p, j) => j === i ? [ll.lat, ll.lng] : p) }))
  const insertPoint = (i, ll) => setDraft(d => { const pts = [...d.points]; pts.splice(i + 1, 0, [ll.lat, ll.lng]); return { ...d, points: pts } })
  const removePoint = (i) => setDraft(d => d.points.length <= 3 ? d : ({ ...d, points: d.points.filter((_, j) => j !== i) }))

  return (
    <>
      {/* Areas are solid inside these panes and the whole pane is see-through,
          so a small area on top of a big one does not look darker. */}
      <Pane name="clup-view" style={{ zIndex: 350, opacity: 0.6 }} />
      <Pane name="clup-edit" style={{ zIndex: 450, opacity: 0.65 }} />
      <Pane name="clup-handles" style={{ zIndex: 650 }} />
      {shown.map(z => (
        <Polygon
          key={`${pane}-${z.id}-${z.updated_at}`}
          pane={pane}
          positions={toLatLngs(z.geojson)}
          interactive={editMode}
          pathOptions={{ color: editMode ? '#ffffff' : COLOR[z.hazard], weight: editMode ? 0.8 : 0.5, fillColor: COLOR[z.hazard], fillOpacity: 1 }}
          eventHandlers={editMode ? { click: (e) => {
            L.DomEvent.stopPropagation(e)
            // While drawing a new area, a click on an existing area adds a point.
            if (s.drawing) s.setDrawing(d => [...d, [e.latlng.lat, e.latlng.lng]])
            else s.select(z)
          } } : undefined}
        />
      ))}

      {draft && (
        <>
          <Polygon pane="clup-edit" positions={draft.points} interactive={false}
            pathOptions={{ color: '#111827', weight: 3, dashArray: '6 4', fillColor: COLOR[draft.hazard], fillOpacity: 1 }} />
          {draft.points.map((p, i) => (
            <Marker key={`v-${i}-${draft.points.length}`} position={p} icon={vertexIcon} draggable pane="clup-handles"
              eventHandlers={{ drag: e => movePoint(i, e.target.getLatLng()), dblclick: e => { L.DomEvent.stopPropagation(e); removePoint(i) } }} />
          ))}
          {draft.points.map((p, i) => {
            const q = draft.points[(i + 1) % draft.points.length]
            return (
              <Marker key={`m-${i}-${draft.points.length}`} position={[(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]} icon={midIcon} draggable pane="clup-handles"
                eventHandlers={{ dragend: e => insertPoint(i, e.target.getLatLng()) }} />
            )
          })}
        </>
      )}

      {drawing && (
        <>
          <DrawClicks s={s} />
          {drawing.length >= 2 && <Polyline pane="clup-handles" positions={drawing.length >= 3 ? [...drawing, drawing[0]] : drawing} pathOptions={{ color: '#0ea5e9', weight: 2.5, dashArray: '6 4' }} />}
          {drawing.length >= 3 && <Polygon pane="clup-edit" positions={drawing} interactive={false} pathOptions={{ stroke: false, fillColor: COLOR[s.newHazard], fillOpacity: 1 }} />}
          {drawing.map((p, i) => <Marker key={`d-${i}`} position={p} icon={drawIcon} pane="clup-handles" interactive={false} />)}
        </>
      )}
    </>
  )
}

function ColorChoices({ value, onChange }) {
  return (
    <div className="space-y-1">
      {CLUP_HAZARDS.map(h => (
        <label key={h.code} className={`flex items-center gap-2 text-xs cursor-pointer rounded px-1.5 py-1 ${value === h.code ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'}`}>
          <input type="radio" checked={value === h.code} onChange={() => onChange(h.code)} />
          <span className="w-3 h-3 rounded-sm flex-shrink-0 border border-black/10" style={{ background: h.color }} />
          {h.label}
        </label>
      ))}
    </div>
  )
}

// Legend + editing tools — goes in the side panel.
export function ClupPanel({ s }) {
  const { canEdit, editMode, setEditMode, draft, setDraft, drawing, setDrawing, busy, error, loaded } = s
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">CLUP 2020–2029 Susceptibility Map</p>
      {!editMode && CLUP_HAZARDS.map(h => (
        <div key={h.code} className="flex items-center gap-2 text-xs">
          <span className="w-3 h-3 rounded-sm flex-shrink-0 border border-black/10" style={{ background: h.color }} />
          {h.label}
        </div>
      ))}
      {!loaded && !error && <p className="text-[11px] text-gray-400">Loading map…</p>}

      {canEdit && !editMode && (
        <button type="button" onClick={() => setEditMode(true)} className="btn-secondary w-full text-xs py-1.5 flex items-center justify-center gap-1.5">
          <Pencil size={13} /> Edit CLUP colors
        </button>
      )}

      {canEdit && editMode && (
        <div className="rounded-lg border border-primary-200 bg-primary-50/40 p-2.5 space-y-2">
          {!draft && !drawing && (
            <>
              <p className="text-[11px] text-gray-600 leading-snug">Click a colored area on the map to change its color or shape.</p>
              <button type="button" onClick={() => setDrawing([])} className="btn-secondary w-full text-xs py-1.5 flex items-center justify-center gap-1.5"><Plus size={13} /> Add new area</button>
              <div className="flex gap-1.5">
                <button type="button" disabled={busy} onClick={s.reset} className="flex-1 text-[11px] text-gray-500 hover:text-red-600 flex items-center justify-center gap-1 py-1"><RotateCcw size={12} /> Reset to CLUP original</button>
                <button type="button" onClick={() => setEditMode(false)} className="flex-1 btn-primary text-xs py-1.5 flex items-center justify-center gap-1"><Check size={13} /> Done</button>
              </div>
            </>
          )}

          {draft && (
            <>
              <p className="text-xs font-semibold">Selected area · {LABEL[draft.hazard]}</p>
              <ColorChoices value={draft.hazard} onChange={h => setDraft(d => ({ ...d, hazard: h }))} />
              <p className="text-[10px] text-gray-500 leading-snug">Drag the white squares to move the edge. Drag a small dot to add a point. Double-click a square to remove it.</p>
              <div className="flex gap-1.5">
                <button type="button" disabled={busy} onClick={s.save} className="flex-1 btn-primary text-xs py-1.5 flex items-center justify-center gap-1"><Save size={13} /> Save changes</button>
                <button type="button" disabled={busy} onClick={s.cancel} className="flex-1 btn-secondary text-xs py-1.5 flex items-center justify-center gap-1"><X size={13} /> Cancel</button>
              </div>
              <button type="button" disabled={busy} onClick={s.remove} className="w-full text-[11px] text-red-600 hover:text-red-700 flex items-center justify-center gap-1 py-1"><Trash2 size={12} /> Delete this area</button>
            </>
          )}

          {drawing && (
            <>
              <p className="text-xs font-semibold">New area — click points on the map ({drawing.length})</p>
              <ColorChoices value={s.newHazard} onChange={s.setNewHazard} />
              <div className="flex gap-1.5">
                <button type="button" disabled={busy || drawing.length < 3} onClick={s.finishDrawing} className="flex-1 btn-primary text-xs py-1.5 flex items-center justify-center gap-1"><Save size={13} /> Save area</button>
                <button type="button" disabled={busy} onClick={() => setDrawing(d => d.slice(0, -1))} className="btn-secondary text-xs py-1.5 px-2">Undo</button>
                <button type="button" disabled={busy} onClick={() => setDrawing(null)} className="btn-secondary text-xs py-1.5 px-2"><X size={13} /></button>
              </div>
            </>
          )}
        </div>
      )}
      {error && <p className="text-[11px] text-red-600" role="alert">{error}</p>}
      <p className="text-[10px] text-gray-400 leading-snug">Source: Gingoog City CLUP (CPDO/MGB), traced from the printed map. Display only — does not change flood alerts.</p>
    </div>
  )
}
// ── Small map for the Barangays → Edit Barangay → "CLUP Map" tab ─────────────
// Shows the CLUP colored areas around one barangay (its boundary = dashed
// line) with the same editing tools as the GIS Map.
function FitToBoundary({ geo }) {
  const map = useMap()
  const done = useRef(false)
  useEffect(() => {
    if (done.current || !geo) return
    done.current = true
    const fit = () => { try { map.invalidateSize(); map.fitBounds(L.geoJSON(geo).getBounds(), { padding: [20, 20], animate: false }) } catch { /* ignore */ } }
    fit()
    const t = [150, 400].map(ms => setTimeout(fit, ms))
    return () => t.forEach(clearTimeout)
  }, [map, geo])
  useEffect(() => {
    const obs = new ResizeObserver(() => map.invalidateSize())
    obs.observe(map.getContainer())
    return () => obs.disconnect()
  }, [map])
  return null
}

export function ClupEditorMap({ s, boundary, others = [], heightClass = 'h-[42vh]' }) {
  const geo = useMemo(() => { try { return typeof boundary === 'string' ? JSON.parse(boundary) : boundary } catch { return null } }, [boundary])
  const otherGeos = useMemo(() => others.map(o => { try { return { id: o.id, geo: JSON.parse(o.boundary_geojson) } } catch { return null } }).filter(Boolean), [others])
  return (
    <div className={`${heightClass} rounded-lg overflow-hidden border border-gray-200 relative`}>
      <MapContainer center={[8.8231, 125.1109]} zoom={13} className="w-full h-full">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
        <FitToBoundary geo={geo} />
        {otherGeos.map(o => <GeoJSON key={`o-${o.id}`} data={o.geo} interactive={false} pathOptions={{ color: '#475569', weight: 1, fillOpacity: 0 }} />)}
        {geo && <GeoJSON data={geo} interactive={false} pathOptions={{ color: '#0f172a', weight: 2.5, dashArray: '6 4', fillOpacity: 0 }} />}
        <ClupZonesLayer s={s} />
      </MapContainer>
    </div>
  )
}