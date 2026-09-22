import { useState, useEffect } from 'react'
import { Save, Database, Phone } from 'lucide-react'
import { apiGet, apiPut } from '../utils/api'

export default function Settings({ currentUser }) {
  const isCdrrmo = currentUser?.role === 'CDRRMO Personnel'
  const isBarangayOfficial = currentUser?.role === 'Barangay Official'

  const [system, setSystem] = useState({ name: '', address: '', contact: '', email: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Barangay Official's own barangay contact info — this is what shows up
  // on the GIS Map's barangay info panel (Captain / emergency contact
  // number), so CDRRMO can reach them quickly.
  const [myBarangay, setMyBarangay] = useState({ captain_name: '', contact_number: '' })
  const [barangaySaving, setBarangaySaving] = useState(false)
  const [barangaySaved, setBarangaySaved] = useState(false)
  const [barangayError, setBarangayError] = useState('')

  useEffect(() => {
    apiGet('/settings/system-info').then(setSystem).catch(err => setError(err.message)).finally(() => setLoading(false))
    if (isBarangayOfficial && currentUser?.barangay_id) {
      apiGet(`/barangays/${currentUser.barangay_id}`)
        .then(b => setMyBarangay({ captain_name: b.captain_name || '', contact_number: b.contact_number || '' }))
        .catch(() => {})
    }
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

  const handleSaveBarangay = async () => {
    setBarangaySaving(true)
    setBarangayError('')
    try {
      await apiPut(`/barangays/${currentUser.barangay_id}/contact`, myBarangay)
      setBarangaySaved(true)
      setTimeout(() => setBarangaySaved(false), 2000)
    } catch (err) {
      setBarangayError(err.message || 'Could not save contact info.')
    } finally {
      setBarangaySaving(false)
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
      {isBarangayOfficial && (
        <div className="card p-6">
          {barangaySaved && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">✓ Contact info saved successfully.</div>}
          {barangayError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{barangayError}</div>}
          <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
            <Phone size={18} className="text-primary-600" /> My Barangay Contact Info
          </h3>
          <p className="text-xs text-gray-500 mb-5">
            This is what CDRRMO sees on the map when they need to reach your barangay quickly during an emergency.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Captain Name</label>
              <input className="input" value={myBarangay.captain_name} onChange={e => setMyBarangay({ ...myBarangay, captain_name: e.target.value })} placeholder="e.g. Juan Dela Cruz" />
            </div>
            <div>
              <label className="label">Emergency Contact Number</label>
              <input className="input" type="tel" value={myBarangay.contact_number} onChange={e => setMyBarangay({ ...myBarangay, contact_number: e.target.value })} placeholder="09XXXXXXXXX" />
            </div>
          </div>
          <div className="flex justify-end mt-5">
            <button className="btn-primary flex items-center gap-2" onClick={handleSaveBarangay} disabled={barangaySaving}>
              <Save size={15} /> {barangaySaving ? 'Saving…' : 'Save Contact Info'}
            </button>
          </div>
        </div>
      )}

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