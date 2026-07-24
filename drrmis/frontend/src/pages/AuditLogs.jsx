import { useState } from 'react'
import { Search } from 'lucide-react'

const initial = [
  { id: 1, user: 'sysadmin',    action: 'LOGIN',      module: 'Auth',      detail: 'Successful login from 192.168.1.10',          time: '2026-07-13 08:00:14' },
  { id: 2, user: 'avillanueva', action: 'CREATE',     module: 'Incident',  detail: 'Created INC-005 — Flood in Kioskos',           time: '2026-07-13 07:45:22' },
  { id: 3, user: 'cmendoza',    action: 'UPDATE',     module: 'Incident',  detail: 'Updated INC-001 status to Responding',          time: '2026-07-13 07:30:05' },
  { id: 4, user: 'rlim',        action: 'CREATE',     module: 'Evacuation',detail: 'Logged EVAC-003 — Dela Cruz family',            time: '2026-07-12 14:02:50' },
  { id: 5, user: 'sysadmin',    action: 'DELETE',     module: 'User',      detail: 'Deleted user account: temp_user',               time: '2026-07-12 10:15:00' },
  { id: 6, user: 'cmendoza',    action: 'EXPORT',     module: 'Reports',   detail: 'Exported Incident Report (PDF)',                 time: '2026-07-11 17:00:30' },
  { id: 7, user: 'avillanueva', action: 'LOGIN',      module: 'Auth',      detail: 'Successful login from 192.168.1.22',            time: '2026-07-11 06:30:10' },
]

const ACTION_BADGE = { LOGIN: 'badge-blue', CREATE: 'badge-green', UPDATE: 'badge-yellow', DELETE: 'badge-red', EXPORT: 'badge-gray' }

export default function AuditLogs() {
  const [logs] = useState(initial)
  const [search, setSearch] = useState('')
  const [filterAction, setFilterAction] = useState('All')

  const filtered = logs.filter(l =>
    (l.user.includes(search.toLowerCase()) || l.detail.toLowerCase().includes(search.toLowerCase())) &&
    (filterAction === 'All' || l.action === filterAction)
  )

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search user or action…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={filterAction} onChange={e => setFilterAction(e.target.value)}>
          <option value="All">All Actions</option>
          {['LOGIN','CREATE','UPDATE','DELETE','EXPORT'].map(a => <option key={a}>{a}</option>)}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['#','User','Action','Module','Detail','Timestamp'].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(l => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="table-cell text-gray-400">{l.id}</td>
                  <td className="table-cell font-mono text-sm text-primary-700">{l.user}</td>
                  <td className="table-cell"><span className={ACTION_BADGE[l.action]}>{l.action}</span></td>
                  <td className="table-cell">{l.module}</td>
                  <td className="table-cell text-sm text-gray-600">{l.detail}</td>
                  <td className="table-cell text-xs text-gray-400">{l.time}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="table-cell text-center text-gray-400 py-8">No logs found.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t text-xs text-gray-500">{filtered.length} of {logs.length} log entries</div>
      </div>
    </div>
  )
}
