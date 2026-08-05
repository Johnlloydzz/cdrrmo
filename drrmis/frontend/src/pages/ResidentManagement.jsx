import { useState, useEffect } from 'react'
import { Search, Plus, Eye, Pencil } from 'lucide-react'
import { apiGet, apiPost, apiPut } from '../utils/api'

const Tag = ({ show, label }) => show ? <span className="badge-blue text-xs">{label}</span> : null
const emptyForm = { household_id: '', name: '', birthdate: '', age: '', gender: 'Male', civil_status: 'Single', occupation: '', blood_type: '', is_pwd: false, is_senior: false, is_pregnant: false }

export default function ResidentManagement() {
  const [residents, setResidents] = useState([])
  const [households, setHouseholds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const load = () => { setLoading(true); apiGet('/residents').then(setResidents).catch(err => setError(err.message)).finally(() => setLoading(false)) }
  useEffect(() => { load(); apiGet('/households').then(setHouseholds).catch(() => {}) }, [])

  const filtered = residents.filter(r => (r.name || '').toLowerCase().includes(search.toLowerCase()) || (r.barangay_name || '').toLowerCase().includes(search.toLowerCase()))

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (r) => {
    setEditing(r.id)
    setForm({ household_id: r.household_id || '', name: r.name || '', birthdate: r.birthdate || '', age: r.age || '', gender: r.gender || 'Male', civil_status: r.civil_status || 'Single', occupation: r.occupation || '', blood_type: r.blood_type || '', is_pwd: !!r.is_pwd, is_senior: !!r.is_senior, is_pregnant: !!r.is_pregnant })
    setShowModal(true)
  }
  const handleSave = async () => {
    if (!form.name.trim() || !form.household_id) { alert('Name and household are required.'); return }
    setSaving(true)
    try { if (editing) { await apiPut(`/residents/${editing}`, form) } else { await apiPost('/residents', form) } setShowModal(false); load() }
    catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  if (loading) return <div className="card p-10 text-center text-gray-400">Loading residents…</div>
  if (error) return <div className="card p-10 text-center text-red-600">{error}</div>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Residents', value: residents.length, color: 'text-gray-800' },
          { label: 'Senior Citizens', value: residents.filter(r => r.is_senior).length, color: 'text-amber-600' },
          { label: 'PWD', value: residents.filter(r => r.is_pwd).length, color: 'text-blue-600' },
          { label: 'Pregnant', value: residents.filter(r => r.is_pregnant).length, color: 'text-pink-600' },
        ].map(s => (<div key={s.label} className="card p-4 text-center"><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p><p className="text-xs text-gray-500 mt-1">{s.label}</p></div>))}
      </div>
      <div className="card p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search resident or barangay…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn-primary flex items-center gap-2 text-sm" onClick={openAdd}><Plus size={15} /> Register Resident</button>
      </div>
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200"><tr>{['Res. ID','Name','Age','Gender','Civil Status','Occupation','Barangay','Blood Type','Tags','Actions'].map(h => <th key={h} className="table-head">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="table-cell font-mono text-primary-700">{r.resident_id}</td>
                  <td className="table-cell font-medium">{r.name}</td>
                  <td className="table-cell">{r.age}</td>
                  <td className="table-cell">{r.gender}</td>
                  <td className="table-cell">{r.civil_status}</td>
                  <td className="table-cell">{r.occupation}</td>
                  <td className="table-cell">{r.barangay_name || '—'}</td>
                  <td className="table-cell">{r.blood_type}</td>
                  <td className="table-cell"><div className="flex gap-1 flex-wrap"><Tag show={r.is_pwd} label="PWD" /><Tag show={r.is_senior} label="Senior" /><Tag show={r.is_pregnant} label="Pregnant" /></div></td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><Eye size={15} /></button>
                      <button className="p-1.5 rounded hover:bg-amber-50 text-amber-600" onClick={() => openEdit(r)}><Pencil size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={10} className="table-cell text-center text-gray-400 py-6">No residents found.</td></tr>}
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
              <div className="col-span-2"><label className="label">Household</label>
                <select className="input" value={form.household_id} onChange={e => setForm({...form, household_id: e.target.value})} disabled={!!editing}>
                  <option value="">Select household…</option>{households.map(h => <option key={h.id} value={h.id}>{h.household_id} — {h.head_family}</option>)}
                </select>
              </div>
              <div className="col-span-2"><label className="label">Full Name</label><input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div><label className="label">Birthdate</label><input className="input" type="date" value={form.birthdate} onChange={e => setForm({...form, birthdate: e.target.value})} /></div>
              <div><label className="label">Age</label><input className="input" type="number" value={form.age} onChange={e => setForm({...form, age: e.target.value})} /></div>
              <div><label className="label">Gender</label><select className="input" value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}><option>Male</option><option>Female</option></select></div>
              <div><label className="label">Civil Status</label><select className="input" value={form.civil_status} onChange={e => setForm({...form, civil_status: e.target.value})}>{['Single','Married','Widowed','Widower','Separated'].map(c => <option key={c}>{c}</option>)}</select></div>
              <div><label className="label">Occupation</label><input className="input" value={form.occupation} onChange={e => setForm({...form, occupation: e.target.value})} /></div>
              <div><label className="label">Blood Type</label><input className="input" value={form.blood_type} onChange={e => setForm({...form, blood_type: e.target.value})} /></div>
              <div className="col-span-2 flex gap-4 pt-2">
                {[['is_pwd','PWD'],['is_senior','Senior Citizen'],['is_pregnant','Pregnant']].map(([k,l]) => (
                  <label key={k} className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form[k]} onChange={e => setForm({...form, [k]: e.target.checked})} className="rounded text-primary-600" />{l}</label>
                ))}
              </div>
            </div>
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