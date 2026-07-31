import { useState, useEffect } from 'react'
import { Search, Plus, Eye, Pencil, Trash2, Download, Archive as ArchiveIcon } from 'lucide-react'
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api'
import { getStoredUser } from '../utils/storage'

const RISK_BADGE = { High: 'badge-red', Medium: 'badge-orange', Low: 'badge-green' }

export default function BarangayManagement() {
  const currentUser = getStoredUser()
  const role = currentUser?.role

  // Permission rules for this page
  const canAdd    = role === 'CDRRMO Personnel'
  const canEdit   = role === 'CDRRMO Personnel'
  const canDelete = role === 'Super Administrator' // soft-delete → moves to Archive

  const [barangays, setBarangays] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterRisk, setFilterRisk] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', captain: '', secretary: '', population: '', families: '', houses: '', risk_level: 'Low', status: 'Active', boundary_geojson: '', image_url: '', contact_number: '' })

  const loadBarangays = async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterRisk !== 'All') params.set('risk', filterRisk)
      const data = await apiGet(`/barangays?${params.toString()}`)
      setBarangays(data)
    } catch (err) {
      setError(err.message || 'Failed to load barangays.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(loadBarangays, 300) // debounce search
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterRisk])

  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', captain: '', secretary: '', population: '', families: '', houses: '', risk_level: 'Low', status: 'Active', boundary_geojson: '', image_url: '', contact_number: '' })
    setShowModal(true)
  }

  const openEdit = (b) => {
    setEditing(b.id)
    setForm({
      name: b.name || '',
      captain: b.captain || '',
      secretary: b.secretary || '',
      population: String(b.population ?? ''),
      families: String(b.families ?? ''),
      houses: String(b.houses ?? ''),
      risk_level: b.risk_level || 'Low',
      status: b.status || 'Active',
      boundary_geojson: b.boundary_geojson || '',
      image_url: b.image_url || '',
      contact_number: b.contact_number || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Archive this barangay? You can restore it later from the Archive page.')) return
    try {
      await apiDelete(`/barangays/${id}`)
      setBarangays(prev => prev.filter(b => b.id !== id))
    } catch (err) {
      alert(err.message || 'Failed to archive barangay.')
    }
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    if (form.boundary_geojson.trim()) {
      try {
        JSON.parse(form.boundary_geojson)
      } catch {
        alert('Boundary GeoJSON is not valid JSON. Please check the format and try again.')
        return
      }
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        population: +form.population || 0,
        families: +form.families || 0,
        houses: +form.houses || 0,
        boundary_geojson: form.boundary_geojson.trim() || null,
        image_url: form.image_url.trim() || null,
        contact_number: form.contact_number.trim() || null,
      }
      if (editing) {
        const updated = await apiPut(`/barangays/${editing}`, payload)
        setBarangays(prev => prev.map(b => b.id === editing ? updated : b))
      } else {
        const created = await apiPost('/barangays', payload)
        setBarangays(prev => [...prev, created])
      }
      setShowModal(false)
    } catch (err) {
      alert(err.message || 'Failed to save barangay.')
    } finally {
      setSaving(false)
    }
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
          {canDelete && (
            <a href="/archive" className="btn-secondary flex items-center gap-2 text-sm">
              <ArchiveIcon size={15} /> Archive
            </a>
          )}
          {canAdd && (
            <button className="btn-primary flex items-center gap-2 text-sm" onClick={openAdd}>
              <Plus size={15} /> Add Barangay
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

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
              {loading && (
                <tr><td colSpan={9} className="table-cell text-center text-gray-400 py-8">Loading barangays…</td></tr>
              )}
              {!loading && barangays.map(b => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-cell font-medium text-gray-800">{b.name}</td>
                  <td className="table-cell">{b.captain}</td>
                  <td className="table-cell">{(b.population || 0).toLocaleString()}</td>
                  <td className="table-cell">{(b.families || 0).toLocaleString()}</td>
                  <td className="table-cell">{(b.houses || 0).toLocaleString()}</td>
                  <td className="table-cell">{b.puroks ?? '—'}</td>
                  <td className="table-cell"><span className={RISK_BADGE[b.risk_level] || 'badge-green'}>{b.risk_level}</span></td>
                  <td className="table-cell"><span className="badge-green">{b.status}</span></td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title="View"><Eye size={15} /></button>
                      {canEdit && (
                        <button className="p-1.5 rounded hover:bg-amber-50 text-amber-600" title="Edit" onClick={() => openEdit(b)}>
                          <Pencil size={15} />
                        </button>
                      )}
                      {canDelete && (
                        <button className="p-1.5 rounded hover:bg-red-50 text-red-600" title="Archive" onClick={() => handleDelete(b.id)}>
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && barangays.length === 0 && (
                <tr><td colSpan={9} className="table-cell text-center text-gray-400 py-8">No barangays found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
          Showing {barangays.length} barangay{barangays.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Modal — only rendered for roles allowed to add/edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-5">{editing ? 'Edit Barangay' : 'Add Barangay'}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Barangay Name</label>
                <input
                  className={`input ${editing ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="e.g. Barangay 1 (Pob.)"
                  disabled={!!editing}
                  readOnly={!!editing}
                />
                {editing && (
                  <p className="text-xs text-gray-400 mt-1">Official barangay name — matched to PSA records and cannot be renamed here.</p>
                )}
              </div>
              <div>
                <label className="label">Barangay Captain</label>
                <input className="input" value={form.captain} onChange={e => setForm({...form, captain: e.target.value})} />
              </div>
              <div>
                <label className="label">Emergency Contact Number</label>
                <input
                  className="input"
                  type="tel"
                  value={form.contact_number}
                  onChange={e => setForm({...form, contact_number: e.target.value})}
                  placeholder="e.g. 0917 123 4567"
                />
                <p className="text-xs text-gray-400 mt-1">Shown on the GIS Map for quick contact during emergencies.</p>
              </div>
              {[['population','Population'],['families','Families'],['houses','Houses']].map(([k,l]) => (
                <div key={k}>
                  <label className="label">{l}</label>
                  <input className="input" type="number" value={form[k]} onChange={e => setForm({...form, [k]: e.target.value})} />
                </div>
              ))}
              <div>
                <label className="label">Risk Level</label>
                <select className="input" value={form.risk_level} onChange={e => setForm({...form, risk_level: e.target.value})}>
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
              <button className="btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : (editing ? 'Save Changes' : 'Add Barangay')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}