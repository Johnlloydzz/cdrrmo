import { useState, useEffect } from 'react'
import { Save, Database } from 'lucide-react'
import { apiGet, apiPut } from '../utils/api'

export default function Settings({ currentUser }) {
  const isCdrrmo = currentUser?.role === 'CDRRMO Personnel'
  const [system, setSystem] = useState({ name: '', address: '', contact: '', email: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    apiGet('/settings/system-info').then(setSystem).catch(err => setError(err.message)).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      await apiPut('/settings/system-info', system)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err.message || 'Could not save settings.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="max-w-3xl">
      <div className="card p-6 space-y-4">
        <div className="h-5 w-40 bg-gray-100 rounded animate-pulse" />
        <div className="h-9 bg-gray-100 rounded animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-9 bg-gray-100 rounded animate-pulse" />
          <div className="h-9 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
    </div>
  )

  return (
    <div className="max-w-3xl space-y-4">
      {saved && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">✓ Settings saved successfully.</div>}
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      <div className="card p-6">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-5">
          <Database size={18} className="text-primary-600" /> System Information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">System Name</label>
            <input className="input" value={system.name} disabled={!isCdrrmo} onChange={e => setSystem({ ...system, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Address</label>
            <input className="input" value={system.address} disabled={!isCdrrmo} onChange={e => setSystem({ ...system, address: e.target.value })} />
          </div>
          <div>
            <label className="label">Contact Number</label>
            <input className="input" value={system.contact} disabled={!isCdrrmo} onChange={e => setSystem({ ...system, contact: e.target.value })} />
          </div>
          <div className="col-span-2">
            <label className="label">Email</label>
            <input className="input" type="email" value={system.email} disabled={!isCdrrmo} onChange={e => setSystem({ ...system, email: e.target.value })} />
          </div>
        </div>
      </div>

      {isCdrrmo && (
        <div className="flex justify-end">
          <button className="btn-primary flex items-center gap-2" onClick={handleSave} disabled={saving}>
            <Save size={15} /> {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      )}
    </div>
  )
}