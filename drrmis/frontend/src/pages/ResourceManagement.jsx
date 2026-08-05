import { useState, useEffect } from 'react'
import { Truck, Wrench, Users, Plus, Pencil, Trash2 } from 'lucide-react'
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api'

const STATUS_BADGE = { Available: 'badge-green', 'In Use': 'badge-orange', Maintenance: 'badge-red', Unavailable: 'badge-gray' }
const emptyResourceForm = { name: '', type: '', category: 'Vehicle', identifier: '', quantity: 1, available: 1, condition: 'Good', location: '', barangay_id: '', status: 'Available' }
const emptyPersonnelForm = { name: '', role: '', skills: '', contact: '', barangay_id: '', available: true }

export default function ResourceManagement() {
  const [tab, setTab] = useState('vehicles')
  const [resources, setResources] = useState([])
  const [personnel, setPersonnel] = useState([])
  const [barangays, setBarangays] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyResourceForm)

  const load = () => {
    setLoading(true)
    Promise.all([apiGet('/resources'), apiGet('/resources/personnel'), apiGet('/barangays')])
      .then(([r, p, b]) => { setResources(r); setPersonnel(p); setBarangays(b) })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const category = tab === 'vehicles' ? 'Vehicle' : 'Equipment'
  const filteredResources = resources.filter(r => r.category === category)

  const openAdd = () => {
    setEditing(null)
    setForm(tab === 'personnel' ? emptyPersonnelForm : { ...emptyResourceForm, category })
    setShowModal(true)
  }
  const openEdit = (item) => {
    setEditing(item.id)
    if (tab === 'personnel') setForm({ name: item.name || '', role: item.role || '', skills: item.skills || '', contact: item.contact || '', barangay_id: item.barangay_id || '', available: !!item.available })
    else setForm({ name: item.name || '', type: item.type || '', category: item.category, identifier: item.identifier || '', quantity: item.quantity || 1, available: item.available ?? 1, condition: item.condition || 'Good', location: item.location || '', barangay_id: item.barangay_id || '', status: item.status || 'Available' })
    setShowModal(true)
  }
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record?')) return
    try { await apiDelete(`/resources/${id}`); load() } catch (err) { alert(err.message) }
  }

  const handleSave = async () => {
    if (!form.name.trim()) { alert('Name is required.'); return }
    setSaving(true)
    try {
      if (tab === 'personnel') {
        await apiPost('/resources/personnel', form)
      } else if (editing) {
        await apiPut(`/resources/${editing}`, form)
      } else {
        await apiPost('/resources', form)
      }
      setShowModal(false)
      load()
    } catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  if (loading) return <div className="card p-10 text-center text-gray-400">Loading resources…</div>
  if (error) return <div className="card p-10 text-center text-red-600">{error}</div>

  return (
    <div className="space-y-4">
      <div className="card p-2 flex gap-2">
        {[['vehicles','Vehicles',Truck],['equipment','Equipment',Wrench],['personnel','Personnel',Users]].map(([id,label,Icon]) => (
          <button key={id} onClick={() => setTab(id)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${tab === id ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <button className="btn-primary flex items-center gap-2 text-sm" onClick={openAdd}><Plus size={15} /> Add {tab === 'personnel' ? 'Personnel' : tab === 'vehicles' ? 'Vehicle' : 'Equipment'}</button>
      </div>

      {tab !== 'personnel' ? (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200"><tr>{['Name','Type','Identifier','Qty','Available','Condition','Location','Barangay','Status','Actions'].map(h => <th key={h} className="table-head">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {filteredResources.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium">{r.name}</td>
                    <td className="table-cell">{r.type}</td>
                    <td className="table-cell font-mono text-xs">{r.identifier}</td>
                    <td className="table-cell text-center">{r.quantity}</td>
                    <td className="table-cell text-center">{r.available}</td>
                    <td className="table-cell">{r.condition}</td>
                    <td className="table-cell">{r.location}</td>
                    <td className="table-cell">{barangays.find(b => b.id === r.barangay_id)?.name || '—'}</td>
                    <td className="table-cell"><span className={STATUS_BADGE[r.status] || 'badge-gray'}>{r.status}</span></td>
                    <td className="table-cell">
                      <div className="flex gap-2">
                        <button className="p-1.5 rounded hover:bg-amber-50 text-amber-600" onClick={() => openEdit(r)}><Pencil size={15} /></button>
                        <button className="p-1.5 rounded hover:bg-red-50 text-red-600" onClick={() => handleDelete(r.id)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredResources.length === 0 && <tr><td colSpan={10} className="table-cell text-center text-gray-400 py-6">No records found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200"><tr>{['Name','Role','Skills','Contact','Barangay','Available'].map(h => <th key={h} className="table-head">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {personnel.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium">{p.name}</td>
                    <td className="table-cell">{p.role}</td>
                    <td className="table-cell">{p.skills}</td>
                    <td className="table-cell">{p.contact}</td>
                    <td className="table-cell">{barangays.find(b => b.id === p.barangay_id)?.name || '—'}</td>
                    <td className="table-cell"><span className={p.available ? 'badge-green' : 'badge-gray'}>{p.available ? 'Available' : 'Unavailable'}</span></td>
                  </tr>
                ))}
                {personnel.length === 0 && <tr><td colSpan={6} className="table-cell text-center text-gray-400 py-6">No personnel found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-5">Add {tab === 'personnel' ? 'Personnel' : tab === 'vehicles' ? 'Vehicle' : 'Equipment'}</h3>
            {tab === 'personnel' ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="label">Name</label><input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                <div><label className="label">Role</label><input className="input" value={form.role} onChange={e => setForm({...form, role: e.target.value})} /></div>
                <div><label className="label">Contact</label><input className="input" value={form.contact} onChange={e => setForm({...form, contact: e.target.value})} /></div>
                <div className="col-span-2"><label className="label">Skills</label><input className="input" value={form.skills} onChange={e => setForm({...form, skills: e.target.value})} /></div>
                <div className="col-span-2"><label className="label">Barangay</label><select className="input" value={form.barangay_id} onChange={e => setForm({...form, barangay_id: e.target.value})}><option value="">Select barangay…</option>{barangays.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="label">Name</label><input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                <div><label className="label">Type</label><input className="input" value={form.type} onChange={e => setForm({...form, type: e.target.value})} /></div>
                <div><label className="label">Identifier</label><input className="input" value={form.identifier} onChange={e => setForm({...form, identifier: e.target.value})} placeholder="Plate #, Serial #" /></div>
                <div><label className="label">Quantity</label><input className="input" type="number" value={form.quantity} onChange={e => setForm({...form, quantity: +e.target.value})} /></div>
                <div><label className="label">Available</label><input className="input" type="number" value={form.available} onChange={e => setForm({...form, available: +e.target.value})} /></div>
                <div><label className="label">Condition</label><select className="input" value={form.condition} onChange={e => setForm({...form, condition: e.target.value})}>{['Good','Fair','Poor'].map(c => <option key={c}>{c}</option>)}</select></div>
                <div><label className="label">Status</label><select className="input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>{['Available','In Use','Maintenance','Unavailable'].map(s => <option key={s}>{s}</option>)}</select></div>
                <div><label className="label">Location</label><input className="input" value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></div>
                <div><label className="label">Barangay</label><select className="input" value={form.barangay_id} onChange={e => setForm({...form, barangay_id: e.target.value})}><option value="">Select barangay…</option>{barangays.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
              </div>
            )}
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