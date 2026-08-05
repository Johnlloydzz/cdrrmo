import { useState, useEffect } from 'react'
import { Search, Plus, Eye, Pencil, AlertTriangle, CheckCircle, MapPin } from 'lucide-react'
import { ROLE_PERMISSIONS } from '../data/users'
import { apiGet, apiPost, apiPut } from '../utils/api'

const STATUS_BADGE = { Reported: 'badge-gray', Verified: 'badge-blue', Assigned: 'badge-yellow', Responding: 'badge-orange', Resolved: 'badge-green', Closed: 'badge-gray' }
const PRIORITY_BADGE = { Critical: 'badge-red', High: 'badge-orange', Medium: 'badge-yellow', Low: 'badge-green' }
const RESPONDER_STATUSES = ['Responding', 'Resolved']
const emptyForm = { hazard_id: '', barangay_id: '', incident_date: '', incident_time: '', reporter: '', assigned_team: '', priority: 'Medium', status: 'Reported', remarks: '' }

export default function IncidentManagement({ currentUser }) {
  const role = currentUser?.role || ''
  const perms = ROLE_PERMISSIONS[role] || {}
  const isResponder = role === 'Field Responder'

  const [incidents, setIncidents] = useState([])
  const [hazards, setHazards] = useState([])
  const [barangays, setBarangays] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [statusUpdate, setStatusUpdate] = useState({ status: 'Responding', remarks: '' })

  const loadIncidents = () => {
    setLoading(true)
    apiGet('/incidents').then(setIncidents).catch(err => setError(err.message)).finally(() => setLoading(false))
  }

  useEffect(() => {
    loadIncidents()
    apiGet('/hazards').then(setHazards).catch(() => {})
    apiGet('/barangays').then(setBarangays).catch(() => {})
  }, [])

  const filtered = incidents.filter(i =>
    ((i.incident_no || '').toLowerCase().includes(search.toLowerCase()) ||
     (i.barangay_name || '').toLowerCase().includes(search.toLowerCase()) ||
     (i.hazard_type || '').toLowerCase().includes(search.toLowerCase())) &&
    (filterStatus === 'All' || i.status === filterStatus)
  )

  const openAdd = () => { setSelected(null); setForm({ ...emptyForm, reporter: currentUser?.name || '' }); setShowModal(true) }
  const openEdit = (inc) => {
    setSelected(inc.id)
    setForm({
      hazard_id: inc.hazard_id || '', barangay_id: inc.barangay_id || '', incident_date: inc.incident_date || '',
      incident_time: inc.incident_time || '', reporter: inc.reporter || '', assigned_team: inc.assigned_team || '',
      priority: inc.priority || 'Medium', status: inc.status || 'Reported', remarks: inc.remarks || '',
    })
    setShowModal(true)
  }
  const openStatusUpdate = (inc) => {
    setSelected(inc.id)
    setStatusUpdate({ status: inc.status === 'Assigned' ? 'Responding' : 'Resolved', remarks: '' })
    setShowStatusModal(true)
  }

  const handleSave = async () => {
    if (!form.barangay_id) { alert('Please select a barangay.'); return }
    setSaving(true)
    try {
      if (selected) {
        await apiPut(`/incidents/${selected}`, { assigned_team: form.assigned_team, priority: form.priority, status: form.status, remarks: form.remarks })
      } else {
        await apiPost('/incidents', {
          hazard_id: form.hazard_id || null, barangay_id: form.barangay_id, purok_id: null,
          incident_date: form.incident_date || new Date().toISOString().slice(0, 10), incident_time: form.incident_time,
          reporter: form.reporter, assigned_team: form.assigned_team, priority: form.priority, status: form.status, remarks: form.remarks,
        })
      }
      setShowModal(false)
      loadIncidents()
    } catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  const handleStatusSave = async () => {
    try {
      const inc = incidents.find(i => i.id === selected)
      await apiPut(`/incidents/${selected}`, { assigned_team: inc?.assigned_team, priority: inc?.priority, status: statusUpdate.status, remarks: statusUpdate.remarks || inc?.remarks })
      setShowStatusModal(false)
      loadIncidents()
    } catch (err) { alert(err.message) }
  }

  if (loading) return <div className="card p-10 text-center text-gray-400">Loading incidents…</div>
  if (error) return <div className="card p-10 text-center text-red-600">{error}</div>

  return (
    <div className="space-y-4">
      {isResponder && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center gap-3 text-sm text-orange-800">
          <MapPin size={16} className="flex-shrink-0 text-orange-500" />
          <span>Field Responder view — you can update incident status and mark incidents as resolved.</span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', count: incidents.length, color: 'text-gray-700' },
          { label: 'Open', count: incidents.filter(i => !['Resolved','Closed'].includes(i.status)).length, color: 'text-orange-600' },
          { label: 'Resolved', count: incidents.filter(i => i.status === 'Resolved').length, color: 'text-green-600' },
          { label: 'Critical', count: incidents.filter(i => i.priority === 'Critical').length, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center"><p className={`text-3xl font-bold ${s.color}`}>{s.count}</p><p className="text-xs text-gray-500 mt-1">{s.label} Incidents</p></div>
        ))}
      </div>

      <div className="card p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3 flex-wrap flex-1">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9" placeholder="Search by ID, barangay, hazard…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="All">All Status</option>
            {['Reported','Verified','Assigned','Responding','Resolved','Closed'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        {perms.canCreate && (<button className="btn-primary flex items-center gap-2 text-sm" onClick={openAdd}><Plus size={15} /> Log Incident</button>)}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['Incident #','Date','Hazard','Barangay','Reporter','Team','Priority','Status','Actions'].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(i => (
                <tr key={i.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-cell font-mono font-medium text-primary-700">{i.incident_no}</td>
                  <td className="table-cell whitespace-nowrap">{i.incident_date} {i.incident_time}</td>
                  <td className="table-cell"><span className="flex items-center gap-1"><AlertTriangle size={13} className="text-amber-500" />{i.hazard_type || '—'}</span></td>
                  <td className="table-cell">{i.barangay_name || '—'}</td>
                  <td className="table-cell">{i.reporter}</td>
                  <td className="table-cell">{i.assigned_team || '—'}</td>
                  <td className="table-cell"><span className={PRIORITY_BADGE[i.priority]}>{i.priority}</span></td>
                  <td className="table-cell"><span className={STATUS_BADGE[i.status]}>{i.status}</span></td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title="View"><Eye size={15} /></button>
                      {perms.canEdit && !isResponder && (<button className="p-1.5 rounded hover:bg-amber-50 text-amber-600" title="Edit" onClick={() => openEdit(i)}><Pencil size={15} /></button>)}
                      {isResponder && !['Resolved','Closed'].includes(i.status) && (
                        <button className="p-1.5 rounded hover:bg-green-50 text-green-600 flex items-center gap-1 text-xs font-medium" title="Update Status" onClick={() => openStatusUpdate(i)}>
                          <CheckCircle size={15} /> Update
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={9} className="table-cell text-center text-gray-400 py-8">No incidents found.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">Showing {filtered.length} of {incidents.length} incidents</div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-5">{selected ? 'Edit Incident' : 'Log Incident'}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Date</label><input className="input" type="date" value={form.incident_date} onChange={e => setForm({...form, incident_date: e.target.value})} disabled={!!selected} /></div>
              <div><label className="label">Time</label><input className="input" type="time" value={form.incident_time} onChange={e => setForm({...form, incident_time: e.target.value})} disabled={!!selected} /></div>
              <div>
                <label className="label">Related Hazard</label>
                <select className="input" value={form.hazard_id} onChange={e => setForm({...form, hazard_id: e.target.value})} disabled={!!selected}>
                  <option value="">None / not linked</option>
                  {hazards.map(h => <option key={h.id} value={h.id}>{h.hazard_code} — {h.type_name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Barangay</label>
                <select className="input" value={form.barangay_id} onChange={e => setForm({...form, barangay_id: e.target.value})} disabled={!!selected}>
                  <option value="">Select barangay…</option>
                  {barangays.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div><label className="label">Reporter</label><input className="input" value={form.reporter} onChange={e => setForm({...form, reporter: e.target.value})} disabled={!!selected} /></div>
              <div><label className="label">Assigned Team</label><input className="input" value={form.assigned_team} onChange={e => setForm({...form, assigned_team: e.target.value})} /></div>
              <div>
                <label className="label">Priority</label>
                <select className="input" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>{['Critical','High','Medium','Low'].map(p => <option key={p}>{p}</option>)}</select>
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>{['Reported','Verified','Assigned','Responding','Resolved','Closed'].map(s => <option key={s}>{s}</option>)}</select>
              </div>
              <div className="col-span-2"><label className="label">Remarks</label><textarea className="input" rows={3} value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})} /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button className="btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : (selected ? 'Save Changes' : 'Log Incident')}</button>
            </div>
          </div>
        </div>
      )}

      {showStatusModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-1 flex items-center gap-2"><CheckCircle size={18} className="text-green-600" /> Update Incident Status</h3>
            <p className="text-sm text-gray-500 mb-5">Incident ID: <strong>{selected}</strong></p>
            <div className="space-y-4">
              <div>
                <label className="label">New Status</label>
                <select className="input" value={statusUpdate.status} onChange={e => setStatusUpdate({...statusUpdate, status: e.target.value})}>
                  {RESPONDER_STATUSES.map(s => <option key={s}>{s}</option>)}<option>Closed</option>
                </select>
              </div>
              <div><label className="label">Update Notes</label><textarea className="input" rows={3} placeholder="Describe current situation, actions taken…" value={statusUpdate.remarks} onChange={e => setStatusUpdate({...statusUpdate, remarks: e.target.value})} /></div>
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">
                <MapPin size={14} className="flex-shrink-0" /> GPS Location: <span className="font-mono ml-1">8.8231° N, 125.1109° E</span>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button className="btn-secondary" onClick={() => setShowStatusModal(false)}>Cancel</button>
              <button className="btn-primary flex items-center gap-2" onClick={handleStatusSave}><CheckCircle size={15} /> Mark {statusUpdate.status}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}