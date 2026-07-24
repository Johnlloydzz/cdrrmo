import { useState } from 'react'
import { Search, Plus, Pencil, Trash2, Shield } from 'lucide-react'

const ROLE_BADGE = {
  'Super Administrator': 'badge-red',
  'CDRRMO Personnel':   'badge-blue',
  'Barangay Admin':     'badge-green',
  'Field Responder':    'badge-orange',
  'Viewer':             'badge-gray',
}

const initialUsers = [
  { id: 1, name: 'System Administrator', username: 'sysadmin',   email: 'admin@gingoog.gov.ph',      role: 'Super Administrator', barangay: 'All',            status: 'Active',   lastLogin: '2026-07-13 08:00' },
  { id: 2, name: 'Carlos Mendoza',       username: 'cmendoza',   email: 'carlos@cdrrmo.gov.ph',      role: 'CDRRMO Personnel',    barangay: 'All',            status: 'Active',   lastLogin: '2026-07-13 07:45' },
  { id: 3, name: 'Ana Villanueva',       username: 'avillanueva',email: 'ana@kioskos.gov.ph',        role: 'Barangay Admin',      barangay: 'Kioskos',        status: 'Active',   lastLogin: '2026-07-13 06:30' },
  { id: 4, name: 'Roberto Lim',          username: 'rlim',       email: 'roberto@magsaysay.gov.ph',  role: 'Barangay Admin',      barangay: 'Magsaysay',      status: 'Active',   lastLogin: '2026-07-12 18:00' },
  { id: 5, name: 'Mark Responder',       username: 'mresponder', email: 'mark@cdrrmo.gov.ph',        role: 'Field Responder',     barangay: 'All',            status: 'Active',   lastLogin: '2026-07-13 08:10' },
  { id: 6, name: 'Liza Viewer',          username: 'lviewer',    email: 'liza@gingoog.gov.ph',       role: 'Viewer',              barangay: 'All',            status: 'Inactive', lastLogin: '2026-07-01 10:00' },
]

const PERMISSIONS = {
  'Super Administrator': ['Create','Edit','Delete','Approve','View','Export'],
  'CDRRMO Personnel':   ['Edit','Approve','View','Export'],
  'Barangay Admin':     ['Create','Edit','View'],
  'Field Responder':    ['Edit','View'],
  'Viewer':             ['View'],
}

export default function UserManagement({ currentUser }) {
  const isSuperAdmin = currentUser?.role === 'Super Administrator'
  const [users, setUsers] = useState(initialUsers)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', username: '', email: '', role: 'Viewer', barangay: '', status: 'Active' })

  const filtered = users.filter(u =>
    (u.name.toLowerCase().includes(search.toLowerCase()) ||
     u.username.toLowerCase().includes(search.toLowerCase()) ||
     u.email.toLowerCase().includes(search.toLowerCase())) &&
    (filterRole === 'All' || u.role === filterRole)
  )

  const openAdd = () => { setEditing(null); setForm({ name: '', username: '', email: '', role: 'Viewer', barangay: '', status: 'Active' }); setShowModal(true) }
  const openEdit = (u) => { setEditing(u.id); setForm({ ...u }); setShowModal(true) }
  const handleDelete = (id) => { if (window.confirm('Delete this user?')) setUsers(p => p.filter(u => u.id !== id)) }

  const handleSave = () => {
    if (!form.name.trim() || !form.username.trim()) return
    if (editing) {
      setUsers(p => p.map(u => u.id === editing ? { ...u, ...form } : u))
    } else {
      setUsers(p => [...p, { ...form, id: Date.now(), lastLogin: 'Never' }])
    }
    setShowModal(false)
  }

  return (
    <div className="space-y-4">
      {/* Role summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {Object.keys(ROLE_BADGE).map(role => (
          <div key={role} className="card p-4 text-center">
            <p className="text-2xl font-bold text-gray-800">{users.filter(u => u.role === role).length}</p>
            <p className="text-xs text-gray-500 mt-1 leading-tight">{role}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="card p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3 flex-wrap flex-1">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9" placeholder="Search by name, username, email…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input w-auto" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="All">All Roles</option>
            {Object.keys(ROLE_BADGE).map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <button className="btn-primary flex items-center gap-2 text-sm" onClick={openAdd} disabled={!isSuperAdmin}><Plus size={15} /> Add User</button>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Name','Username','Email','Role','Barangay','Permissions','Status','Last Login','Actions'].map(h => (
                  <th key={h} className="table-head">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-700 text-xs font-bold">{u.name.charAt(0)}</span>
                      </div>
                      <span className="font-medium text-gray-800">{u.name}</span>
                    </div>
                  </td>
                  <td className="table-cell font-mono text-sm">{u.username}</td>
                  <td className="table-cell text-sm">{u.email}</td>
                  <td className="table-cell"><span className={ROLE_BADGE[u.role]}>{u.role}</span></td>
                  <td className="table-cell text-sm">{u.barangay}</td>
                  <td className="table-cell">
                    <div className="flex flex-wrap gap-1">
                      {(PERMISSIONS[u.role] || []).map(p => (
                        <span key={p} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">
                          <Shield size={10} />{p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="table-cell"><span className={u.status === 'Active' ? 'badge-green' : 'badge-gray'}>{u.status}</span></td>
                  <td className="table-cell text-xs text-gray-500">{u.lastLogin}</td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      {isSuperAdmin && (
                        <button className="p-1.5 rounded hover:bg-amber-50 text-amber-600" onClick={() => openEdit(u)}><Pencil size={15} /></button>
                      )}
                      {isSuperAdmin && (
                        <button className="p-1.5 rounded hover:bg-red-50 text-red-600" onClick={() => handleDelete(u.id)}><Trash2 size={15} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
          {filtered.length} of {users.length} users
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-5">{editing ? 'Edit User' : 'Add User'}</h3>
            <div className="space-y-4">
              <div><label className="label">Full Name</label><input className="input" value={form.name} onChange={e => setForm({...form,name:e.target.value})} /></div>
              <div><label className="label">Username</label><input className="input" value={form.username} onChange={e => setForm({...form,username:e.target.value})} /></div>
              <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={e => setForm({...form,email:e.target.value})} /></div>
              <div>
                <label className="label">Role</label>
                <select className="input" value={form.role} onChange={e => setForm({...form,role:e.target.value})}>
                  {Object.keys(ROLE_BADGE).map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div><label className="label">Assigned Barangay</label><input className="input" value={form.barangay} onChange={e => setForm({...form,barangay:e.target.value})} placeholder="All or specific barangay" /></div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={e => setForm({...form,status:e.target.value})}>
                  <option>Active</option><option>Inactive</option>
                </select>
              </div>
              {!editing && (
                <div><label className="label">Temporary Password</label><input className="input" type="password" placeholder="Will be sent via email" /></div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>{editing ? 'Save Changes' : 'Create User'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
