import { useState, useEffect } from 'react'
import { Archive as ArchiveIcon, RotateCcw } from 'lucide-react'
import { apiGet, apiPost } from '../utils/api'

export default function Archive() {
  const [barangays, setBarangays] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [restoringId, setRestoringId] = useState(null)

  const loadArchived = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await apiGet('/barangays/archived')
      setBarangays(data)
    } catch (err) {
      setError(err.message || 'Failed to load archived barangays.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadArchived() }, [])

  const handleRestore = async (id) => {
    if (!window.confirm('Restore this barangay back to the active list?')) return
    setRestoringId(id)
    try {
      await apiPost(`/barangays/${id}/restore`, {})
      setBarangays(prev => prev.filter(b => b.id !== id))
    } catch (err) {
      alert(err.message || 'Failed to restore barangay.')
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-4 flex items-center gap-3">
        <ArchiveIcon size={20} className="text-gray-500" />
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Archived Barangays</h2>
          <p className="text-sm text-gray-500">Barangays that have been removed from the active list. Restore them here if needed.</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Barangay Name','Captain','Population','Risk Level','Archived On','Actions'].map(h => (
                  <th key={h} className="table-head">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr><td colSpan={6} className="table-cell text-center text-gray-400 py-8">Loading archived barangays…</td></tr>
              )}
              {!loading && barangays.map(b => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-cell font-medium text-gray-800">{b.name}</td>
                  <td className="table-cell">{b.captain}</td>
                  <td className="table-cell">{(b.population || 0).toLocaleString()}</td>
                  <td className="table-cell">{b.risk_level}</td>
                  <td className="table-cell text-sm text-gray-500">
                    {b.archived_at ? new Date(b.archived_at).toLocaleString() : '—'}
                  </td>
                  <td className="table-cell">
                    <button
                      className="btn-secondary flex items-center gap-1.5 text-xs"
                      onClick={() => handleRestore(b.id)}
                      disabled={restoringId === b.id}
                    >
                      <RotateCcw size={14} />
                      {restoringId === b.id ? 'Restoring…' : 'Restore'}
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && barangays.length === 0 && (
                <tr><td colSpan={6} className="table-cell text-center text-gray-400 py-8">No archived barangays.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}