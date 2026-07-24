import { useState } from 'react'
import { Search, Plus, Eye, Pencil, AlertTriangle, Download, CheckCircle, MapPin } from 'lucide-react'
import { ROLE_PERMISSIONS } from '../data/users'

const STATUS_BADGE = {
  Reported:   'badge-gray',
  Verified:   'badge-blue',
  Assigned:   'badge-yellow',
  Responding: 'badge-orange',
  Resolved:   'badge-green',
  Closed:     'badge-gray',
}
const PRIORITY_BADGE = { Critical: 'badge-red', High: 'badge-orange', Medium: 'badge-yellow', Low: 'badge-green' }

const initialIncidents = [
  { id: 'INC-001', date: '2026-07-13', time: '08:14', hazard: 'Flood',         barangay: 'Kioskos',      purok: 'Purok 2',  reporter: 'Brgy. Admin', team: 'Team Alpha', priority: 'Critical', status: 'Responding', remarks: 'Rising water levels near riverbank.' },
  { id: 'INC-002', date: '2026-07-12', time: '14:30', hazard: 'Landslide',     barangay: 'Magsaysay',    purok: 'Purok 1',  reporter: 'Field Agent', team: 'Team Bravo', priority: 'High',     status: 'Resolved',   remarks: 'Road partially blocked.' },
  { id: 'INC-003', date: '2026-07-11', time: '22:05', hazard: 'Fire',          barangay: 'Barangay 3',   purok: 'Purok 4',  reporter: 'Resident',    team: 'BFP',        priority: 'Critical', status: 'Closed',     remarks: 'Structure fire, 2 houses affected.' },
  { id: 'INC-004', date: '2026-07-10', time: '06:00', hazard: 'Flood',         barangay: 'Kalambogan',   purok: 'Purok 3',  reporter: 'Brgy. Admin', team: 'Team Alpha', priority: 'High',     status: 'Verified',   remarks: 'Low-lying area flooded.' },
  { id: 'INC-005', date: '2026-07-09', time: '11:20', hazard: 'Road Collapse', barangay: 'Daan Lungsod', purok: 'Purok 1',  reporter: 'DPWH',        team: 'Unassigned', priority: 'Medium',   status: 'Reported',   remarks: 'Pothole collapsed on main road.' },
]

const HAZARD_TYPES = ['Flood','Landslide','Earthquake','Fire','Storm Surge','Typhoon','Road Collapse','Bridge Collapse','Flash Flood','Tornado','Others']

// Statuses a Field Responder can set
const RESPONDER_STATUSES = ['Responding', 'Resolved']

