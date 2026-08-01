import { useState } from 'react'
import { Search, Plus, Eye, Pencil, Trash2, ShieldAlert } from 'lucide-react'

const SEVERITY = { Critical: 'badge-red', High: 'badge-orange', Moderate: 'badge-yellow', Low: 'badge-green' }
const STATUS_B = { Active: 'badge-red', Monitoring: 'badge-orange', Resolved: 'badge-green', Closed: 'badge-gray' }

const TYPES = ['Flood','Landslide','Earthquake','Fire','Storm Surge','Typhoon','Road Collapse','Bridge Collapse','Flash Flood','Tornado','Others']

const initial = [
  { id: 1, hid: 'HAZ-001', type: 'Flood',      severity: 'Critical', barangay: 'Kioskos',    purok: 'Purok 1-2', reporter: 'Brgy. Admin', date: '2026-07-13', status: 'Active',     desc: 'Severe flooding due to continuous rain. River overflow.' },
  { id: 2, hid: 'HAZ-002', type: 'Landslide',  severity: 'High',     barangay: 'Magsaysay',  purok: 'Purok 2',   reporter: 'Field Agent', date: '2026-07-12', status: 'Monitoring', desc: 'Slope erosion detected near residential area.' },
  { id: 3, hid: 'HAZ-003', type: 'Fire',        severity: 'Critical', barangay: 'Barangay 3', purok: 'Purok 4',   reporter: 'Resident',    date: '2026-07-11', status: 'Resolved',   desc: 'Structure fire. Contained by BFP.' },
  { id: 4, hid: 'HAZ-004', type: 'Flood',      severity: 'Moderate', barangay: 'Kalambogan', purok: 'Purok 3',   reporter: 'Brgy. Admin', date: '2026-07-10', status: 'Active',     desc: 'Low-lying roads flooded.' },
]

export default function HazardManagement({ currentUser }) {
  const canReport = currentUser?.role === 'Barangay Admin'
  const [hazards, setHazards] = useState(initial)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ type: 'Flood', severity: 'Moderate', barangay: '', purok: '', reporter: '', date: '', status: 'Active', desc: '' })

  const filtered = hazards.filter(h =>
    h.type.toLowerCase().includes(search.toLowerCase()) ||
    h.barangay.toLowerCase().includes(search.toLowerCase()) ||
    h.hid.toLowerCase().includes(search.toLowerCase())
  )

  const openAdd = () => { setEditing(null); setForm({ type: 'Flood', severity: 'Moderate', barangay: '', purok: '', reporter: '', date: '', status: 'Active', desc: '' }); setShowModal(true) }
  const openEdit = (h) => { setEditing(h.id); setForm({ ...h }); setShowModal(true) }
  const handleDelete = (id) => { if (window.confirm('Delete hazard?')) setHazards(p => p.filter(h => h.id !== id)) }
  const handleSave = () => {
    if (!form.barangay.trim()) return
    if (editing) { setHazards(p => p.map(h => h.id === editing ? { ...h, ...form } : h)) }
    else {
      const newId = `HAZ-${String(hazards.length + 1).padStart(3,'0')}`
      setHazards(p => [...p, { ...form, id: Date.now(), hid: newId }])
    }
    setShowModal(false)
  }

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
        {canReport && (
          <button className="btn-primary flex items-center gap-2 text-sm" onClick={openAdd}><Plus size={15} /> Report Hazard</button>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['ID','Type','Severity','Barangay','Purok','Reporter','Date','Status','Description','Actions'].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(h => (
                <tr key={h.id} className="hover:bg-gray-50">
                  <td className="table-cell font-mono text-primary-700">{h.hid}</td>
                  <td className="table-cell">
                    <span className="flex items-center gap-1.5"><ShieldAlert size={13} className="text-red-400" />{h.type}</span>
                  </td>
                  <td className="table-cell"><span className={SEVERITY[h.severity]}>{h.severity}</span></td>
                  <td className="table-cell">{h.barangay}</td>
                  <td className="table-cell">{h.purok}</td>
                  <td className="table-cell">{h.reporter}</td>
                  <td className="table-cell">{h.date}</td>
                  <td className="table-cell"><span className={STATUS_B[h.status]}>{h.status}</span></td>
                  <td className="table-cell max-w-xs truncate text-xs text-gray-600">{h.desc}</td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><Eye size={15} /></button>
                      <button className="p-1.5 rounded hover:bg-amber-50 text-amber-600" onClick={() => openEdit(h)}><Pencil size={15} /></button>
                      <button className="p-1.5 rounded hover:bg-red-50 text-red-600" onClick={() => handleDelete(h.id)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-5">{editing ? 'Edit Hazard' : 'Report Hazard'}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Hazard Type</label><select className="input" value={form.type} onChange={e => setForm({...form,type:e.target.value})}>{TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
              <div><label className="label">Severity</label><select className="input" value={form.severity} onChange={e => setForm({...form,severity:e.target.value})}>{['Critical','High','Moderate','Low'].map(s => <option key={s}>{s}</option>)}</select></div>
              <div><label className="label">Barangay</label><input className="input" value={form.barangay} onChange={e => setForm({...form,barangay:e.target.value})} /></div>
              <div><label className="label">Purok</label><input className="input" value={form.purok} onChange={e => setForm({...form,purok:e.target.value})} /></div>
              <div><label className="label">Reporter</label><input className="input" value={form.reporter} onChange={e => setForm({...form,reporter:e.target.value})} /></div>
              <div><label className="label">Date</label><input className="input" type="date" value={form.date} onChange={e => setForm({...form,date:e.target.value})} /></div>
              <div><label className="label">Status</label><select className="input" value={form.status} onChange={e => setForm({...form,status:e.target.value})}>{['Active','Monitoring','Resolved','Closed'].map(s => <option key={s}>{s}</option>)}</select></div>
              <div className="col-span-2"><label className="label">Description</label><textarea className="input" rows={3} value={form.desc} onChange={e => setForm({...form,desc:e.target.value})} /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>{editing ? 'Save' : 'Report'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}