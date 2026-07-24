import { useState } from 'react'
import { Search, Plus, Eye, Pencil, Trash2, Download } from 'lucide-react'

const RISK_BADGE = { High: 'badge-red', Medium: 'badge-orange', Low: 'badge-green' }

const initialBarangays = [
  { id: 1, name: 'Barangay 1 (Pob.)',   captain: 'Juan Dela Cruz',   population: 3420, families: 684,  houses: 670, puroks: 5, risk: 'High',   status: 'Active' },
  { id: 2, name: 'Barangay 2 (Pob.)',   captain: 'Maria Santos',     population: 2810, families: 562,  houses: 550, puroks: 4, risk: 'Medium', status: 'Active' },
  { id: 3, name: 'Barangay 3 (Pob.)',   captain: 'Pedro Reyes',      population: 4100, families: 820,  houses: 800, puroks: 6, risk: 'High',   status: 'Active' },
  { id: 4, name: 'Kioskos',             captain: 'Ana Villanueva',   population: 1950, families: 390,  houses: 380, puroks: 3, risk: 'High',   status: 'Active' },
  { id: 5, name: 'Magsaysay',           captain: 'Roberto Lim',      population: 3200, families: 640,  houses: 620, puroks: 5, risk: 'Medium', status: 'Active' },
  { id: 6, name: 'Daan Lungsod',        captain: 'Lorna Pascual',    population: 2600, families: 520,  houses: 505, puroks: 4, risk: 'Low',    status: 'Active' },
  { id: 7, name: 'Guinalaban',          captain: 'Felix Morales',    population: 1800, families: 360,  houses: 350, puroks: 3, risk: 'Medium', status: 'Active' },
  { id: 8, name: 'Kalambogan',          captain: 'Celia Torres',     population: 5200, families: 1040, houses: 1010, puroks: 7, risk: 'High',  status: 'Active' },
]

export default function BarangayManagement() {
  const [barangays, setBarangays] = useState(initialBarangays)
  const [search, setSearch] = useState('')
  const [filterRisk, setFilterRisk] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', captain: '', population: '', families: '', houses: '', puroks: '', risk: 'Low', status: 'Active' })

  const filtered = barangays.filter(b =>
    (b.name.toLowerCase().includes(search.toLowerCase()) || b.captain.toLowerCase().includes(search.toLowerCase())) &&
    (filterRisk === 'All' || b.risk === filterRisk)
  )

  const openAdd = () => { setEditing(null); setForm({ name: '', captain: '', population: '', families: '', houses: '', puroks: '', risk: 'Low', status: 'Active' }); setShowModal(true) }
  const openEdit = (b) => { setEditing(b.id); setForm({ ...b, population: String(b.population), families: String(b.families), houses: String(b.houses), puroks: String(b.puroks) }); setShowModal(true) }
  const handleDelete = (id) => { if (window.confirm('Delete this barangay?')) setBarangays(prev => prev.filter(b => b.id !== id)) }

  const handleSave = () => {
    if (!form.name.trim()) return
    if (editing) {
      setBarangays(prev => prev.map(b => b.id === editing ? { ...b, ...form, population: +form.population, families: +form.families, houses: +form.houses, puroks: +form.puroks } : b))
    } else {
      setBarangays(prev => [...prev, { ...form, id: Date.now(), population: +form.population, families: +form.families, houses: +form.houses, puroks: +form.puroks }])
    }
    setShowModal(false)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="card p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3 flex-wrap flex-1">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9" placeholder="Search barangay or captain…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input w-auto" value={filterRisk} onChange={e => setFilterRisk(e.target.value)}>
            <option value="All">All Risk Levels</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-2 text-sm"><Download size={15} /> Export</button>
          <button className="btn-primary flex items-center gap-2 text-sm" onClick={openAdd}><Plus size={15} /> Add Barangay</button>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Barangay Name','Captain','Population','Families','Houses','Puroks','Risk Level','Status','Actions'].map(h => (
                  <th key={h} className="table-head">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(b => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-cell font-medium text-gray-800">{b.name}</td>
                  <td className="table-cell">{b.captain}</td>
                  <td className="table-cell">{b.population.toLocaleString()}</td>
                  <td className="table-cell">{b.families.toLocaleString()}</td>
                  <td className="table-cell">{b.houses.toLocaleString()}</td>
                  <td className="table-cell">{b.puroks}</td>
                  <td className="table-cell"><span className={RISK_BADGE[b.risk]}>{b.risk}</span></td>
                  <td className="table-cell"><span className="badge-green">{b.status}</span></td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title="View"><Eye size={15} /></button>
                      <button className="p-1.5 rounded hover:bg-amber-50 text-amber-600" title="Edit" onClick={() => openEdit(b)}><Pencil size={15} /></button>
                      <button className="p-1.5 rounded hover:bg-red-50 text-red-600" title="Delete" onClick={() => handleDelete(b.id)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="table-cell text-center text-gray-400 py-8">No barangays found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
          Showing {filtered.length} of {barangays.length} barangays
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-5">{editing ? 'Edit Barangay' : 'Add Barangay'}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Barangay Name</label>
                <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Barangay 1 (Pob.)" />
              </div>
              <div className="col-span-2">
                <label className="label">Barangay Captain</label>
                <input className="input" value={form.captain} onChange={e => setForm({...form, captain: e.target.value})} />
              </div>
              {[['population','Population'],['families','Families'],['houses','Houses'],['puroks','Puroks']].map(([k,l]) => (
                <div key={k}>
                  <label className="label">{l}</label>
                  <input className="input" type="number" value={form[k]} onChange={e => setForm({...form, [k]: e.target.value})} />
                </div>
              ))}
              <div>
                <label className="label">Risk Level</label>
                <select className="input" value={form.risk} onChange={e => setForm({...form, risk: e.target.value})}>
                  <option>Low</option><option>Medium</option><option>High</option>
                </select>
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  <option>Active</option><option>Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>{editing ? 'Save Changes' : 'Add Barangay'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
