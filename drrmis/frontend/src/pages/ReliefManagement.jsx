import { useState, useEffect } from 'react'
import { Search, Plus, Pencil, Trash2, Package, TrendingDown } from 'lucide-react'
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api'

const CATEGORY_BADGE = { Food: 'badge-green', Water: 'badge-blue', 'Non-Food': 'badge-yellow', Medical: 'badge-red' }

export default function ReliefManagement() {
  const [tab, setTab] = useState('inventory')
  const [inventory, setInventory] = useState([])
  const [distributions, setDistributions] = useState([])
  const [households, setHouseholds] = useState([])
  const [centers, setCenters] = useState([])
  const [barangays, setBarangays] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const [showInvModal, setShowInvModal] = useState(false)
  const [editingInv, setEditingInv] = useState(null)
  const [invForm, setInvForm] = useState({ item_name: '', category: 'Food', quantity: '', unit: '', threshold: '' })

  const [showDistModal, setShowDistModal] = useState(false)
  const [distForm, setDistForm] = useState({ household_id: '', center_id: '', barangay_id: '', items: '', quantity: '', dist_date: '', receiver: '' })
  const [saving, setSaving] = useState(false)

  const loadAll = async () => {
    setLoading(true)
    setError('')
    try {
      const [inv, dist, hh, ec, brgy] = await Promise.all([
        apiGet('/relief/inventory'),
        apiGet('/relief/distributions'),
        apiGet('/households'),
        apiGet('/evacuation-centers'),
        apiGet('/barangays'),
      ])
      setInventory(inv)
      setDistributions(dist)
      setHouseholds(hh)
      setCenters(ec)
      setBarangays(brgy)
    } catch (err) {
      setError(err.message || 'Failed to load relief data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  const filteredInv = inventory.filter(i => i.item_name.toLowerCase().includes(search.toLowerCase()))
  const filteredDist = distributions.filter(d =>
    (d.receiver || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.barangay_name || '').toLowerCase().includes(search.toLowerCase())
  )

  // Inventory handlers
  const openAddInv = () => { setEditingInv(null); setInvForm({ item_name: '', category: 'Food', quantity: '', unit: '', threshold: '' }); setShowInvModal(true) }
  const openEditInv = (i) => { setEditingInv(i.id); setInvForm({ item_name: i.item_name, category: i.category, quantity: String(i.quantity), unit: i.unit || '', threshold: String(i.threshold) }); setShowInvModal(true) }

  const handleDeleteInv = async (id) => {
    if (!window.confirm('Remove this item?')) return
    try {
      await apiDelete(`/relief/inventory/${id}`)
      setInventory(prev => prev.filter(i => i.id !== id))
    } catch (err) { alert(err.message || 'Failed to delete item.') }
  }

  const handleSaveInv = async () => {
    if (!invForm.item_name.trim()) return
    setSaving(true)
    try {
      const payload = { ...invForm, quantity: +invForm.quantity || 0, threshold: +invForm.threshold || 0 }
      if (editingInv) {
        const updated = await apiPut(`/relief/inventory/${editingInv}`, payload)
        setInventory(prev => prev.map(i => i.id === editingInv ? updated : i))
      } else {
        const created = await apiPost('/relief/inventory', payload)
        setInventory(prev => [...prev, created])
      }
      setShowInvModal(false)
    } catch (err) {
      alert(err.message || 'Failed to save item.')
    } finally {
      setSaving(false)
    }
  }

  // Distribution handlers
  const openAddDist = () => {
    setDistForm({ household_id: '', center_id: '', barangay_id: '', items: '', quantity: '', dist_date: new Date().toISOString().slice(0, 10), receiver: '' })
    setShowDistModal(true)
  }

  const handleSaveDist = async () => {
    if (!distForm.receiver.trim() || !distForm.barangay_id) return
    setSaving(true)
    try {
      const created = await apiPost('/relief/distributions', distForm)
      setDistributions(prev => [created, ...prev])
      setShowDistModal(false)
    } catch (err) {
      alert(err.message || 'Failed to save distribution.')
    } finally {
      setSaving(false)
    }
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

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

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
          {tab === 'inventory' ? (
            <button className="btn-primary flex items-center gap-2 text-sm" onClick={openAddInv}><Plus size={15} /> Add Item</button>
          ) : (
            <button className="btn-primary flex items-center gap-2 text-sm" onClick={openAddDist}><Plus size={15} /> Add Distribution</button>
          )}
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="table-cell text-center text-gray-400 py-8">Loading…</div>
          ) : tab === 'inventory' ? (
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
                      {i.item_name}
                      {i.quantity <= i.threshold && <TrendingDown size={14} className="text-red-500" title="Low stock" />}
                    </td>
                    <td className="table-cell"><span className={CATEGORY_BADGE[i.category] || 'badge-green'}>{i.category}</span></td>
                    <td className="table-cell font-semibold">{(i.quantity || 0).toLocaleString()}</td>
                    <td className="table-cell">{i.unit}</td>
                    <td className="table-cell text-gray-500">{i.threshold}</td>
                    <td className="table-cell text-gray-500">{i.updated_at ? String(i.updated_at).slice(0, 10) : '—'}</td>
                    <td className="table-cell">
                      <div className="flex gap-2">
                        <button className="p-1.5 rounded hover:bg-amber-50 text-amber-600" onClick={() => openEditInv(i)}><Pencil size={15} /></button>
                        <button className="p-1.5 rounded hover:bg-red-50 text-red-600" onClick={() => handleDeleteInv(i.id)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredInv.length === 0 && (
                  <tr><td colSpan={7} className="table-cell text-center text-gray-400 py-8">No inventory items found.</td></tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Barangay','Center','Items','Quantity','Date','Receiver','Distributed By','Status'].map(h => <th key={h} className="table-head">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDist.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="table-cell">{d.barangay_name || '—'}</td>
                    <td className="table-cell">{d.center_name || '—'}</td>
                    <td className="table-cell text-xs text-gray-600">{d.items}</td>
                    <td className="table-cell">{d.quantity}</td>
                    <td className="table-cell">{d.dist_date}</td>
                    <td className="table-cell">{d.receiver}</td>
                    <td className="table-cell text-sm text-gray-500">{d.distributed_by_name || '—'}</td>
                    <td className="table-cell"><span className={d.status === 'Completed' ? 'badge-green' : 'badge-yellow'}>{d.status}</span></td>
                  </tr>
                ))}
                {filteredDist.length === 0 && (
                  <tr><td colSpan={8} className="table-cell text-center text-gray-400 py-8">No distribution records found.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Inventory Modal */}
      {showInvModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-5">{editingInv ? 'Edit Item' : 'Add Inventory Item'}</h3>
            <div className="space-y-4">
              <div><label className="label">Item Name</label><input className="input" value={invForm.item_name} onChange={e => setInvForm({...invForm, item_name: e.target.value})} /></div>
              <div>
                <label className="label">Category</label>
                <select className="input" value={invForm.category} onChange={e => setInvForm({...invForm, category: e.target.value})}>
                  {['Food','Water','Non-Food','Medical'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Quantity</label><input className="input" type="number" value={invForm.quantity} onChange={e => setInvForm({...invForm, quantity: e.target.value})} /></div>
                <div><label className="label">Unit</label><input className="input" value={invForm.unit} onChange={e => setInvForm({...invForm, unit: e.target.value})} placeholder="e.g. sacks" /></div>
              </div>
              <div><label className="label">Low Stock Threshold</label><input className="input" type="number" value={invForm.threshold} onChange={e => setInvForm({...invForm, threshold: e.target.value})} /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button className="btn-secondary" onClick={() => setShowInvModal(false)} disabled={saving}>Cancel</button>
              <button className="btn-primary" onClick={handleSaveInv} disabled={saving}>{saving ? 'Saving…' : (editingInv ? 'Save Changes' : 'Add Item')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Distribution Modal */}
      {showDistModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-5">Add Distribution</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Barangay</label>
                <select className="input" value={distForm.barangay_id} onChange={e => setDistForm({...distForm, barangay_id: e.target.value})}>
                  <option value="">Select barangay</option>
                  {barangays.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Evacuation Center</label>
                <select className="input" value={distForm.center_id} onChange={e => setDistForm({...distForm, center_id: e.target.value})}>
                  <option value="">Select center</option>
                  {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="label">Household</label>
                <select className="input" value={distForm.household_id} onChange={e => setDistForm({...distForm, household_id: e.target.value})}>
                  <option value="">Select household</option>
                  {households.map(h => <option key={h.id} value={h.id}>{h.head_family} ({h.household_id})</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="label">Items</label>
                <input className="input" value={distForm.items} onChange={e => setDistForm({...distForm, items: e.target.value})} placeholder="e.g. Rice x2, Canned Goods x10" />
              </div>
              <div>
                <label className="label">Quantity</label>
                <input className="input" value={distForm.quantity} onChange={e => setDistForm({...distForm, quantity: e.target.value})} placeholder="e.g. 12" />
              </div>
              <div>
                <label className="label">Date</label>
                <input className="input" type="date" value={distForm.dist_date} onChange={e => setDistForm({...distForm, dist_date: e.target.value})} />
              </div>
              <div className="col-span-2">
                <label className="label">Receiver Name</label>
                <input className="input" value={distForm.receiver} onChange={e => setDistForm({...distForm, receiver: e.target.value})} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button className="btn-secondary" onClick={() => setShowDistModal(false)} disabled={saving}>Cancel</button>
              <button className="btn-primary" onClick={handleSaveDist} disabled={saving}>{saving ? 'Saving…' : 'Add Distribution'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}