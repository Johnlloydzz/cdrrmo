import { useState, useEffect, Fragment } from 'react'
import { createPortal } from 'react-dom'
import { GeoJSON } from 'react-leaflet'
import { Search, Pencil, Building2, Waves, Mountain, RotateCcw } from 'lucide-react'
import { apiGet, apiPut } from '../utils/api'
import PolygonEditor, { geojsonToLatLngs, latLngsToGeojson, simplifyPoints } from '../components/editor'
import { SkeletonTableRows } from '../components/Skeleton'

// Badge colors matched to the official MGB Landslide and Flood Susceptibility Map legend.
// Landslide: brown (Very High) → red (High) → green (Moderate) → yellow (Low)
// Flood:     navy (Very High) → violet (High) → purple (Moderate) → blue (Low)
const LANDSLIDE_BADGE = { 'Very High': 'badge-brown', High: 'badge-red', Moderate: 'badge-green', Low: 'badge-yellow' }
const FLOOD_BADGE = { 'Very High': 'badge-navy', High: 'badge-violet', Moderate: 'badge-purple', Low: 'badge-blue' }
const emptyForm = { name: '', flood_susceptibility: 'Low', landslide_susceptibility: 'Low' }

// EXACT same colors and fallback as GIS Map / Flood Simulation Control /
// Dashboard, so what you see while editing is exactly what those maps show.
const FLOOD_COLOR = { High: '#7c3aed', Low: '#d6c9a8' }
const LANDSLIDE_COLOR = { High: '#dc2626', Moderate: '#15803d', Low: '#eab308' }
const hazardColors = (key) => key === 'flood' ? FLOOD_COLOR : LANDSLIDE_COLOR
const levelColor = (key, level) => hazardColors(key)[level] || hazardColors(key).Low

// Starting shape for a hazard area: the saved custom area if there is one,
// otherwise the whole barangay boundary (simplified to a manageable number
// of draggable points).
function initialArea(b, key) {
  const custom = b[`${key}_area_geojson`]
  if (custom) return { points: geojsonToLatLngs(custom), custom: true }
  return { points: simplifyPoints(geojsonToLatLngs(b.boundary_geojson), 60), custom: false }
}

