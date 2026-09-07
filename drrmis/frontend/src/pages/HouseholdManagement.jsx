import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, GeoJSON, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { Search, Plus, Eye, Pencil, Trash2, MapPin } from 'lucide-react'
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const GINGOOG_CENTER = [8.8231, 125.1109]

// Captures a click anywhere on the embedded map and reports the coordinates —
// this is how the Barangay Official pins exactly where a household is
// located, since they're the ones who actually know.
function LocationPicker({ onPick }) {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng) } })
  return null
}

// Flies the embedded map to the selected barangay's boundary — but only if
// no location has been pinned yet, so it never overrides the zoom-in view
// of an already-saved household location.
function FitToBarangayBoundary({ geojsonLayer, hasPin }) {
  const map = useMap()
  useEffect(() => {
    if (hasPin || !geojsonLayer) return
    const bounds = geojsonLayer.getBounds()
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] })
  }, [geojsonLayer, hasPin, map])
  return null
}

const emptyForm = { barangay_id: '', purok_id: '', head_family: '', contact: '', latitude: '', longitude: '' }

export default function HouseholdManagement({ currentUser }) {
  const canAdd = currentUser?.role === 'Barangay Official'
  const [households, setHouseholds] = useState([])
  const [barangays, setBarangays] = useState([])
  const [puroks, setPuroks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [selectedBoundaryLayer, setSelectedBoundaryLayer] = useState(null)

  const load = () => {
    setLoading(true)
    apiGet('/households').then(setHouseholds).catch(err => setError(err.message)).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    apiGet('/barangays').then(setBarangays).catch(() => {})
    apiGet('/puroks').then(setPuroks).catch(() => {})
  }, [])

  const filtered = households.filter(h =>
    (h.head_family || '').toLowerCase().includes(search.toLowerCase()) ||
    (h.barangay_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (h.household_id || '').toLowerCase().includes(search.toLowerCase())
  )

  const puroksForBarangay = (barangayId) => puroks.filter(p => String(p.barangay_id) === String(barangayId))

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (h) => {
    setEditing(h.id)
    setForm({
      barangay_id: h.barangay_id || '', purok_id: h.purok_id || '', head_family: h.head_family || '',
      contact: h.contact || '', latitude: h.latitude || '', longitude: h.longitude || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this household record?')) return
    try { await apiDelete(`/households/${id}`); load() } catch (err) { alert(err.message) }
  }

  const handleSave = async () => {
    if (!form.head_family.trim() || !form.barangay_id || !form.purok_id) {
      alert('Head of family, barangay, and purok are required.'); return
    }
    setSaving(true)
    try {
      if (editing) { await apiPut(`/households/${editing}`, form) }
      else { await apiPost('/households', form) }
      setShowModal(false)
      load()
    } catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  if (loading) return <div className="card p-10 text-center text-gray-400">Loading households…</div>
  if (error) return <div className="card p-10 text-center text-red-600">{error}</div>

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search household, head, barangay…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {canAdd && (
          <button className="btn-primary flex items-center gap-2 text-sm" onClick={openAdd}><Plus size={15} /> Register Household</button>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['HH ID', ...(canAdd ? [] : ['Barangay']), 'Purok','Head of Family','Contact', ...(canAdd ? ['Actions'] : [])].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(h => (
                <tr key={h.id} className="hover:bg-gray-50">
                  <td className="table-cell font-mono text-primary-700">{h.household_id}</td>
                  {!canAdd && <td className="table-cell">{h.barangay_name || '—'}</td>}
                  <td className="table-cell">
                    {h.purok_name || '—'}
                    {h.in_flood_risk_zone && <span className="badge-red text-xs ml-2">High Risk</span>}
                  </td>
                  <td className="table-cell font-medium">{h.head_family}</td>
                  <td className="table-cell">{h.contact}</td>
                  {canAdd && (
                    <td className="table-cell">
                      <div className="flex gap-2">
                        <button className="p-1.5 rounded hover:bg-amber-50 text-amber-600" onClick={() => openEdit(h)}><Pencil size={15} /></button>
                        <button className="p-1.5 rounded hover:bg-red-50 text-red-600" onClick={() => handleDelete(h.id)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={5} className="table-cell text-center text-gray-400 py-6">No households found.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t text-xs text-gray-500">{filtered.length} of {households.length} households</div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: '90vh' }}>
            <h3 className="text-lg font-semibold px-6 pt-6 flex-shrink-0">{editing ? 'Edit Household' : 'Register Household'}</h3>
            <div className="overflow-y-auto px-6 py-4 flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Barangay</label>
                  <select className="input" value={form.barangay_id} onChange={e => setForm({...form, barangay_id: e.target.value, purok_id: ''})} disabled={!!editing}>
                    <option value="">Select barangay…</option>
                    {barangays.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Purok</label>
                  <select className="input" value={form.purok_id} onChange={e => setForm({...form, purok_id: e.target.value})} disabled={!form.barangay_id}>
                    <option value="">Select purok…</option>
                    {puroksForBarangay(form.barangay_id).map(p => <option key={p.id} value={p.id}>{p.name} ({p.flood_risk} risk)</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="label">Head of Family</label>
                  <input className="input" value={form.head_family} onChange={e => setForm({...form, head_family: e.target.value})} />
                  <p className="text-xs text-gray-400 mt-1">Add the head's birthdate and other family members in Resident Management.</p>
                </div>
                <div><label className="label">Contact</label><input className="input" value={form.contact} onChange={e => setForm({...form, contact: e.target.value})} /></div>
                <div className="col-span-2">
                  <label className="label flex items-center gap-1.5"><MapPin size={14} /> Household Location</label>
                  <p className="text-xs text-gray-400 mb-2">Click on the map below at exactly where this family lives.</p>
                  <div className="h-56 rounded-lg overflow-hidden border border-gray-200">
                    <MapContainer
                      center={form.latitude && form.longitude ? [Number(form.latitude), Number(form.longitude)] : GINGOOG_CENTER}
                      zoom={form.latitude && form.longitude ? 17 : 13}
                      className="w-full h-full"
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                      <LocationPicker onPick={(lat, lng) => setForm(f => ({ ...f, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }))} />
                      {(() => {
                        const brgy = barangays.find(b => String(b.id) === String(form.barangay_id))
                        if (!brgy?.boundary_geojson) return null
                        let geo
                        try { geo = JSON.parse(brgy.boundary_geojson) } catch { return null }
                        return (
                          <>
                            <GeoJSON
                              key={brgy.id}
                              data={geo}
                              pathOptions={{ color: '#0ea5e9', weight: 2.5, fillColor: '#0ea5e9', fillOpacity: 0.08 }}
                              ref={setSelectedBoundaryLayer}
                            />
                            <FitToBarangayBoundary geojsonLayer={selectedBoundaryLayer} hasPin={!!(form.latitude && form.longitude)} />
                          </>
                        )
                      })()}
                      {form.latitude && form.longitude && (
                        <Marker position={[Number(form.latitude), Number(form.longitude)]} />
                      )}
                    </MapContainer>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {form.latitude && form.longitude ? `Pinned: ${form.latitude}, ${form.longitude}` : 'No location pinned yet.'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6 pt-2 flex-shrink-0 border-t border-gray-100">
              <button className="btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}