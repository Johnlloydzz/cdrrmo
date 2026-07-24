import { useState } from 'react'
import { Search, Plus, Pencil, Trash2, Package, TrendingDown } from 'lucide-react'

const INITIAL_INVENTORY = [
  { id: 1, item: 'Rice (50kg sack)',    category: 'Food',     quantity: 250, unit: 'sacks',   threshold: 50,  lastUpdated: '2026-07-12' },
  { id: 2, item: 'Bottled Water (1L)',  category: 'Water',    quantity: 1200, unit: 'bottles', threshold: 200, lastUpdated: '2026-07-12' },
  { id: 3, item: 'Canned Goods',        category: 'Food',     quantity: 3500, unit: 'cans',   threshold: 500, lastUpdated: '2026-07-11' },
  { id: 4, item: 'Blankets',            category: 'Non-Food', quantity: 180,  unit: 'pcs',    threshold: 50,  lastUpdated: '2026-07-10' },
  { id: 5, item: 'Hygiene Kits',        category: 'Non-Food', quantity: 95,   unit: 'kits',   threshold: 30,  lastUpdated: '2026-07-09' },
  { id: 6, item: 'Baby Food',           category: 'Food',     quantity: 40,   unit: 'boxes',  threshold: 20,  lastUpdated: '2026-07-08' },
  { id: 7, item: 'Medicine Kits',       category: 'Medical',  quantity: 25,   unit: 'kits',   threshold: 10,  lastUpdated: '2026-07-08' },
  { id: 8, item: 'Clothes (assorted)',  category: 'Non-Food', quantity: 500,  unit: 'pcs',    threshold: 100, lastUpdated: '2026-07-07' },
]

const INITIAL_DISTRIBUTIONS = [
  { id: 1, family: 'Santos, Juan',   barangay: 'Kioskos',       center: 'Central Gym', items: 'Rice x2, Canned Goods x10', date: '2026-07-13', receiver: 'Juan Santos',    status: 'Completed' },
  { id: 2, family: 'Reyes, Maria',   barangay: 'Kalambogan',    center: 'Kalambogan Hall', items: 'Blanket x1, Hygiene Kit x1', date: '2026-07-13', receiver: 'Maria Reyes', status: 'Completed' },
  { id: 3, family: 'Dela Cruz, Ben', barangay: 'Magsaysay',     center: 'Magsaysay Court', items: 'Rice x1, Water x6', date: '2026-07-12', receiver: 'Ben Dela Cruz',      status: 'Pending' },
]

const CATEGORY_BADGE = { Food: 'badge-green', Water: 'badge-blue', 'Non-Food': 'badge-yellow', Medical: 'badge-red' }

