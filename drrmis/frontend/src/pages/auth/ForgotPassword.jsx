import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Shield, ArrowLeft } from 'lucide-react'

const STEPS = ['email', 'otp', 'reset', 'done']

export default function ForgotPassword() {
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [passwords, setPasswords] = useState({ newPassword: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fakeAsync = (cb) => { setLoading(true); setTimeout(() => { setLoading(false); cb() }, 800) }

  const sendOTP = (e) => {
    e.preventDefault()
    if (!email) { setError('Enter your email address.'); return }
    setError('')
    fakeAsync(() => setStep('otp'))
  }

  const verifyOTP = (e) => {
    e.preventDefault()
    if (otp.length < 6) { setError('Enter the 6-digit OTP.'); return }
    setError('')
    fakeAsync(() => setStep('reset'))
  }

  const resetPassword = (e) => {
    e.preventDefault()
    if (passwords.newPassword.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (passwords.newPassword !== passwords.confirm) { setError('Passwords do not match.'); return }
    setError('')
    fakeAsync(() => setStep('done'))
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

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          {step === 'email' && (
            <>
              <h2 className="text-xl font-semibold mb-1">Forgot Password</h2>
              <p className="text-sm text-gray-500 mb-6">Enter your email to receive a one-time password.</p>
              <form onSubmit={sendOTP} className="space-y-4">
                <div>
                  <label className="label">Email Address</label>
                  <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Sending…' : 'Send OTP'}</button>
              </form>
            </>
          )}

          {step === 'otp' && (
            <>
              <h2 className="text-xl font-semibold mb-1">Enter OTP</h2>
              <p className="text-sm text-gray-500 mb-6">A 6-digit code was sent to <strong>{email}</strong>.</p>
              <form onSubmit={verifyOTP} className="space-y-4">
                <div>
                  <label className="label">One-Time Password</label>
                  <input className="input text-center text-2xl tracking-widest" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="000000" />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Verifying…' : 'Verify OTP'}</button>
              </form>
            </>
          )}

          {step === 'reset' && (
            <>
              <h2 className="text-xl font-semibold mb-1">Reset Password</h2>
              <p className="text-sm text-gray-500 mb-6">Enter your new password.</p>
              <form onSubmit={resetPassword} className="space-y-4">
                <div>
                  <label className="label">New Password</label>
                  <input className="input" type="password" value={passwords.newPassword} onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })} placeholder="Min. 8 characters" />
                </div>
                <div>
                  <label className="label">Confirm Password</label>
                  <input className="input" type="password" value={passwords.confirm} onChange={e => setPasswords({ ...passwords, confirm: e.target.value })} placeholder="Repeat new password" />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Saving…' : 'Reset Password'}</button>
              </form>
            </>
          )}

          {step === 'done' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2">Password Reset!</h2>
              <p className="text-sm text-gray-500 mb-6">Your password has been updated successfully.</p>
              <Link to="/login" className="btn-primary inline-block">Back to Login</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}