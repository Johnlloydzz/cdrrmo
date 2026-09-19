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
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-lg mb-4">
            <Shield size={32} className="text-primary-700" />
          </div>
          <h1 className="text-2xl font-bold text-white">PDRA</h1>
          <p className="text-blue-200 text-sm mt-1">Gingoog City CDRRMO</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <Link to="/login" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-5">
            <ArrowLeft size={14} /> Back to Login
          </Link>

          {!done ? (
            <>
              <h2 className="text-xl font-semibold mb-1">Request a Password Reset</h2>
              <p className="text-sm text-gray-500 mb-6">
                Can't receive the OTP email? CDRRMO will reset your password directly and reach out to you.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
              )}

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="label">Username or Email</label>
                  <input className="input" value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="your username or email" />
                </div>
                <div>
                  <label className="label">Message (optional)</label>
                  <textarea className="input" rows={3} value={message} onChange={e => setMessage(e.target.value)} placeholder="How CDRRMO can reach you (phone number, etc.)" />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'Sending…' : 'Send Request'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2">Request Sent!</h2>
              <p className="text-sm text-gray-500 mb-6">
                If that account exists, CDRRMO has been notified and will reach out with your new password.
              </p>
              <Link to="/login" className="btn-primary inline-block">Back to Login</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}