export default function ReliefManagement() {
  const [tab, setTab] = useState('inventory')
  const [inventory, setInventory] = useState(INITIAL_INVENTORY)
  const [distributions] = useState(INITIAL_DISTRIBUTIONS)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ item: '', category: 'Food', quantity: '', unit: '', threshold: '' })

  const filteredInv = inventory.filter(i => i.item.toLowerCase().includes(search.toLowerCase()))
  const filteredDist = distributions.filter(d => d.family.toLowerCase().includes(search.toLowerCase()) || d.barangay.toLowerCase().includes(search.toLowerCase()))

  const openAdd = () => { setEditing(null); setForm({ item: '', category: 'Food', quantity: '', unit: '', threshold: '' }); setShowModal(true) }
  const openEdit = (item) => { setEditing(item.id); setForm({ ...item, quantity: String(item.quantity), threshold: String(item.threshold) }); setShowModal(true) }
  const handleDelete = (id) => { if (window.confirm('Remove item?')) setInventory(p => p.filter(i => i.id !== id)) }
  const handleSave = () => {
    if (!form.item.trim()) return
    if (editing) {
      setInventory(p => p.map(i => i.id === editing ? { ...i, ...form, quantity: +form.quantity, threshold: +form.threshold, lastUpdated: new Date().toISOString().slice(0,10) } : i))
    } else {
      setInventory(p => [...p, { ...form, id: Date.now(), quantity: +form.quantity, threshold: +form.threshold, lastUpdated: new Date().toISOString().slice(0,10) }])
    }
    setShowModal(false)
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-gray-800">{inventory.length}</p><p className="text-xs text-gray-500 mt-1">Item Types</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-red-600">{inventory.filter(i => i.quantity <= i.threshold).length}</p><p className="text-xs text-gray-500 mt-1">Low Stock</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-blue-600">{distributions.length}</p><p className="text-xs text-gray-500 mt-1">Distributions</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-green-600">{distributions.filter(d => d.status === 'Completed').length}</p><p className="text-xs text-gray-500 mt-1">Completed</p></div>
      </div>

      {/* Tabs */}
      <div className="card p-0 overflow-hidden">
        <div className="border-b border-gray-200 flex">
          {['inventory','distributions'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-6 py-3 text-sm font-medium capitalize transition-colors ${tab === t ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>
              {t === 'inventory' ? 'Relief Inventory' : 'Distribution Records'}
            </button>
          ))}
        </div>

        <div className="p-4 border-b border-gray-100 flex gap-3 justify-between flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {tab === 'inventory' && (
            <button className="btn-primary flex items-center gap-2 text-sm" onClick={openAdd}><Plus size={15} /> Add Item</button>
          )}
        </div>

        <div className="overflow-x-auto">
          {tab === 'inventory' ? (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Item','Category','Quantity','Unit','Threshold','Last Updated','Actions'].map(h => <th key={h} className="table-head">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInv.map(i => (
                  <tr key={i.id} className={`hover:bg-gray-50 ${i.quantity <= i.threshold ? 'bg-red-50' : ''}`}>
                    <td className="table-cell font-medium flex items-center gap-2">
                      <Package size={14} className="text-gray-400" />
                      {i.item}
                      {i.quantity <= i.threshold && <TrendingDown size={14} className="text-red-500" title="Low stock" />}
                    </td>
                    <td className="table-cell"><span className={CATEGORY_BADGE[i.category]}>{i.category}</span></td>
                    <td className="table-cell font-semibold">{i.quantity.toLocaleString()}</td>
                    <td className="table-cell">{i.unit}</td>
                    <td className="table-cell text-gray-500">{i.threshold}</td>
                    <td className="table-cell text-gray-500">{i.lastUpdated}</td>
                    <td className="table-cell">
                      <div className="flex gap-2">
                        <button className="p-1.5 rounded hover:bg-amber-50 text-amber-600" onClick={() => openEdit(i)}><Pencil size={15} /></button>
                        <button className="p-1.5 rounded hover:bg-red-50 text-red-600" onClick={() => handleDelete(i.id)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Family','Barangay','Center','Items','Date','Receiver','Status'].map(h => <th key={h} className="table-head">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDist.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium">{d.family}</td>
                    <td className="table-cell">{d.barangay}</td>
                    <td className="table-cell">{d.center}</td>
                    <td className="table-cell text-xs text-gray-600">{d.items}</td>
                    <td className="table-cell">{d.date}</td>
                    <td className="table-cell">{d.receiver}</td>
                    <td className="table-cell"><span className={d.status === 'Completed' ? 'badge-green' : 'badge-yellow'}>{d.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Inventory Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-5">{editing ? 'Edit Item' : 'Add Inventory Item'}</h3>
            <div className="space-y-4">
              <div><label className="label">Item Name</label><input className="input" value={form.item} onChange={e => setForm({...form,item:e.target.value})} /></div>
              <div>
                <label className="label">Category</label>
                <select className="input" value={form.category} onChange={e => setForm({...form,category:e.target.value})}>
                  {['Food','Water','Non-Food','Medical'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Quantity</label><input className="input" type="number" value={form.quantity} onChange={e => setForm({...form,quantity:e.target.value})} /></div>
                <div><label className="label">Unit</label><input className="input" value={form.unit} onChange={e => setForm({...form,unit:e.target.value})} placeholder="e.g. sacks" /></div>
              </div>
              <div><label className="label">Low Stock Threshold</label><input className="input" type="number" value={form.threshold} onChange={e => setForm({...form,threshold:e.target.value})} /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>{editing ? 'Save Changes' : 'Add Item'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
