import { useState, useEffect } from 'react'
import { Search, Plus, Pencil, Trash2, UserCog, Inbox, Check, X, KeyRound, Copy } from 'lucide-react'
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api'
import { SkeletonTableRows } from '../components/Skeleton'

const STATUS_BADGE = { Active: 'badge-green', Inactive: 'badge-gray', Suspended: 'badge-red' }
const ROLES = ['CDRRMO Personnel', 'Barangay Official']
const emptyForm = { name: '', username: '', email: '', password: '', role: 'CDRRMO Personnel', barangay_id: '', status: 'Active' }

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [barangays, setBarangays] = useState([])
  const [requests, setRequests] = useState([])
  const [pwRequests, setPwRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [fromRequestId, setFromRequestId] = useState(null)
  const [fromPwRequestId, setFromPwRequestId] = useState(null)
  const [resetSuccess, setResetSuccess] = useState(null)
  const [copied, setCopied] = useState(false)

  const load = () => { setLoading(true); apiGet('/users').then(setUsers).catch(err => setError(err.message)).finally(() => setLoading(false)) }
  const loadRequests = () => apiGet('/account-requests?status=Pending').then(setRequests).catch(() => {})
  const loadPwRequests = () => apiGet('/password-reset-requests?status=Pending').then(setPwRequests).catch(() => {})
  useEffect(() => {
    load()
    loadRequests()
    loadPwRequests()
    apiGet('/barangays').then(setBarangays).catch(() => {})
    // Poll for live online/offline status — no manual refresh needed while
    // this page stays open, e.g. during a live demo.
    const interval = setInterval(() => { apiGet('/users').then(setUsers).catch(() => {}); loadRequests(); loadPwRequests() }, 15000)
    return () => clearInterval(interval)
  }, [])

  // A Barangay Official's account request, approved into a prefilled Add
  // User form — CDRRMO still picks the username/password by hand.
  const openFromRequest = (r) => {
    setEditing(null)
    setFromRequestId(r.id)
    setFromPwRequestId(null)
    setForm({ ...emptyForm, name: r.name, email: r.email, role: 'Barangay Official', barangay_id: r.barangay_id })
    setShowModal(true)
  }

  const approveRequest = async (r) => {
    try {
      await apiPut(`/account-requests/${r.id}/approve`, {})
      loadRequests()
      openFromRequest(r)
    } catch (err) { alert(err.message) }
  }

  const rejectRequest = async (id) => {
    if (!window.confirm('Reject this account request?')) return
    try { await apiPut(`/account-requests/${id}/reject`, {}); loadRequests() } catch (err) { alert(err.message) }
  }

  // A "can't receive OTP" request, opened straight into Edit User with the
  // password field ready — CDRRMO types the new password by hand, then
  // relays it to the official outside the system (call, text, in person).
  const openResetPassword = (r) => {
    setFromRequestId(null)
    setFromPwRequestId(r.id)
    setEditing(r.user_id)
    setForm({
      name: r.user_name, username: r.username, email: r.email, password: '',
      role: r.role, barangay_id: '', status: 'Active',
    })
    apiGet(`/users/${r.user_id}`).then(u => setForm(f => ({ ...f, barangay_id: u.barangay_id || '', status: u.status }))).catch(() => {})
    setShowModal(true)
  }

  const dismissPwRequest = async (id) => {
    if (!window.confirm('Dismiss this request without resetting the password?')) return
    try { await apiPut(`/password-reset-requests/${id}/resolve`, {}); loadPwRequests() } catch (err) { alert(err.message) }
  }

  const filtered = users.filter(u =>
    ((u.name || '').toLowerCase().includes(search.toLowerCase()) || (u.username || '').toLowerCase().includes(search.toLowerCase())) &&
    (filterRole === 'All' || u.role === filterRole)
  )

  const openAdd = () => { setEditing(null); setFromRequestId(null); setFromPwRequestId(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (u) => { setEditing(u.id); setFromRequestId(null); setFromPwRequestId(null); setForm({ ...u, barangay_id: u.barangay_id || '', password: '' }); setShowModal(true) }
  const handleDelete = async (id) => { if (!window.confirm('Delete this user account?')) return; try { await apiDelete(`/users/${id}`); load() } catch (err) { alert(err.message) } }

  const handleSave = async () => {
    if (!form.name.trim() || !form.username.trim() || !form.email.trim() || (!editing && !form.password.trim())) {
      alert('Name, username, email, and password are required.'); return
    }
    if (fromPwRequestId && !form.password.trim()) {
      alert('Enter a new password for this account.'); return
    }
    if (form.role === 'Barangay Official' && !form.barangay_id) {
      alert('Barangay Officials must be assigned to a barangay.'); return
    }
    setSaving(true)
    try {
      if (editing) {
        const payload = { name: form.name, email: form.email, role: form.role, barangay_id: form.role === 'Barangay Official' ? form.barangay_id : null, status: form.status }
        if (form.password.trim()) payload.password = form.password
        await apiPut(`/users/${editing}`, payload)
        if (fromPwRequestId) {
          await apiPut(`/password-reset-requests/${fromPwRequestId}/resolve`, {})
          // Show the new password on screen so CDRRMO can relay it to the
          // official themselves (call, text, Viber, in person) — nothing
          // else in this flow ever displays it again after this.
          setResetSuccess({ name: form.name, username: form.username, password: form.password })
        }
      } else {
        await apiPost('/users', { ...form, barangay_id: form.role === 'Barangay Official' ? form.barangay_id : null })
      }
      setShowModal(false)
      setFromRequestId(null)
      setFromPwRequestId(null)
      load()
      loadPwRequests()
    } catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="space-y-4">
      <div className="card p-4 flex gap-3 items-center justify-between">
        <div className="h-9 bg-gray-100 rounded flex-1 max-w-xs animate-pulse" />
        <div className="h-9 w-32 bg-gray-100 rounded animate-pulse" />
        <div className="h-9 w-36 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>{['Name','Username','Email','Role','Barangay','Online','Status','Last Login','Actions'].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
          </thead>
          <tbody><SkeletonTableRows columns={9} rows={5} /></tbody>
        </table>
      </div>
    </div>
  )
  if (error) return <div className="card p-10 text-center text-red-600">{error}</div>

  return (
    <div className="space-y-4">
      {requests.length > 0 && (
        <div className="card p-0 overflow-hidden border-amber-200">
          <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
            <Inbox size={15} className="text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-800">Pending Account Requests ({requests.length})</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {requests.map(r => (
              <div key={r.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{r.name} <span className="text-gray-400 font-normal">— {r.barangay_name}</span></p>
                  <p className="text-xs text-gray-500">{r.email}{r.contact ? ` · ${r.contact}` : ''}{r.position ? ` · ${r.position}` : ''}</p>
                  {r.message && <p className="text-xs text-gray-400 mt-0.5 italic">"{r.message}"</p>}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button className="btn-secondary text-xs flex items-center gap-1 px-3 py-1.5" onClick={() => rejectRequest(r.id)}>
                    <X size={13} /> Reject
                  </button>
                  <button className="btn-primary text-xs flex items-center gap-1 px-3 py-1.5" onClick={() => approveRequest(r)}>
                    <Check size={13} /> Approve &amp; Create Account
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pwRequests.length > 0 && (
        <div className="card p-0 overflow-hidden border-amber-200">
          <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
            <KeyRound size={15} className="text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-800">Password Reset Requests ({pwRequests.length})</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {pwRequests.map(r => (
              <div key={r.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{r.user_name} <span className="text-gray-400 font-normal">— {r.barangay_name || r.role}</span></p>
                  <p className="text-xs text-gray-500 font-mono">{r.username} · {r.email}</p>
                  {r.message && <p className="text-xs text-gray-400 mt-0.5 italic">"{r.message}"</p>}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button className="btn-secondary text-xs flex items-center gap-1 px-3 py-1.5" onClick={() => dismissPwRequest(r.id)}>
                    <X size={13} /> Dismiss
                  </button>
                  <button className="btn-primary text-xs flex items-center gap-1 px-3 py-1.5" onClick={() => openResetPassword(r)}>
                    <KeyRound size={13} /> Reset Password
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3 flex-wrap flex-1">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9" placeholder="Search name or username…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input w-auto" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="All">All Roles</option>
            {ROLES.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <button className="btn-primary flex items-center gap-2 text-sm" onClick={openAdd}><Plus size={15} /> Add User</button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['Name','Username','Email','Role','Barangay','Online','Status','Last Login','Actions'].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium"><span className="flex items-center gap-1.5"><UserCog size={13} className="text-primary-500" />{u.name}</span></td>
                  <td className="table-cell font-mono text-gray-600">{u.username}</td>
                  <td className="table-cell">{u.email}</td>
                  <td className="table-cell">{u.role}</td>
                  <td className="table-cell">{u.barangay_name || '—'}</td>
                  <td className="table-cell">
                    {u.is_online ? (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                        </span>
                        Online
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-gray-400">
                        <span className="h-2.5 w-2.5 rounded-full bg-gray-300"></span>
                        Offline
                      </span>
                    )}
                  </td>
                  <td className="table-cell"><span className={STATUS_BADGE[u.status] || 'badge-gray'}>{u.status}</span></td>
                  <td className="table-cell text-xs text-gray-500">{u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}</td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button className="p-1.5 rounded hover:bg-amber-50 text-amber-600" onClick={() => openEdit(u)}><Pencil size={15} /></button>
                      <button className="p-1.5 rounded hover:bg-red-50 text-red-600" onClick={() => handleDelete(u.id)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={9} className="table-cell text-center text-gray-400 py-8">No users found.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">{filtered.length} of {users.length} accounts</div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-1">{editing ? 'Edit User' : 'Add User'}</h3>
            {fromRequestId && !editing && (
              <p className="text-xs text-primary-600 mb-4">Prefilled from an approved account request. Set a username and password to finish.</p>
            )}
            {fromPwRequestId && (
              <p className="text-xs text-primary-600 mb-4">Resetting this account's password. Type a new one below, then relay it to the official yourself.</p>
            )}
            {!fromRequestId && !fromPwRequestId && <div className="mb-5" />}
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Full Name</label><input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div><label className="label">Username</label><input className="input" value={form.username} onChange={e => setForm({...form, username: e.target.value})} disabled={!!editing} /></div>
              <div className="col-span-2"><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
              <div className="col-span-2">
                <label className="label">{editing ? 'New Password' : 'Password'} {editing && !fromPwRequestId && <span className="text-gray-400 font-normal">(leave blank to keep current)</span>}</label>
                <input className="input" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder={editing ? 'Leave blank to keep current password' : ''} />
              </div>
              <div><label className="label">Role</label><select className="input" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>{ROLES.map(r => <option key={r}>{r}</option>)}</select></div>
              <div>
                <label className="label">Barangay {form.role === 'Barangay Official' && <span className="text-red-500">*</span>}</label>
                <select className="input" value={form.barangay_id} onChange={e => setForm({...form, barangay_id: e.target.value})} disabled={form.role !== 'Barangay Official'}>
                  <option value="">{form.role === 'CDRRMO Personnel' ? 'N/A (city-wide access)' : 'Select barangay…'}</option>
                  {barangays.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="col-span-2"><label className="label">Status</label><select className="input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>{['Active','Inactive','Suspended'].map(s => <option key={s}>{s}</option>)}</select></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button className="btn-secondary" onClick={() => { setShowModal(false); setFromRequestId(null); setFromPwRequestId(null) }} disabled={saving}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : (editing ? 'Save Changes' : 'Add User')}</button>
            </div>
          </div>
        </div>
      )}

      {resetSuccess && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-2 mb-1">
              <KeyRound size={18} className="text-primary-600" />
              <h3 className="text-lg font-semibold">Password Reset</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Send this new password to <strong>{resetSuccess.name}</strong> yourself — call, text, Viber, or in person. This is the only time it will be shown.
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-2">
              <p className="text-xs text-gray-500 mb-1">Username</p>
              <p className="font-mono text-sm text-gray-800">{resetSuccess.username}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">New Password</p>
                <p className="font-mono text-lg font-semibold text-gray-900 tracking-wide">{resetSuccess.password}</p>
              </div>
              <button
                type="button"
                className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 flex-shrink-0"
                onClick={() => { navigator.clipboard.writeText(resetSuccess.password); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
                title="Copy password"
              >
                {copied ? <Check size={17} className="text-green-600" /> : <Copy size={17} />}
              </button>
            </div>
            <button className="btn-primary w-full mt-5" onClick={() => { setResetSuccess(null); setCopied(false) }}>Done</button>
          </div>
        </div>
      )}
    </div>
  )
}