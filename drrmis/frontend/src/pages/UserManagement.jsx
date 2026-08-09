import { useState, useEffect } from 'react'
import { Search, Plus, Pencil, Trash2, UserCog } from 'lucide-react'
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api'

const STATUS_BADGE = { Active: 'badge-green', Inactive: 'badge-gray', Suspended: 'badge-red' }
const ROLES = ['CDRRMO Personnel', 'Barangay Official']
const emptyForm = { name: '', username: '', email: '', password: '', role: 'CDRRMO Personnel', barangay: 'All', status: 'Active' }

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const load = () => { setLoading(true); apiGet('/users').then(setUsers).catch(err => setError(err.message)).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  const filtered = users.filter(u =>
    ((u.name || '').toLowerCase().includes(search.toLowerCase()) || (u.username || '').toLowerCase().includes(search.toLowerCase())) &&
    (filterRole === 'All' || u.role === filterRole)
  )

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (u) => { setEditing(u.id); setForm({ ...u, password: '' }); setShowModal(true) }
  const handleDelete = async (id) => { if (!window.confirm('Delete this user account?')) return; try { await apiDelete(`/users/${id}`); load() } catch (err) { alert(err.message) } }

  const handleSave = async () => {
    if (!form.name.trim() || !form.username.trim() || !form.email.trim() || (!editing && !form.password.trim())) {
      alert('Name, username, email, and password are required.'); return
    }
    setSaving(true)
    try {
      if (editing) {
        await apiPut(`/users/${editing}`, { name: form.name, email: form.email, role: form.role, barangay: form.barangay, status: form.status })
      } else {
        await apiPost('/users', form)
      }
      setShowModal(false)
      load()
    } catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  if (loading) return <div className="card p-10 text-center text-gray-400">Loading users…</div>
  if (error) return <div className="card p-10 text-center text-red-600">{error}</div>

  return (
    <div className="space-y-4">
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
              <tr>{['Name','Username','Email','Role','Barangay','Status','Last Login','Actions'].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium"><span className="flex items-center gap-1.5"><UserCog size={13} className="text-primary-500" />{u.name}</span></td>
                  <td className="table-cell font-mono text-gray-600">{u.username}</td>
                  <td className="table-cell">{u.email}</td>
                  <td className="table-cell">{u.role}</td>
                  <td className="table-cell">{u.barangay}</td>
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
              {filtered.length === 0 && <tr><td colSpan={8} className="table-cell text-center text-gray-400 py-8">No users found.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">{filtered.length} of {users.length} accounts</div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-5">{editing ? 'Edit User' : 'Add User'}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Full Name</label><input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div><label className="label">Username</label><input className="input" value={form.username} onChange={e => setForm({...form, username: e.target.value})} disabled={!!editing} /></div>
              <div className="col-span-2"><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
              {!editing && (<div className="col-span-2"><label className="label">Password</label><input className="input" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} /></div>)}
              <div><label className="label">Role</label><select className="input" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>{ROLES.map(r => <option key={r}>{r}</option>)}</select></div>
              <div><label className="label">Barangay</label><input className="input" value={form.barangay} onChange={e => setForm({...form, barangay: e.target.value})} placeholder="All, or specific barangay" /></div>
              <div className="col-span-2"><label className="label">Status</label><select className="input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>{['Active','Inactive','Suspended'].map(s => <option key={s}>{s}</option>)}</select></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button className="btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : (editing ? 'Save Changes' : 'Add User')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}