export default function IncidentManagement({ currentUser }) {
  const role = currentUser?.role || ''
  const perms = ROLE_PERMISSIONS[role] || {}
  const isResponder = role === 'Field Responder'

  const [incidents, setIncidents] = useState(initialIncidents)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ date: '', time: '', hazard: 'Flood', barangay: '', purok: '', reporter: '', team: '', priority: 'Medium', status: 'Reported', remarks: '' })
  const [statusUpdate, setStatusUpdate] = useState({ status: 'Responding', remarks: '' })

  const filtered = incidents.filter(i =>
    (i.id.toLowerCase().includes(search.toLowerCase()) ||
     i.barangay.toLowerCase().includes(search.toLowerCase()) ||
     i.hazard.toLowerCase().includes(search.toLowerCase())) &&
    (filterStatus === 'All' || i.status === filterStatus)
  )

  const openAdd = () => {
    setSelected(null)
    setForm({ date: '', time: '', hazard: 'Flood', barangay: '', purok: '', reporter: currentUser?.name || '', team: '', priority: 'Medium', status: 'Reported', remarks: '' })
    setShowModal(true)
  }

  const openEdit = (inc) => {
    setSelected(inc.id)
    setForm({ ...inc })
    setShowModal(true)
  }

  // Field responder: quick status update modal
  const openStatusUpdate = (inc) => {
    setSelected(inc.id)
    setStatusUpdate({ status: inc.status === 'Assigned' ? 'Responding' : 'Resolved', remarks: '' })
    setShowStatusModal(true)
  }

  const handleSave = () => {
    if (!form.barangay.trim()) return
    if (selected) {
      setIncidents(prev => prev.map(i => i.id === selected ? { ...i, ...form } : i))
    } else {
      const newId = `INC-${String(incidents.length + 1).padStart(3, '0')}`
      setIncidents(prev => [...prev, { ...form, id: newId }])
    }
    setShowModal(false)
  }

  const handleStatusSave = () => {
    setIncidents(prev => prev.map(i =>
      i.id === selected
        ? { ...i, status: statusUpdate.status, remarks: statusUpdate.remarks || i.remarks }
        : i
    ))
    setShowStatusModal(false)
  }

  return (
    <div className="space-y-4">

      {/* Role notice for Field Responder */}
      {isResponder && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center gap-3 text-sm text-orange-800">
          <MapPin size={16} className="flex-shrink-0 text-orange-500" />
          <span>Field Responder view — you can update incident status and mark incidents as resolved.</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total',    count: incidents.length,                                                             color: 'text-gray-700' },
          { label: 'Open',     count: incidents.filter(i => !['Resolved','Closed'].includes(i.status)).length,     color: 'text-orange-600' },
          { label: 'Resolved', count: incidents.filter(i => i.status === 'Resolved').length,                       color: 'text-green-600' },
          { label: 'Critical', count: incidents.filter(i => i.priority === 'Critical').length,                     color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <p className={`text-3xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label} Incidents</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
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
        <div className="flex gap-2">
          {perms.canExport && (
            <button className="btn-secondary flex items-center gap-2 text-sm"><Download size={15} /> Export</button>
          )}
          {perms.canCreate && (
            <button className="btn-primary flex items-center gap-2 text-sm" onClick={openAdd}><Plus size={15} /> Log Incident</button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Incident #','Date','Hazard','Barangay','Purok','Reporter','Team','Priority','Status','Actions'].map(h => (
                  <th key={h} className="table-head">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(i => (
                <tr key={i.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-cell font-mono font-medium text-primary-700">{i.id}</td>
                  <td className="table-cell whitespace-nowrap">{i.date} {i.time}</td>
                  <td className="table-cell">
                    <span className="flex items-center gap-1"><AlertTriangle size={13} className="text-amber-500" />{i.hazard}</span>
                  </td>
                  <td className="table-cell">{i.barangay}</td>
                  <td className="table-cell">{i.purok}</td>
                  <td className="table-cell">{i.reporter}</td>
                  <td className="table-cell">{i.team}</td>
                  <td className="table-cell"><span className={PRIORITY_BADGE[i.priority]}>{i.priority}</span></td>
                  <td className="table-cell"><span className={STATUS_BADGE[i.status]}>{i.status}</span></td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      {/* All roles: view */}
                      <button className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title="View"><Eye size={15} /></button>

                      {/* CDRRMO / Brgy Admin / Super Admin: full edit */}
                      {perms.canEdit && !isResponder && (
                        <button className="p-1.5 rounded hover:bg-amber-50 text-amber-600" title="Edit" onClick={() => openEdit(i)}><Pencil size={15} /></button>
                      )}

                      {/* Field Responder: quick status update only */}
                      {isResponder && !['Resolved','Closed'].includes(i.status) && (
                        <button
                          className="p-1.5 rounded hover:bg-green-50 text-green-600 flex items-center gap-1 text-xs font-medium"
                          title="Update Status"
                          onClick={() => openStatusUpdate(i)}
                        >
                          <CheckCircle size={15} /> Update
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="table-cell text-center text-gray-400 py-8">No incidents found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
          Showing {filtered.length} of {incidents.length} incidents
        </div>
      </div>

      {/* Full edit modal (non-responder) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-5">{selected ? 'Edit Incident' : 'Log Incident'}</h3>
            <div className="grid grid-cols-2 gap-4">
              {[['date','Date','date'],['time','Time','time']].map(([k,l,t]) => (
                <div key={k}><label className="label">{l}</label><input className="input" type={t} value={form[k]} onChange={e => setForm({...form,[k]:e.target.value})} /></div>
              ))}
              <div>
                <label className="label">Hazard Type</label>
                <select className="input" value={form.hazard} onChange={e => setForm({...form,hazard:e.target.value})}>
                  {HAZARD_TYPES.map(h => <option key={h}>{h}</option>)}
                </select>
              </div>
              <div><label className="label">Barangay</label><input className="input" value={form.barangay} onChange={e => setForm({...form,barangay:e.target.value})} /></div>
              <div><label className="label">Purok</label><input className="input" value={form.purok} onChange={e => setForm({...form,purok:e.target.value})} /></div>
              <div><label className="label">Reporter</label><input className="input" value={form.reporter} onChange={e => setForm({...form,reporter:e.target.value})} /></div>
              <div><label className="label">Assigned Team</label><input className="input" value={form.team} onChange={e => setForm({...form,team:e.target.value})} /></div>
              <div>
                <label className="label">Priority</label>
                <select className="input" value={form.priority} onChange={e => setForm({...form,priority:e.target.value})}>
                  {['Critical','High','Medium','Low'].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={e => setForm({...form,status:e.target.value})}>
                  {['Reported','Verified','Assigned','Responding','Resolved','Closed'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-span-2"><label className="label">Remarks</label><textarea className="input" rows={3} value={form.remarks} onChange={e => setForm({...form,remarks:e.target.value})} /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>{selected ? 'Save Changes' : 'Log Incident'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Field Responder: quick status update modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
              <CheckCircle size={18} className="text-green-600" /> Update Incident Status
            </h3>
            <p className="text-sm text-gray-500 mb-5">Incident: <strong>{selected}</strong></p>
            <div className="space-y-4">
              <div>
                <label className="label">New Status</label>
                <select className="input" value={statusUpdate.status} onChange={e => setStatusUpdate({...statusUpdate, status: e.target.value})}>
                  {RESPONDER_STATUSES.map(s => <option key={s}>{s}</option>)}
                  <option>Closed</option>
                </select>
              </div>
              <div>
                <label className="label">Update Notes</label>
                <textarea className="input" rows={3} placeholder="Describe current situation, actions taken…" value={statusUpdate.remarks} onChange={e => setStatusUpdate({...statusUpdate, remarks: e.target.value})} />
              </div>
              {/* GPS check-in placeholder */}
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">
                <MapPin size={14} className="flex-shrink-0" />
                GPS Location: <span className="font-mono ml-1">8.8231° N, 125.1109° E</span>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button className="btn-secondary" onClick={() => setShowStatusModal(false)}>Cancel</button>
              <button className="btn-primary flex items-center gap-2" onClick={handleStatusSave}>
                <CheckCircle size={15} /> Mark {statusUpdate.status}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