export default function BarangayManagement() {
  const [barangays, setBarangays] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [editingBarangay, setEditingBarangay] = useState(null)
  const [areaTab, setAreaTab] = useState('flood')
  // Per hazard: current points + whether it's been customized (false = the
  // whole barangay, saved as null).
  const [areas, setAreas] = useState({ flood: { points: [], custom: false }, landslide: { points: [], custom: false } })

  const load = () => { setLoading(true); apiGet('/barangays').then(setBarangays).catch(err => setError(err.message)).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  const filtered = barangays.filter(b => (b.name || '').toLowerCase().includes(search.toLowerCase()))

  const openEdit = (b) => {
    setEditing(b.id)
    setEditingBarangay(b)
    setForm({
      name: b.name || '',
      flood_susceptibility: b.flood_susceptibility || 'Low',
      landslide_susceptibility: b.landslide_susceptibility || 'Low',
    })
    setAreaTab('flood')
    if (b.boundary_geojson) setAreas({ flood: initialArea(b, 'flood'), landslide: initialArea(b, 'landslide') })
    setShowModal(true)
  }

  const setAreaPoints = (key, points) => setAreas(a => ({ ...a, [key]: { points, custom: true } }))
  const resetArea = (key) => setAreas(a => ({ ...a, [key]: { points: simplifyPoints(geojsonToLatLngs(editingBarangay.boundary_geojson), 60), custom: false } }))

  const handleSave = async () => {
    const payload = { ...form }
    if (editingBarangay?.boundary_geojson) {
      for (const key of ['flood', 'landslide']) {
        const a = areas[key]
        if (a.custom && a.points.length < 3) {
          alert(`The ${key} area needs at least 3 points (or click "Use whole barangay").`); setAreaTab(key); return
        }
        payload[`${key}_area_geojson`] = a.custom ? latLngsToGeojson(a.points) : null
      }
    }
    setSaving(true)
    try {
      await apiPut(`/barangays/${editing}`, payload)
      setShowModal(false); load()
    } catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="space-y-4">
      <div className="card p-4"><div className="h-9 bg-gray-100 rounded max-w-xs animate-pulse" /></div>
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>{['Barangay','Population','Flood Susceptibility (CDRA)','Landslide Susceptibility (CDRA)','Boundary','Actions'].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
          </thead>
          <tbody><SkeletonTableRows columns={6} rows={6} /></tbody>
        </table>
      </div>
    </div>
  )
  if (error) return <div className="card p-10 text-center text-red-600">{error}</div>

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search barangay…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['Barangay','Captain','Contact','Population (live)','Flood Susceptibility (CDRA)','Landslide Susceptibility (CDRA)','Boundary','Actions'].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium"><span className="flex items-center gap-1.5"><Building2 size={13} className="text-primary-500" />{b.name}</span></td>
                  <td className="table-cell">{b.captain_name || '—'}</td>
                  <td className="table-cell">{b.contact_number || '—'}</td>
                  <td className="table-cell">{(b.resident_count || 0).toLocaleString()}</td>
                  <td className="table-cell"><span className={FLOOD_BADGE[b.flood_susceptibility] || 'badge-gray'}>{b.flood_susceptibility}</span></td>
                  <td className="table-cell"><span className={LANDSLIDE_BADGE[b.landslide_susceptibility] || 'badge-gray'}>{b.landslide_susceptibility}</span></td>
                  <td className="table-cell text-xs text-gray-400">
                    {b.boundary_geojson ? '✓ Loaded' : 'None'}
                    {(b.flood_area_geojson || b.landslide_area_geojson) && (
                      <span className="block text-primary-600">Adjusted: {[b.flood_area_geojson && 'flood', b.landslide_area_geojson && 'landslide'].filter(Boolean).join(', ')}</span>
                    )}
                  </td>
                  <td className="table-cell"><button className="p-1.5 rounded hover:bg-amber-50 text-amber-600" onClick={() => openEdit(b)}><Pencil size={15} /></button></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8} className="table-cell text-center text-gray-400 py-6">No barangays found.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t text-xs text-gray-500">{filtered.length} of {barangays.length} barangays</div>
      </div>

      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
            <h3 className="text-lg font-semibold px-6 pt-6 pb-4 flex-shrink-0">Edit Barangay</h3>
            <div className="overflow-y-auto px-6 pb-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><label className="label">Barangay Name</label><input className="input bg-gray-50 text-gray-500" value={form.name} disabled /></div>
                <div>
                  <label className="label">Flood Susceptibility (CDRA)</label>
                  <select className="input" value={form.flood_susceptibility} onChange={e => setForm({...form, flood_susceptibility: e.target.value})}>
                    <option>Low</option><option>Moderate</option><option>High</option><option>Very High</option>
                  </select>
                </div>
                <div>
                  <label className="label">Landslide Susceptibility (CDRA)</label>
                  <select className="input" value={form.landslide_susceptibility} onChange={e => setForm({...form, landslide_susceptibility: e.target.value})}>
                    <option>Low</option><option>Moderate</option><option>High</option><option>Very High</option>
                  </select>
                </div>
              </div>

              {/* Hazard area — starts as the whole barangay; drag points to
                  shrink it to the part that actually floods / slides, based
                  on CDRRMO's hazard map. Only this shape gets colored on the
                  maps. */}
              {editingBarangay?.boundary_geojson ? (
                <div>
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                    <label className="label mb-0">Hazard Area</label>
                    <div className="flex gap-2">
                      {[['flood', 'Flood', Waves], ['landslide', 'Landslide', Mountain]].map(([key, label, Icon]) => (
                        <button key={key} type="button" onClick={() => setAreaTab(key)}
                          className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors ${areaTab === key ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                          <Icon size={12} /> {label} {areas[key].custom ? '(adjusted)' : '(whole)'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    Starts as the whole barangay. Drag the points to cover only the part that is actually affected — click on the map to add a point. The dashed line is the full barangay boundary.
                  </p>
                  <PolygonEditor
                    key={`${editing}-${areaTab}`}
                    points={areas[areaTab].points}
                    onChange={pts => setAreaPoints(areaTab, pts)}
                    color={levelColor(areaTab, areaTab === 'flood' ? form.flood_susceptibility : form.landslide_susceptibility)}
                    heightClass="h-[42vh]"
                  >
                    {/* Every OTHER barangay, colored exactly like the GIS Map
                        does for this hazard — including areas you've already
                        adjusted — so you can see the whole picture while
                        editing. Non-interactive, so clicks still add points. */}
                    {barangays.filter(b => b.id !== editing && b.boundary_geojson).map(b => {
                      let geo
                      try { geo = JSON.parse(b.boundary_geojson) } catch { return null }
                      const color = levelColor(areaTab, areaTab === 'flood' ? b.flood_susceptibility : b.landslide_susceptibility)
                      const areaStr = areaTab === 'flood' ? b.flood_area_geojson : b.landslide_area_geojson
                      let area = null
                      if (areaStr) { try { area = JSON.parse(areaStr) } catch { area = null } }
                      return (
                        <Fragment key={`ref-${areaTab}-${b.id}`}>
                          <GeoJSON data={geo} interactive={false} pathOptions={{ color: '#555', weight: 0.5, fillColor: area ? hazardColors(areaTab).Low : color, fillOpacity: 0.55 }} />
                          {area && <GeoJSON data={area} interactive={false} pathOptions={{ color: '#555', weight: 0.5, fillColor: color, fillOpacity: 0.6 }} />}
                        </Fragment>
                      )
                    })}
                    {/* This barangay: outside the adjusted area shows as Low
                        (same as the maps); dashed line = its full boundary. */}
                    {(() => {
                      let geo
                      try { geo = JSON.parse(editingBarangay.boundary_geojson) } catch { return null }
                      return (
                        <GeoJSON key={`self-${areaTab}-${areas[areaTab].custom}`} data={geo} interactive={false}
                          pathOptions={{ color: '#1e293b', weight: 2, dashArray: '5, 4', fillColor: hazardColors(areaTab).Low, fillOpacity: areas[areaTab].custom ? 0.55 : 0 }} />
                      )
                    })()}
                  </PolygonEditor>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                    {Object.entries(hazardColors(areaTab)).map(([lvl, c]) => (
                      <span key={lvl} className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: c }} /> {lvl}</span>
                    ))}
                  </div>
                  {areas[areaTab].custom && (
                    <button type="button" onClick={() => resetArea(areaTab)} className="btn-secondary text-xs px-2.5 py-1.5 mt-2 flex items-center gap-1">
                      <RotateCcw size={12} /> Use whole barangay
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-xs text-amber-600">This barangay has no boundary on file, so its hazard area can't be adjusted yet.</p>
              )}

              <p className="text-xs text-gray-400">Population is computed live from registered residents. Captain name and contact number are set by the Barangay Official. Classification is encoded from the CDRRMO's CDRA maps.</p>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button className="btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  )
}