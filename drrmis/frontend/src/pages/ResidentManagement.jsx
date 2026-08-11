import { useState, useEffect } from 'react'
import { Search, Plus, Pencil } from 'lucide-react'
import { apiGet, apiPost, apiPut } from '../utils/api'

const emptyForm = { household_id: '', name: '', birthdate: '', relation_to_head: '' }

export default function ResidentManagement({ currentUser }) {
  const canAdd = currentUser?.role === 'Barangay Official'
  const [residents, setResidents] = useState([])
  const [households, setHouseholds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const load = () => {
    setLoading(true)
    apiGet('/residents').then(setResidents).catch(err => setError(err.message)).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    apiGet('/households').then(setHouseholds).catch(() => {})
  }, [])

  const filtered = residents.filter(r =>
    (r.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.barangay_name || '').toLowerCase().includes(search.toLowerCase())
  )

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (r) => {
    setEditing(r.id)
    setForm({ household_id: r.household_id || '', name: r.name || '', birthdate: r.birthdate || '', relation_to_head: r.relation_to_head || '' })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.household_id || !form.birthdate) {
      alert('Name, household, and birthdate are required.'); return
    }
    setSaving(true)
    try {
      if (editing) { await apiPut(`/residents/${editing}`, form) }
      else { await apiPost('/residents', form) }
      setShowModal(false)
      load()
    } catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  const ageBracketCounts = residents.reduce((acc, r) => {
    const b = r.age_bracket || 'Unknown'
    acc[b] = (acc[b] || 0) + 1
    return acc
  }, {})

  if (loading) return <div className="card p-10 text-center text-gray-400">Loading residents…</div>
  if (error) return <div className="card p-10 text-center text-red-600">{error}</div>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-gray-800">{residents.length}</p><p className="text-xs text-gray-500 mt-1">Total Residents</p></div>
        {['Infant (0)','Child (1-12)','Teen (13-17)','Adult (18-59)','Senior (60+)'].slice(0,4).map(b => (
          <div key={b} className="card p-4 text-center"><p className="text-2xl font-bold text-primary-700">{ageBracketCounts[b] || 0}</p><p className="text-xs text-gray-500 mt-1">{b}</p></div>
        ))}
      </div>

      <div className="card p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search resident or barangay…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {canAdd && (
          <button className="btn-primary flex items-center gap-2 text-sm" onClick={openAdd}><Plus size={15} /> Register Resident</button>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['Res. ID','Name','Birthdate','Age Bracket','Relation to Head','Household','Barangay','Actions'].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="table-cell font-mono text-primary-700">{r.resident_id}</td>
                  <td className="table-cell font-medium">{r.name}</td>
                  <td className="table-cell">{r.birthdate}</td>
                  <td className="table-cell"><span className="badge-blue text-xs">{r.age_bracket}</span></td>
                  <td className="table-cell">{r.relation_to_head}</td>
                  <td className="table-cell font-mono text-xs">{r.hh_code}</td>
                  <td className="table-cell">{r.barangay_name || '—'}</td>
                  <td className="table-cell"><button className="p-1.5 rounded hover:bg-amber-50 text-amber-600" onClick={() => openEdit(r)}><Pencil size={15} /></button></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8} className="table-cell text-center text-gray-400 py-6">No residents found.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t text-xs text-gray-500">{filtered.length} of {residents.length} residents</div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-5">{editing ? 'Edit Resident' : 'Register Resident'}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Household</label>
                <select className="input" value={form.household_id} onChange={e => setForm({...form, household_id: e.target.value})} disabled={!!editing}>
                  <option value="">Select household…</option>
                  {households.map(h => <option key={h.id} value={h.id}>{h.household_id} — {h.head_family}</option>)}
                </select>
              </div>
              <div className="col-span-2"><label className="label">Full Name</label><input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div><label className="label">Birthdate</label><input className="input" type="date" value={form.birthdate} onChange={e => setForm({...form, birthdate: e.target.value})} /></div>
              <div>
                <label className="label">Relation to Head</label>
                <select className="input" value={form.relation_to_head} onChange={e => setForm({...form, relation_to_head: e.target.value})}>
                  <option value="">Select…</option>
                  {['Head','Spouse','Child','Parent','Sibling','Other'].map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">Age bracket is computed automatically from the birthdate.</p>
            <div className="flex justify-end gap-3 mt-6">
              <button className="btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}