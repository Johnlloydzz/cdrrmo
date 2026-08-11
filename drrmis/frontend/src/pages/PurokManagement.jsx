import { useState, useEffect } from 'react'
import { Search, Plus, Pencil, Trash2 } from 'lucide-react'
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api'

const RISK = { High: 'badge-red', Medium: 'badge-orange', Low: 'badge-green' }
const emptyForm = { barangay_id: '', name: '', flood_risk: 'Low', flood_threshold_m: '1.0', landslide_risk: 'Low' }

export default function PurokManagement() {
  const [puroks, setPuroks] = useState([])
  const [barangays, setBarangays] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const load = () => {
    setLoading(true)
    apiGet('/puroks').then(setPuroks).catch(err => setError(err.message)).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    apiGet('/barangays').then(setBarangays).catch(() => {})
  }, [])

  const filtered = puroks.filter(p => (p.name || '').toLowerCase().includes(search.toLowerCase()) || (p.barangay_name || '').toLowerCase().includes(search.toLowerCase()))

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (p) => {
    setEditing(p.id)
    setForm({ barangay_id: p.barangay_id || '', name: p.name || '', flood_risk: p.flood_risk || 'Low', flood_threshold_m: String(p.flood_threshold_m ?? '1.0'), landslide_risk: p.landslide_risk || 'Low' })
    setShowModal(true)
  }
  const handleDelete = async (id) => { if (!window.confirm('Delete this purok?')) return; try { await apiDelete(`/puroks/${id}`); load() } catch (err) { alert(err.message) } }
  const handleSave = async () => {
    if (!form.name.trim() || !form.barangay_id) { alert('Purok name and barangay are required.'); return }
    setSaving(true)
    try {
      const payload = { ...form, flood_threshold_m: parseFloat(form.flood_threshold_m) || 1.0 }
      if (editing) { await apiPut(`/puroks/${editing}`, payload) } else { await apiPost('/puroks', payload) }
      setShowModal(false); load()
    } catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  if (loading) return <div className="card p-10 text-center text-gray-400">Loading puroks…</div>
  if (error) return <div className="card p-10 text-center text-red-600">{error}</div>

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search purok or barangay…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn-primary flex items-center gap-2 text-sm" onClick={openAdd}><Plus size={15} /> Add Purok</button>
      </div>
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200"><tr>{['Purok Name','Barangay','Flood Risk','Flood Threshold (m)','Landslide Risk','Actions'].map(h => <th key={h} className="table-head">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">{p.name}</td>
                  <td className="table-cell">{p.barangay_name || '—'}</td>
                  <td className="table-cell"><span className={RISK[p.flood_risk] || 'badge-gray'}>{p.flood_risk}</span></td>
                  <td className="table-cell text-center">{p.flood_threshold_m} m</td>
                  <td className="table-cell"><span className={RISK[p.landslide_risk] || 'badge-gray'}>{p.landslide_risk}</span></td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button className="p-1.5 rounded hover:bg-amber-50 text-amber-600" onClick={() => openEdit(p)}><Pencil size={15} /></button>
                      <button className="p-1.5 rounded hover:bg-red-50 text-red-600" onClick={() => handleDelete(p.id)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="table-cell text-center text-gray-400 py-6">No puroks found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-5">{editing ? 'Edit Purok' : 'Add Purok'}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className="label">Purok Name</label><input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div className="col-span-2">
                <label className="label">Barangay</label>
                <select className="input" value={form.barangay_id} onChange={e => setForm({...form, barangay_id: e.target.value})} disabled={!!editing}>
                  <option value="">Select barangay…</option>{barangays.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div><label className="label">Flood Risk (CDRA)</label><select className="input" value={form.flood_risk} onChange={e => setForm({...form, flood_risk: e.target.value})}><option>Low</option><option>Medium</option><option>High</option></select></div>
              <div><label className="label">Flood Threshold (meters)</label><input className="input" type="number" step="0.1" value={form.flood_threshold_m} onChange={e => setForm({...form, flood_threshold_m: e.target.value})} /></div>
              <div className="col-span-2"><label className="label">Landslide Risk (CDRA)</label><select className="input" value={form.landslide_risk} onChange={e => setForm({...form, landslide_risk: e.target.value})}><option>Low</option><option>Medium</option><option>High</option></select></div>
            </div>
            <p className="text-xs text-gray-400 mt-3">Flood Risk and Threshold values are based on the CDRRMO's existing CDRA data and used for geofencing.</p>
            <div className="flex justify-end gap-3 mt-6">
              <button className="btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : (editing ? 'Save' : 'Add Purok')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}