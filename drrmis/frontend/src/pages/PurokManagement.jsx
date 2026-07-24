import { useState } from 'react'
import { Search, Plus, Pencil, Trash2 } from 'lucide-react'

const initial = [
  { id: 1, purok: 'Purok 1 - Sampaguita', barangay: 'Kioskos',      population: 420, families: 84, houses: 80, floodRisk: 'High',   landslideRisk: 'Low',    area: '1.2 ha', status: 'Active' },
  { id: 2, purok: 'Purok 2 - Rosal',      barangay: 'Kioskos',      population: 380, families: 76, houses: 74, floodRisk: 'High',   landslideRisk: 'Low',    area: '0.9 ha', status: 'Active' },
  { id: 3, purok: 'Purok 1 - Narra',      barangay: 'Magsaysay',    population: 610, families: 122, houses: 118, floodRisk: 'Medium', landslideRisk: 'Medium', area: '2.1 ha', status: 'Active' },
  { id: 4, purok: 'Purok 2 - Molave',     barangay: 'Magsaysay',    population: 540, families: 108, houses: 104, floodRisk: 'Low',   landslideRisk: 'High',   area: '1.8 ha', status: 'Active' },
  { id: 5, purok: 'Purok 1 - Acacia',     barangay: 'Kalambogan',   population: 730, families: 146, houses: 140, floodRisk: 'High',   landslideRisk: 'Low',    area: '2.4 ha', status: 'Active' },
]
const RISK = { High: 'badge-red', Medium: 'badge-orange', Low: 'badge-green' }

export default function PurokManagement() {
  const [puroks, setPuroks] = useState(initial)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ purok: '', barangay: '', population: '', families: '', houses: '', floodRisk: 'Low', landslideRisk: 'Low', area: '', status: 'Active' })

  const filtered = puroks.filter(p => p.purok.toLowerCase().includes(search.toLowerCase()) || p.barangay.toLowerCase().includes(search.toLowerCase()))

  const openAdd = () => { setEditing(null); setForm({ purok: '', barangay: '', population: '', families: '', houses: '', floodRisk: 'Low', landslideRisk: 'Low', area: '', status: 'Active' }); setShowModal(true) }
  const openEdit = (p) => { setEditing(p.id); setForm({ ...p, population: String(p.population), families: String(p.families), houses: String(p.houses) }); setShowModal(true) }
  const handleDelete = (id) => { if (window.confirm('Delete this purok?')) setPuroks(prev => prev.filter(p => p.id !== id)) }
  const handleSave = () => {
    if (!form.purok.trim()) return
    if (editing) { setPuroks(p => p.map(x => x.id === editing ? { ...x, ...form, population: +form.population, families: +form.families, houses: +form.houses } : x)) }
    else { setPuroks(p => [...p, { ...form, id: Date.now(), population: +form.population, families: +form.families, houses: +form.houses }]) }
    setShowModal(false)
  }

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
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['Purok Name','Barangay','Population','Families','Houses','Flood Risk','Landslide Risk','Area','Status','Actions'].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">{p.purok}</td>
                  <td className="table-cell">{p.barangay}</td>
                  <td className="table-cell">{p.population.toLocaleString()}</td>
                  <td className="table-cell">{p.families}</td>
                  <td className="table-cell">{p.houses}</td>
                  <td className="table-cell"><span className={RISK[p.floodRisk]}>{p.floodRisk}</span></td>
                  <td className="table-cell"><span className={RISK[p.landslideRisk]}>{p.landslideRisk}</span></td>
                  <td className="table-cell">{p.area}</td>
                  <td className="table-cell"><span className="badge-green">{p.status}</span></td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button className="p-1.5 rounded hover:bg-amber-50 text-amber-600" onClick={() => openEdit(p)}><Pencil size={15} /></button>
                      <button className="p-1.5 rounded hover:bg-red-50 text-red-600" onClick={() => handleDelete(p.id)}><Trash2 size={15} /></button>
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
            <h3 className="text-lg font-semibold mb-5">{editing ? 'Edit Purok' : 'Add Purok'}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className="label">Purok Name</label><input className="input" value={form.purok} onChange={e => setForm({...form,purok:e.target.value})} /></div>
              <div className="col-span-2"><label className="label">Barangay</label><input className="input" value={form.barangay} onChange={e => setForm({...form,barangay:e.target.value})} /></div>
              {[['population','Population'],['families','Families'],['houses','Houses']].map(([k,l]) => (
                <div key={k}><label className="label">{l}</label><input className="input" type="number" value={form[k]} onChange={e => setForm({...form,[k]:e.target.value})} /></div>
              ))}
              <div><label className="label">Area</label><input className="input" value={form.area} onChange={e => setForm({...form,area:e.target.value})} placeholder="e.g. 1.2 ha" /></div>
              <div><label className="label">Flood Risk</label><select className="input" value={form.floodRisk} onChange={e => setForm({...form,floodRisk:e.target.value})}><option>Low</option><option>Medium</option><option>High</option></select></div>
              <div><label className="label">Landslide Risk</label><select className="input" value={form.landslideRisk} onChange={e => setForm({...form,landslideRisk:e.target.value})}><option>Low</option><option>Medium</option><option>High</option></select></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>{editing ? 'Save' : 'Add Purok'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
