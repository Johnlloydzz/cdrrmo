import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Shield, ArrowLeft } from 'lucide-react'
import { apiPost } from '../../utils/api'

export default function RequestPasswordReset() {
  const [identifier, setIdentifier] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!identifier.trim()) { setError('Enter your username or email.'); return }
    setError('')
    setLoading(true)
    try {
      await apiPost('/password-reset-requests', { identifier, message })
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-3">
      <div className="w-full max-w-md">
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
              <h2 className="text-base font-semibold mb-0.5">Request a Password Reset</h2>
              <p className="text-xs text-gray-500 mb-3">
                Can't receive the OTP email? CDRRMO will reset your password directly and reach out to you.
              </p>

              {error && (
                <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">{error}</div>
              )}

              <form onSubmit={submit} className="space-y-2">
                <div>
                  <label className="label text-xs">Username or Email</label>
                  <input className="input py-1.5 text-sm" value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="your username or email" />
                </div>
                <div>
                  <label className="label text-xs">Message (optional)</label>
                  <textarea className="input py-1.5 text-sm" rows={2} value={message} onChange={e => setMessage(e.target.value)} placeholder="How CDRRMO can reach you (phone number, etc.)" />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full py-2 text-sm">
                  {loading ? 'Sending…' : 'Send Request'}
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
                If that account exists, CDRRMO has been notified and will reach out with your new password.
              </p>
              <Link to="/login" className="btn-primary inline-block text-sm py-1.5 px-4">Back to Login</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}