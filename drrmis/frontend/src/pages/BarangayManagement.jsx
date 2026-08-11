import { useState, useEffect } from 'react'
import { Search, Plus, Pencil, Trash2, Building2 } from 'lucide-react'
import { apiGet, apiPost, apiPut } from '../utils/api'

const RISK_BADGE = { High: 'badge-red', Moderate: 'badge-orange', Low: 'badge-green' }
const emptyForm = { name: '', population: '', flood_susceptibility: 'Low', landslide_susceptibility: 'Low' }

export default function BarangayManagement() {
  const [barangays, setBarangays] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const load = () => { setLoading(true); apiGet('/barangays').then(setBarangays).catch(err => setError(err.message)).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  const filtered = barangays.filter(b => (b.name || '').toLowerCase().includes(search.toLowerCase()))

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (b) => {
    setEditing(b.id)
    setForm({
      name: b.name || '', population: String(b.population || 0),
      flood_susceptibility: b.flood_susceptibility || 'Low',
      landslide_susceptibility: b.landslide_susceptibility || 'Low',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { alert('Barangay name is required.'); return }
    setSaving(true)
    try {
      const payload = { ...form, population: +form.population || 0 }
      if (editing) { await apiPut(`/barangays/${editing}`, payload) } else { await apiPost('/barangays', payload) }
      setShowModal(false); load()
    } catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  if (loading) return <div className="card p-10 text-center text-gray-400">Loading barangays…</div>
  if (error) return <div className="card p-10 text-center text-red-600">{error}</div>

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search barangay…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn-primary flex items-center gap-2 text-sm" onClick={openAdd}><Plus size={15} /> Add Barangay</button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['Barangay','Population','Flood Susceptibility (CDRA)','Landslide Susceptibility (CDRA)','Boundary','Actions'].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium"><span className="flex items-center gap-1.5"><Building2 size={13} className="text-primary-500" />{b.name}</span></td>
                  <td className="table-cell">{(b.population || 0).toLocaleString()}</td>
                  <td className="table-cell"><span className={RISK_BADGE[b.flood_susceptibility] || 'badge-gray'}>{b.flood_susceptibility}</span></td>
                  <td className="table-cell"><span className={RISK_BADGE[b.landslide_susceptibility] || 'badge-gray'}>{b.landslide_susceptibility}</span></td>
                  <td className="table-cell text-xs text-gray-400">{b.boundary_geojson ? '✓ Loaded' : 'None'}</td>
                  <td className="table-cell"><button className="p-1.5 rounded hover:bg-amber-50 text-amber-600" onClick={() => openEdit(b)}><Pencil size={15} /></button></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="table-cell text-center text-gray-400 py-6">No barangays found.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t text-xs text-gray-500">{filtered.length} of {barangays.length} barangays</div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-5">{editing ? 'Edit Barangay' : 'Add Barangay'}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className="label">Barangay Name</label><input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} disabled={!!editing} /></div>
              <div className="col-span-2"><label className="label">Population</label><input className="input" type="number" value={form.population} onChange={e => setForm({...form, population: e.target.value})} /></div>
              <div>
                <label className="label">Flood Susceptibility (CDRA)</label>
                <select className="input" value={form.flood_susceptibility} onChange={e => setForm({...form, flood_susceptibility: e.target.value})}>
                  <option>Low</option><option>High</option>
                </select>
              </div>
              <div>
                <label className="label">Landslide Susceptibility (CDRA)</label>
                <select className="input" value={form.landslide_susceptibility} onChange={e => setForm({...form, landslide_susceptibility: e.target.value})}>
                  <option>Low</option><option>Moderate</option><option>High</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">Classification is manually encoded from the CDRRMO's existing CDRA (Climate and Disaster Risk Assessment) maps.</p>
            <div className="flex justify-end gap-3 mt-6">
              <button className="btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : (editing ? 'Save' : 'Add Barangay')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}