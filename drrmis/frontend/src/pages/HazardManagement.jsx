import { useState, useEffect } from 'react'
import { Search, Plus, Eye, Pencil, Trash2, ShieldAlert } from 'lucide-react'
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api'

const SEVERITY = { Critical: 'badge-red', High: 'badge-orange', Moderate: 'badge-yellow', Low: 'badge-green' }
const STATUS_B = { Active: 'badge-red', Monitoring: 'badge-orange', Resolved: 'badge-green', Closed: 'badge-gray' }

const emptyForm = { type_id: '', severity: 'Moderate', barangay_id: '', purok: '', reporter: '', reported_date: '', status: 'Active', description: '' }

export default function HazardManagement({ currentUser }) {
  const canReport = currentUser?.role === 'Barangay Admin'
  const [hazards, setHazards] = useState([])
  const [types, setTypes] = useState([])
  const [barangays, setBarangays] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const loadHazards = () => {
    setLoading(true)
    apiGet('/hazards')
      .then(setHazards)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadHazards()
    apiGet('/hazards/types').then(setTypes).catch(() => {})
    apiGet('/barangays').then(setBarangays).catch(() => {})
  }, [])

  const filtered = hazards.filter(h =>
    (h.type_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (h.barangay_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (h.hazard_code || '').toLowerCase().includes(search.toLowerCase())
  )

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (h) => {
    setEditing(h.id)
    setForm({
      type_id: h.type_id || '', severity: h.severity || 'Moderate', barangay_id: h.barangay_id || '',
      purok: h.purok || '', reporter: h.reporter || '', reported_date: h.reported_date || '',
      status: h.status || 'Active', description: h.description || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this hazard report?')) return
    try { await apiDelete(`/hazards/${id}`); loadHazards() } catch (err) { alert(err.message) }
  }

  const handleSave = async () => {
    if (!form.barangay_id) { alert('Please select a barangay.'); return }
    setSaving(true)
    try {
      if (editing) {
        await apiPut(`/hazards/${editing}`, { severity: form.severity, status: form.status, description: form.description })
      } else {
        await apiPost('/hazards', {
          type_id: form.type_id || null, severity: form.severity, barangay_id: form.barangay_id, purok_id: null,
          description: form.description, reporter: form.reporter,
          reported_date: form.reported_date || new Date().toISOString().slice(0, 10), status: form.status,
        })
      }
      setShowModal(false)
      loadHazards()
    } catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  if (loading) return <div className="card p-10 text-center text-gray-400">Loading hazards…</div>
  if (error) return <div className="card p-10 text-center text-red-600">{error}</div>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Hazards', value: hazards.length, c: 'text-gray-800' },
          { label: 'Active', value: hazards.filter(h => h.status === 'Active').length, c: 'text-red-600' },
          { label: 'Monitoring', value: hazards.filter(h => h.status === 'Monitoring').length, c: 'text-orange-600' },
          { label: 'Resolved', value: hazards.filter(h => h.status === 'Resolved').length, c: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center"><p className={`text-2xl font-bold ${s.c}`}>{s.value}</p><p className="text-xs text-gray-500 mt-1">{s.label}</p></div>
        ))}
      </div>

      <div className="card p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search hazard, barangay…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {canReport && (<button className="btn-primary flex items-center gap-2 text-sm" onClick={openAdd}><Plus size={15} /> Report Hazard</button>)}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['ID','Type','Severity','Barangay','Reporter','Date','Status','Description','Actions'].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(h => (
                <tr key={h.id} className="hover:bg-gray-50">
                  <td className="table-cell font-mono text-primary-700">{h.hazard_code}</td>
                  <td className="table-cell"><span className="flex items-center gap-1.5"><ShieldAlert size={13} className="text-red-400" />{h.type_name || '—'}</span></td>
                  <td className="table-cell"><span className={SEVERITY[h.severity]}>{h.severity}</span></td>
                  <td className="table-cell">{h.barangay_name || '—'}</td>
                  <td className="table-cell">{h.reporter || '—'}</td>
                  <td className="table-cell">{h.reported_date}</td>
                  <td className="table-cell"><span className={STATUS_B[h.status]}>{h.status}</span></td>
                  <td className="table-cell max-w-xs truncate text-xs text-gray-600">{h.description}</td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><Eye size={15} /></button>
                      <button className="p-1.5 rounded hover:bg-amber-50 text-amber-600" onClick={() => openEdit(h)}><Pencil size={15} /></button>
                      <button className="p-1.5 rounded hover:bg-red-50 text-red-600" onClick={() => handleDelete(h.id)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={9} className="table-cell text-center text-gray-400 py-6">No hazards found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-5">{editing ? 'Edit Hazard' : 'Report Hazard'}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Hazard Type</label>
                <select className="input" value={form.type_id} onChange={e => setForm({...form, type_id: e.target.value})} disabled={!!editing}>
                  <option value="">Select type…</option>
                  {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Severity</label>
                <select className="input" value={form.severity} onChange={e => setForm({...form, severity: e.target.value})}>
                  {['Critical','High','Moderate','Low'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Barangay</label>
                <select className="input" value={form.barangay_id} onChange={e => setForm({...form, barangay_id: e.target.value})} disabled={!!editing}>
                  <option value="">Select barangay…</option>
                  {barangays.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div><label className="label">Reporter</label><input className="input" value={form.reporter} onChange={e => setForm({...form, reporter: e.target.value})} disabled={!!editing} /></div>
              <div><label className="label">Date</label><input className="input" type="date" value={form.reported_date} onChange={e => setForm({...form, reported_date: e.target.value})} disabled={!!editing} /></div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  {['Active','Monitoring','Resolved','Closed'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-span-2"><label className="label">Description</label><textarea className="input" rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button className="btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : (editing ? 'Save' : 'Report')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}