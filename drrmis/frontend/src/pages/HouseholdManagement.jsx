import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Search, Plus, Eye, Pencil, Trash2 } from 'lucide-react'
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api'
import { Skeleton, SkeletonTableRows, useSkeletonRows } from '../components/Skeleton'

const emptyForm = { household_code: '', barangay_id: '', purok_id: '', head_resident_id: '' }

export default function HouseholdManagement({ currentUser }) {
  const canAdd = currentUser?.role === 'Barangay Official'
  const [households, setHouseholds] = useState([])
  const [barangays, setBarangays] = useState([])
  const [puroks, setPuroks] = useState([])
  const [loading, setLoading] = useState(true)
  // Skeleton shows as many rows as this user saw here last time.
  const skeletonRows = useSkeletonRows('households', households.length, loading)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  // Registered residents who can be picked as Head of Family: relation "Head"
  // and not in a household yet (plus the current Head, when editing).
  const [headOptions, setHeadOptions] = useState([])
  const [headsLoading, setHeadsLoading] = useState(false)

  const loadHeads = async (household) => {
    setHeadsLoading(true)
    try {
      const unassigned = await apiGet('/residents?unassigned=1&relation=Head')
      const current = household ? await apiGet(`/residents?household_id=${household.id}&relation=Head`) : []
      setHeadOptions([...current, ...unassigned])
      // When editing, pre-select the resident who is this household's Head
      if (household) {
        const match = current.find(r => r.name === household.head_family) || current[0]
        if (match) setForm(f => ({ ...f, head_resident_id: String(match.id) }))
      }
    } catch { setHeadOptions([]) } finally { setHeadsLoading(false) }
  }

  const load = () => {
    setLoading(true)
    apiGet('/households').then(setHouseholds).catch(err => setError(err.message)).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    apiGet('/barangays').then(setBarangays).catch(() => {})
    apiGet('/puroks').then(setPuroks).catch(() => {})
  }, [])

  const filtered = households.filter(h =>
    (h.head_family || '').toLowerCase().includes(search.toLowerCase()) ||
    (h.barangay_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (h.household_id || '').toLowerCase().includes(search.toLowerCase())
  )

  const puroksForBarangay = (barangayId) => puroks.filter(p => String(p.barangay_id) === String(barangayId))

  const openAdd = () => {
    setEditing(null)
    setForm(canAdd ? { ...emptyForm, barangay_id: currentUser?.barangay_id || '' } : emptyForm)
    loadHeads(null)
    setShowModal(true)
  }
  const openEdit = (h) => {
    setEditing(h.id)
    setForm({
      household_code: h.household_id || '', barangay_id: h.barangay_id || '', purok_id: h.purok_id || '', head_resident_id: '',
    })
    loadHeads(h)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this household record?')) return
    try { await apiDelete(`/households/${id}`); load() } catch (err) { alert(err.message) }
  }

  const handleSave = async () => {
    if (!form.head_resident_id || !form.barangay_id || !form.purok_id) {
      alert('Head of family, barangay, and purok are required.'); return
    }
    setSaving(true)
    try {
      if (editing) { await apiPut(`/households/${editing}`, form) }
      else { await apiPost('/households', form) }
      setShowModal(false)
      load()
    } catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  if (error) return <div className="card p-10 text-center text-red-600">{error}</div>

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search household, head, barangay…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {canAdd && (
          <button className="btn-primary flex items-center gap-2 text-sm" onClick={openAdd}><Plus size={15} /> Register Household</button>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['HH ID', ...(canAdd ? [] : ['Barangay']), 'Purok','Head of Family','Members', ...(canAdd ? ['Actions'] : [])].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
            </thead>
            <tbody key={loading ? 'loading' : 'loaded'} className={`divide-y divide-gray-100 ${loading ? '' : 'animate-fade-in'}`}>
              {loading ? <SkeletonTableRows columns={5} actions={canAdd} rows={skeletonRows} /> : (<>
              {filtered.map(h => (
                <tr key={h.id} className="hover:bg-gray-50">
                  <td className="table-cell font-mono text-primary-700">{h.household_id}</td>
                  {!canAdd && <td className="table-cell">{h.barangay_name || '—'}</td>}
                  <td className="table-cell">
                    {h.purok_name || '—'}
                    {h.in_flood_risk_zone && <span className="badge-red text-xs ml-2">High Risk</span>}
                  </td>
                  <td className="table-cell font-medium">{h.head_family}</td>
                  <td className="table-cell">{h.member_count ?? 0}</td>
                  {canAdd && (
                    <td className="table-cell">
                      <div className="flex gap-2">
                        <button className="p-1.5 rounded hover:bg-amber-50 text-amber-600" onClick={() => openEdit(h)}><Pencil size={15} /></button>
                        <button className="p-1.5 rounded hover:bg-red-50 text-red-600" onClick={() => handleDelete(h.id)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="table-cell text-center text-gray-400 py-6">No households found.</td></tr>}
              </>)}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t text-xs text-gray-500">{loading ? <span className="inline-flex h-4 items-center"><Skeleton className="h-3 w-24" /></span> : <>{filtered.length} of {households.length} households</>}</div>
      </div>

      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: '90vh' }}>
            <h3 className="text-lg font-semibold px-6 pt-6 flex-shrink-0">{editing ? 'Edit Household' : 'Register Household'}</h3>
            <div className="overflow-y-auto px-6 py-4 flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Household Number</label>
                  <input
                    className="input"
                    maxLength={30}
                    placeholder={editing ? 'Household number' : 'Leave blank to auto-generate (HH-00001…)'}
                    value={form.household_code}
                    onChange={e => setForm({ ...form, household_code: e.target.value.toUpperCase() })}
                  />
                  <p className="text-xs text-gray-400 mt-1">Type the household number from your barangay records, or leave blank and the system assigns one.</p>
                </div>
                <div>
                  <label className="label">Barangay</label>
                  <select className="input" value={form.barangay_id} onChange={e => setForm({...form, barangay_id: e.target.value, purok_id: ''})} disabled={!!editing || canAdd}>
                    <option value="">Select barangay…</option>
                    {barangays.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Purok</label>
                  <select className="input" value={form.purok_id} onChange={e => setForm({...form, purok_id: e.target.value})} disabled={!form.barangay_id}>
                    <option value="">Select purok…</option>
                    {puroksForBarangay(form.barangay_id).map(p => <option key={p.id} value={p.id}>{p.name} ({p.flood_risk} risk)</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="label">Head of Family</label>
                  <select className="input" value={form.head_resident_id} onChange={e => setForm({...form, head_resident_id: e.target.value})} disabled={headsLoading}>
                    <option value="">{headsLoading ? 'Loading residents…' : 'Select the Head of Family…'}</option>
                    {headOptions.map(r => <option key={r.id} value={r.id}>{r.name} ({r.resident_id})</option>)}
                  </select>
                  {!headsLoading && headOptions.length === 0 ? (
                    <p className="text-xs text-amber-600 mt-1">
                      No available Head of Family. Register the head first in <Link to="/residents" className="underline font-medium">Residents</Link> with Relation to Head set to "Head".
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1">Only registered residents with Relation to Head "Head" and no household yet are listed.</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6 pt-2 flex-shrink-0 border-t border-gray-100">
              <button className="btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  )
}