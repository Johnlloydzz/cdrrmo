import { useState, useEffect } from 'react'
import { Search, Plus, Eye, Pencil, Trash2 } from 'lucide-react'
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api'

const RISK = { High: 'badge-red', Medium: 'badge-orange', Low: 'badge-green' }
const emptyForm = { barangay_id: '', purok_id: '', house_number: '', head_family: '', contact: '', house_type: 'Concrete', roof_type: 'GI Sheet', wall_type: '', risk_level: 'Low', latitude: '', longitude: '' }

export default function HouseholdManagement() {
  const [households, setHouseholds] = useState([])
  const [barangays, setBarangays] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const load = () => { setLoading(true); apiGet('/households').then(setHouseholds).catch(err => setError(err.message)).finally(() => setLoading(false)) }
  useEffect(() => { load(); apiGet('/barangays').then(setBarangays).catch(() => {}) }, [])

  const filtered = households.filter(h => (h.head_family || '').toLowerCase().includes(search.toLowerCase()) || (h.barangay_name || '').toLowerCase().includes(search.toLowerCase()) || (h.household_id || '').toLowerCase().includes(search.toLowerCase()))

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (h) => {
    setEditing(h.id)
    setForm({ barangay_id: h.barangay_id || '', purok_id: h.purok_id || '', house_number: h.house_number || '', head_family: h.head_family || '', contact: h.contact || '', house_type: h.house_type || 'Concrete', roof_type: h.roof_type || 'GI Sheet', wall_type: h.wall_type || '', risk_level: h.risk_level || 'Low', latitude: h.latitude || '', longitude: h.longitude || '' })
    setShowModal(true)
  }
  const handleDelete = async (id) => { if (!window.confirm('Delete this household record?')) return; try { await apiDelete(`/households/${id}`); load() } catch (err) { alert(err.message) } }
  const handleSave = async () => {
    if (!form.head_family.trim() || !form.barangay_id) { alert('Head of family and barangay are required.'); return }
    setSaving(true)
    try { if (editing) { await apiPut(`/households/${editing}`, form) } else { await apiPost('/households', form) } setShowModal(false); load() }
    catch (err) { alert(err.message) } finally { setSaving(false) }
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
        <button className="btn-primary flex items-center gap-2 text-sm" onClick={openAdd}><Plus size={15} /> Register Household</button>
      </div>
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200"><tr>{['HH ID','Barangay','Head of Family','Contact','House Type','Roof Type','Risk','Actions'].map(h => <th key={h} className="table-head">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(h => (
                <tr key={h.id} className="hover:bg-gray-50">
                  <td className="table-cell font-mono text-primary-700">{h.household_id}</td>
                  <td className="table-cell">{h.barangay_name || '—'}</td>
                  <td className="table-cell font-medium">{h.head_family}</td>
                  <td className="table-cell">{h.contact}</td>
                  <td className="table-cell">{h.house_type}</td>
                  <td className="table-cell">{h.roof_type}</td>
                  <td className="table-cell"><span className={RISK[h.risk_level] || 'badge-gray'}>{h.risk_level}</span></td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><Eye size={15} /></button>
                      <button className="p-1.5 rounded hover:bg-amber-50 text-amber-600" onClick={() => openEdit(h)}><Pencil size={15} /></button>
                      <button className="p-1.5 rounded hover:bg-red-50 text-red-600" onClick={() => handleDelete(h.id)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8} className="table-cell text-center text-gray-400 py-6">No households found.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t text-xs text-gray-500">{filtered.length} of {households.length} households</div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-5">{editing ? 'Edit Household' : 'Register Household'}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Barangay</label>
                <select className="input" value={form.barangay_id} onChange={e => setForm({...form, barangay_id: e.target.value})} disabled={!!editing}>
                  <option value="">Select barangay…</option>{barangays.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div><label className="label">House Number</label><input className="input" value={form.house_number} onChange={e => setForm({...form, house_number: e.target.value})} /></div>
              <div><label className="label">Head of Family</label><input className="input" value={form.head_family} onChange={e => setForm({...form, head_family: e.target.value})} /></div>
              <div><label className="label">Contact</label><input className="input" value={form.contact} onChange={e => setForm({...form, contact: e.target.value})} /></div>
              <div><label className="label">House Type</label><select className="input" value={form.house_type} onChange={e => setForm({...form, house_type: e.target.value})}>{['Concrete','Wooden','Mixed','Makeshift'].map(t => <option key={t}>{t}</option>)}</select></div>
              <div><label className="label">Roof Type</label><select className="input" value={form.roof_type} onChange={e => setForm({...form, roof_type: e.target.value})}>{['GI Sheet','Concrete','Nipa','Tarpaulin'].map(t => <option key={t}>{t}</option>)}</select></div>
              <div><label className="label">Risk Level</label><select className="input" value={form.risk_level} onChange={e => setForm({...form, risk_level: e.target.value})}>{['Low','Medium','High'].map(r => <option key={r}>{r}</option>)}</select></div>
              <div><label className="label">Latitude</label><input className="input" value={form.latitude} onChange={e => setForm({...form, latitude: e.target.value})} /></div>
              <div><label className="label">Longitude</label><input className="input" value={form.longitude} onChange={e => setForm({...form, longitude: e.target.value})} /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button className="btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}