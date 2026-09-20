import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Shield, ArrowLeft } from 'lucide-react'
import { apiGet, apiPost } from '../../utils/api'

const emptyForm = { name: '', email: '', contact: '', barangay_id: '', position: '', message: '' }

export default function RequestAccount() {
  const [barangays, setBarangays] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => { apiGet('/account-requests/barangays').then(setBarangays).catch(() => {}) }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.barangay_id) {
      setError('Name, email, and barangay are required.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await apiPost('/account-requests', form)
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-3">
      <div className="w-full max-w-lg">
        <div className="text-center mb-2">
          <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white shadow-lg mb-1">
            <Shield size={16} className="text-primary-700" />
          </div>
          <h1 className="text-sm font-bold text-white leading-tight">PDRA</h1>
          <p className="text-blue-200 text-[10px]">Gingoog City CDRRMO</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-5">
          <Link to="/login" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-2">
            <ArrowLeft size={12} /> Back to Login
          </Link>

          {!done ? (
            <>
              <h2 className="text-base font-semibold mb-0.5">Request an Account</h2>
              <p className="text-xs text-gray-500 mb-3">
                For Barangay Officials only. Fill this out and CDRRMO will create your account for your barangay.
              </p>

              {error && (
                <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">{error}</div>
              )}

              <form onSubmit={submit} className="space-y-2">
                <div className="grid sm:grid-cols-2 gap-2">
                  <div>
                    <label className="label text-xs">Full Name</label>
                    <input className="input py-1.5 text-sm" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Juan Dela Cruz" />
                  </div>
                  <div>
                    <label className="label text-xs">Email Address</label>
                    <input className="input py-1.5 text-sm" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
                  </div>
                  <div>
                    <label className="label text-xs">Contact Number</label>
                    <input className="input py-1.5 text-sm" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} placeholder="09XXXXXXXXX" />
                  </div>
                  <div>
                    <label className="label text-xs">Barangay</label>
                    <select className="input py-1.5 text-sm" value={form.barangay_id} onChange={e => setForm({ ...form, barangay_id: e.target.value })}>
                      <option value="">Select your barangay…</option>
                      {barangays.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label text-xs">Position (optional)</label>
                    <input className="input py-1.5 text-sm" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} placeholder="e.g. Barangay Secretary" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label text-xs">Message (optional)</label>
                    <textarea className="input py-1.5 text-sm" rows={1} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Anything CDRRMO should know…" />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full py-2 text-sm">
                  {loading ? 'Submitting…' : 'Submit Request'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-3">
              <div className="w-11 h-11 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-base font-semibold mb-1">Request Sent!</h2>
              <p className="text-xs text-gray-500 mb-3">
                CDRRMO will review your request and reach out to <strong>{form.email}</strong> once your account is ready.
              </p>
              <Link to="/login" className="btn-primary inline-block text-sm py-1.5 px-4">Back to Login</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}