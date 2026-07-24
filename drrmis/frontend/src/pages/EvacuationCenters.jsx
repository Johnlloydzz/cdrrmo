import { useState } from 'react'
import { Search, Plus, Pencil, Trash2, Download } from 'lucide-react'

const initialCenters = [
  { id: 1, name: 'Gingoog City Central Gym',   barangay: 'Barangay 1 (Pob.)', capacity: 500, occupants: 124, contact: 'City Sports Office',  medical: true,  generator: true,  kitchen: true,  water: true,  electricity: true, status: 'Open' },
  { id: 2, name: 'Brgy. Kioskos Elem School',  barangay: 'Kioskos',           capacity: 200, occupants: 88,  contact: 'Principal Ramos',     medical: false, generator: false, kitchen: true,  water: true,  electricity: true, status: 'Open' },
  { id: 3, name: 'Magsaysay Covered Court',    barangay: 'Magsaysay',         capacity: 300, occupants: 0,   contact: 'Brgy. Secretary',      medical: false, generator: true,  kitchen: false, water: true,  electricity: true, status: 'Standby' },
  { id: 4, name: 'Kalambogan Multi-Purpose Hall', barangay: 'Kalambogan',     capacity: 400, occupants: 210, contact: 'Brgy. Captain Celia',  medical: true,  generator: true,  kitchen: true,  water: true,  electricity: true, status: 'Open' },
  { id: 5, name: 'Daan Lungsod Community Hall', barangay: 'Daan Lungsod',     capacity: 150, occupants: 150, contact: 'Brgy. Admin Lorna',    medical: false, generator: false, kitchen: true,  water: true,  electricity: false, status: 'Full' },
]

const STATUS_BADGE = { Open: 'badge-green', Full: 'badge-red', Standby: 'badge-yellow', Closed: 'badge-gray' }

const Check = ({ v }) => (
  <span className={v ? 'text-green-600' : 'text-gray-300'}>
    {v ? '✓' : '✗'}
  </span>
)

export default function EvacuationCenters() {
  const [centers, setCenters] = useState(initialCenters)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', barangay: '', capacity: '', occupants: '', contact: '', medical: false, generator: false, kitchen: false, water: false, electricity: false, status: 'Standby' })

  const filtered = centers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.barangay.toLowerCase().includes(search.toLowerCase())
  )

  const openAdd = () => { setEditing(null); setForm({ name: '', barangay: '', capacity: '', occupants: '', contact: '', medical: false, generator: false, kitchen: false, water: false, electricity: false, status: 'Standby' }); setShowModal(true) }
  const openEdit = (c) => { setEditing(c.id); setForm({ ...c, capacity: String(c.capacity), occupants: String(c.occupants) }); setShowModal(true) }
  const handleDelete = (id) => { if (window.confirm('Delete this center?')) setCenters(p => p.filter(c => c.id !== id)) }

  const handleSave = () => {
    if (!form.name.trim()) return
    if (editing) {
      setCenters(p => p.map(c => c.id === editing ? { ...c, ...form, capacity: +form.capacity, occupants: +form.occupants } : c))
    } else {
      setCenters(p => [...p, { ...form, id: Date.now(), capacity: +form.capacity, occupants: +form.occupants }])
    }
    setShowModal(false)
  }

  const toggle = (field) => setForm(f => ({ ...f, [field]: !f[field] }))

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-gray-800">{centers.length}</p><p className="text-xs text-gray-500 mt-1">Total Centers</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-green-600">{centers.filter(c => c.status === 'Open').length}</p><p className="text-xs text-gray-500 mt-1">Open</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-blue-600">{centers.reduce((a, c) => a + c.occupants, 0)}</p><p className="text-xs text-gray-500 mt-1">Current Occupants</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-gray-600">{centers.reduce((a, c) => a + (c.capacity - c.occupants), 0)}</p><p className="text-xs text-gray-500 mt-1">Available Space</p></div>
      </div>

      {/* Toolbar */}
      <div className="card p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search center or barangay…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-2 text-sm"><Download size={15} /> Export</button>
          <button className="btn-primary flex items-center gap-2 text-sm" onClick={openAdd}><Plus size={15} /> Add Center</button>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Name','Barangay','Capacity','Occupants','Available','Contact','Med','Gen','Kitchen','Water','Elec','Status','Actions'].map(h => (
                  <th key={h} className="table-head">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium text-gray-800">{c.name}</td>
                  <td className="table-cell">{c.barangay}</td>
                  <td className="table-cell text-center">{c.capacity}</td>
                  <td className="table-cell text-center">{c.occupants}</td>
                  <td className="table-cell text-center">{c.capacity - c.occupants}</td>
                  <td className="table-cell">{c.contact}</td>
                  <td className="table-cell text-center"><Check v={c.medical} /></td>
                  <td className="table-cell text-center"><Check v={c.generator} /></td>
                  <td className="table-cell text-center"><Check v={c.kitchen} /></td>
                  <td className="table-cell text-center"><Check v={c.water} /></td>
                  <td className="table-cell text-center"><Check v={c.electricity} /></td>
                  <td className="table-cell"><span className={STATUS_BADGE[c.status]}>{c.status}</span></td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button className="p-1.5 rounded hover:bg-amber-50 text-amber-600" onClick={() => openEdit(c)}><Pencil size={15} /></button>
                      <button className="p-1.5 rounded hover:bg-red-50 text-red-600" onClick={() => handleDelete(c.id)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-5">{editing ? 'Edit Center' : 'Add Evacuation Center'}</h3>
            <div className="space-y-4">
              <div><label className="label">Center Name</label><input className="input" value={form.name} onChange={e => setForm({...form,name:e.target.value})} /></div>
              <div><label className="label">Barangay</label><input className="input" value={form.barangay} onChange={e => setForm({...form,barangay:e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Capacity</label><input className="input" type="number" value={form.capacity} onChange={e => setForm({...form,capacity:e.target.value})} /></div>
                <div><label className="label">Current Occupants</label><input className="input" type="number" value={form.occupants} onChange={e => setForm({...form,occupants:e.target.value})} /></div>
              </div>
              <div><label className="label">Contact Person</label><input className="input" value={form.contact} onChange={e => setForm({...form,contact:e.target.value})} /></div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={e => setForm({...form,status:e.target.value})}>
                  {['Open','Full','Standby','Closed'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <p className="label mb-2">Facilities</p>
                <div className="grid grid-cols-2 gap-2">
                  {['medical','generator','kitchen','water','electricity'].map(f => (
                    <label key={f} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form[f]} onChange={() => toggle(f)} className="w-4 h-4 rounded text-primary-600" />
                      <span className="text-sm capitalize text-gray-700">{f === 'electricity' ? 'Electricity' : f.charAt(0).toUpperCase() + f.slice(1)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>{editing ? 'Save Changes' : 'Add Center'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
