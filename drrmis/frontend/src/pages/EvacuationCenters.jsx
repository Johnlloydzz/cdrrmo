import { useState, useEffect } from 'react'
import { Search, Plus, Pencil, Trash2 } from 'lucide-react'
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api'

const STATUS_BADGE = { Open: 'badge-green', Full: 'badge-red', Standby: 'badge-yellow', Closed: 'badge-gray' }
const Check = ({ v }) => <span className={v ? 'text-green-600' : 'text-gray-300'}>{v ? '✓' : '✗'}</span>
const emptyForm = { name: '', barangay_id: '', capacity: '', occupants: '', contact: '', has_medical: false, has_generator: false, has_kitchen: false, has_water: false, has_electricity: false, status: 'Standby' }

export default function EvacuationCenters() {
  const [centers, setCenters] = useState([])
  const [barangays, setBarangays] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const load = () => { setLoading(true); apiGet('/evacuation-centers').then(setCenters).catch(err => setError(err.message)).finally(() => setLoading(false)) }
  useEffect(() => { load(); apiGet('/barangays').then(setBarangays).catch(() => {}) }, [])

  const filtered = centers.filter(c => (c.name || '').toLowerCase().includes(search.toLowerCase()) || (c.barangay_name || '').toLowerCase().includes(search.toLowerCase()))

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (c) => {
    setEditing(c.id)
    setForm({ name: c.name || '', barangay_id: c.barangay_id || '', capacity: String(c.capacity || 0), occupants: String(c.occupants || 0), contact: c.contact || '', has_medical: !!c.has_medical, has_generator: !!c.has_generator, has_kitchen: !!c.has_kitchen, has_water: !!c.has_water, has_electricity: !!c.has_electricity, status: c.status || 'Standby' })
    setShowModal(true)
  }
  const handleDelete = async (id) => { if (!window.confirm('Delete this center?')) return; try { await apiDelete(`/evacuation-centers/${id}`); load() } catch (err) { alert(err.message) } }
  const handleSave = async () => {
    if (!form.name.trim() || !form.barangay_id) { alert('Name and barangay are required.'); return }
    setSaving(true)
    try {
      const payload = { ...form, capacity: +form.capacity || 0, occupants: +form.occupants || 0 }
      if (editing) { await apiPut(`/evacuation-centers/${editing}`, payload) } else { await apiPost('/evacuation-centers', payload) }
      setShowModal(false); load()
    } catch (err) { alert(err.message) } finally { setSaving(false) }
  }
  const toggle = (field) => setForm(f => ({ ...f, [field]: !f[field] }))

  if (loading) return <div className="card p-10 text-center text-gray-400">Loading evacuation centers…</div>
  if (error) return <div className="card p-10 text-center text-red-600">{error}</div>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-gray-800">{centers.length}</p><p className="text-xs text-gray-500 mt-1">Total Centers</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-green-600">{centers.filter(c => c.status === 'Open').length}</p><p className="text-xs text-gray-500 mt-1">Open</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-blue-600">{centers.reduce((a, c) => a + (c.occupants || 0), 0)}</p><p className="text-xs text-gray-500 mt-1">Current Occupants</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-gray-600">{centers.reduce((a, c) => a + ((c.capacity || 0) - (c.occupants || 0)), 0)}</p><p className="text-xs text-gray-500 mt-1">Available Space</p></div>
      </div>
      <div className="card p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search center or barangay…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn-primary flex items-center gap-2 text-sm" onClick={openAdd}><Plus size={15} /> Add Center</button>
      </div>
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200"><tr>{['Name','Barangay','Capacity','Occupants','Available','Contact','Med','Gen','Kitchen','Water','Elec','Status','Actions'].map(h => <th key={h} className="table-head">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium text-gray-800">{c.name}</td>
                  <td className="table-cell">{c.barangay_name || '—'}</td>
                  <td className="table-cell text-center">{c.capacity}</td>
                  <td className="table-cell text-center">{c.occupants}</td>
                  <td className="table-cell text-center">{c.capacity - c.occupants}</td>
                  <td className="table-cell">{c.contact}</td>
                  <td className="table-cell text-center"><Check v={c.has_medical} /></td>
                  <td className="table-cell text-center"><Check v={c.has_generator} /></td>
                  <td className="table-cell text-center"><Check v={c.has_kitchen} /></td>
                  <td className="table-cell text-center"><Check v={c.has_water} /></td>
                  <td className="table-cell text-center"><Check v={c.has_electricity} /></td>
                  <td className="table-cell"><span className={STATUS_BADGE[c.status]}>{c.status}</span></td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button className="p-1.5 rounded hover:bg-amber-50 text-amber-600" onClick={() => openEdit(c)}><Pencil size={15} /></button>
                      <button className="p-1.5 rounded hover:bg-red-50 text-red-600" onClick={() => handleDelete(c.id)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={13} className="table-cell text-center text-gray-400 py-6">No evacuation centers found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-5">{editing ? 'Edit Center' : 'Add Evacuation Center'}</h3>
            <div className="space-y-4">
              <div><label className="label">Center Name</label><input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div><label className="label">Barangay</label>
                <select className="input" value={form.barangay_id} onChange={e => setForm({...form, barangay_id: e.target.value})} disabled={!!editing}>
                  <option value="">Select barangay…</option>{barangays.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Capacity</label><input className="input" type="number" value={form.capacity} onChange={e => setForm({...form, capacity: e.target.value})} /></div>
                <div><label className="label">Current Occupants</label><input className="input" type="number" value={form.occupants} onChange={e => setForm({...form, occupants: e.target.value})} /></div>
              </div>
              <div><label className="label">Contact Person</label><input className="input" value={form.contact} onChange={e => setForm({...form, contact: e.target.value})} /></div>
              <div><label className="label">Status</label><select className="input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>{['Open','Full','Standby','Closed'].map(s => <option key={s}>{s}</option>)}</select></div>
              <div>
                <p className="label mb-2">Facilities</p>
                <div className="grid grid-cols-2 gap-2">
                  {[['has_medical','Medical'],['has_generator','Generator'],['has_kitchen','Kitchen'],['has_water','Water'],['has_electricity','Electricity']].map(([f,l]) => (
                    <label key={f} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form[f]} onChange={() => toggle(f)} className="w-4 h-4 rounded text-primary-600" /><span className="text-sm text-gray-700">{l}</span></label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button className="btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : (editing ? 'Save Changes' : 'Add Center')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}