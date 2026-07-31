import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Shield, Eye, EyeOff, Users } from 'lucide-react'
import { DEMO_USERS, ROLE_COLORS } from '../../data/users'
import { apiPost } from '../../utils/api'
import { setStoredToken } from '../../utils/storage'

export default function Login({ onLogin }) {
  const [form, setForm] = useState({ username: '', password: '', remember: false })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showAccounts, setShowAccounts] = useState(false)
  const [sessionExpired] = useState(() => new URLSearchParams(window.location.search).get('expired') === '1')

  const handle = (e) =>
    setForm({ ...form, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const fillAccount = (user) => {
    setForm({ username: user.username, password: user.password, remember: false })
    setShowAccounts(false)
    setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.username || !form.password) {
      setError('Please enter your username and password.')
      return
    }
    setLoading(true)
    try {
      const data = await apiPost('/auth/login', {
        username: form.username,
        password: form.password,
      })
      setStoredToken(data.token)
      onLogin(data.user)
    } catch (err) {
      setError(err.message || 'Invalid username or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-lg mb-4">
            <Shield size={32} className="text-primary-700" />
          </div>
          <h1 className="text-2xl font-bold text-white">DRRMIS</h1>
          <p className="text-blue-200 text-sm mt-1">Gingoog City CDRRMO</p>
          <p className="text-blue-300 text-xs mt-1">Disaster Risk Reduction &amp; Management Information System</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Sign In</h2>
            <button
              type="button"
              onClick={() => setShowAccounts(!showAccounts)}
              className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-800 border border-primary-200 rounded-lg px-2.5 py-1.5 hover:bg-primary-50 transition-colors"
            >
              <Users size={13} />
              Demo Accounts
            </button>
          </div>

          {/* Demo accounts panel */}
          {showAccounts && (
            <div className="mb-5 p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Click to fill credentials</p>
              {DEMO_USERS.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => fillAccount(u)}
                  className="w-full flex items-center justify-between gap-3 p-2.5 rounded-lg bg-white border border-gray-200 hover:border-primary-400 hover:bg-primary-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary-700 text-xs font-bold">{u.avatar}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800 leading-tight">{u.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{u.username} / {u.password}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${ROLE_COLORS[u.role]?.badge || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                    {u.role}
                  </span>
                </button>
              ))}
            </div>
          )}

          {sessionExpired && !error && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex items-center gap-2">
              <span className="text-amber-500">⏱</span> Your session expired. Please sign in again.
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
              <span className="text-red-500">⚠</span> {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="label">Username</label>
              <input
                name="username"
                value={form.username}
                onChange={handle}
                className="input"
                placeholder="Enter your username"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={handle}
                  className="input pr-10"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="remember"
                  checked={form.remember}
                  onChange={handle}
                  className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-blue-300 text-xs mt-6">
          © {new Date().getFullYear()} Gingoog City CDRRMO. All rights reserved.
        </p>
      </div>
    </div>
  )
}