import { useState, useEffect } from 'react'
import { Search, ClipboardList } from 'lucide-react'
import { apiGet } from '../utils/api'

export default function AuditLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterAction, setFilterAction] = useState('All')

  useEffect(() => {
    setLoading(true)
    apiGet('/audit-logs').then(setLogs).catch(err => setError(err.message)).finally(() => setLoading(false))
  }, [])

  const actions = ['All', ...new Set(logs.map(l => l.action).filter(Boolean))]
  const filtered = logs.filter(l =>
    ((l.username || '').toLowerCase().includes(search.toLowerCase()) || (l.detail || '').toLowerCase().includes(search.toLowerCase())) &&
    (filterAction === 'All' || l.action === filterAction)
  )

  if (loading) return <div className="card p-10 text-center text-gray-400">Loading audit logs…</div>
  if (error) return <div className="card p-10 text-center text-red-600">{error}</div>

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3 flex-wrap flex-1">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9" placeholder="Search user or detail…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input w-auto" value={filterAction} onChange={e => setFilterAction(e.target.value)}>
            {actions.map(a => <option key={a}>{a}</option>)}
          </select>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['Date/Time','User','Action','Module','Detail'].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(l => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="table-cell whitespace-nowrap text-xs text-gray-500">{l.created_at ? new Date(l.created_at).toLocaleString() : ''}</td>
                  <td className="table-cell font-medium">{l.username || '—'}</td>
                  <td className="table-cell"><span className="flex items-center gap-1.5"><ClipboardList size={13} className="text-primary-500" />{l.action}</span></td>
                  <td className="table-cell">{l.module || '—'}</td>
                  <td className="table-cell text-gray-600 max-w-md truncate">{l.detail}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={5} className="table-cell text-center text-gray-400 py-8">No activity logged yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">Showing {filtered.length} of {logs.length} entries (most recent 200)</div>
      </div>
    </div>
  )
}