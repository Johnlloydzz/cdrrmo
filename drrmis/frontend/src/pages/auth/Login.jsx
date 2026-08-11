import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, Users, User, Lock, Waves, Mountain, CloudRain, AlertTriangle, MapPin } from 'lucide-react'
import { DEMO_USERS, ROLE_COLORS } from '../../data/users'
import { apiPost } from '../../utils/api'
import { setStoredToken } from '../../utils/storage'

const HAZARDS = [
  { icon: Waves, label: 'FLOOD', bg: 'bg-sky-500' },
  { icon: Mountain, label: 'LANDSLIDE', bg: 'bg-amber-700' },
  { icon: CloudRain, label: 'STORM', bg: 'bg-teal-600' },
  { icon: AlertTriangle, label: 'EMERGENCY', bg: 'bg-red-600' },
]

export default function Login({ onLogin }) {
  const [form, setForm] = useState({ username: '', password: '', remember: false })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showAccounts, setShowAccounts] = useState(false)
  const [sessionExpired] = useState(() => new URLSearchParams(window.location.search).get('expired') === '1')

  useEffect(() => {
    if (sessionExpired) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [sessionExpired])

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
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left — branding panel */}
      <div className="relative md:w-[46%] min-h-[280px] md:min-h-screen bg-gradient-to-b from-blue-950 via-blue-900 to-blue-800 overflow-hidden flex flex-col items-center justify-center px-8 py-12 text-center">
        {/* Ambient mountain/city silhouette */}
        <svg
          className="absolute bottom-0 left-0 w-full h-40 md:h-56 opacity-90"
          viewBox="0 0 800 220"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M0 220 L0 150 L90 90 L160 150 L230 60 L310 150 L400 100 L470 150 L560 70 L650 150 L720 110 L800 150 L800 220 Z" fill="#0c1f4a" opacity="0.6" />
          <path d="M0 220 L0 180 L120 140 L210 180 L300 130 L390 180 L480 140 L570 180 L660 150 L800 180 L800 220 Z" fill="#0a1836" opacity="0.85" />
        </svg>

        <div className="relative z-10 flex flex-col items-center">
          <img src="/cdrrmo-logo.png" alt="Gingoog City CDRRMO" className="w-24 h-24 md:w-28 md:h-28 object-contain drop-shadow-lg mb-6" />

          <h1 className="text-white text-xl md:text-2xl font-bold leading-snug max-w-sm">
            PDRA — Pre-Disaster Risk Assessment for Gingoog City
          </h1>

          <p className="text-blue-200 text-sm mt-6 max-w-xs leading-relaxed">
            <span className="font-semibold text-white">Assessing Risk. Protecting Lives.</span><br />
            A centralized platform for identifying at-risk households and assessing disaster risk before it happens in Gingoog City.
          </p>

          <div className="flex items-center gap-4 mt-8">
            {HAZARDS.map(({ icon: Icon, label, bg }) => (
              <div key={label} className="flex flex-col items-center gap-1.5">
                <div className={`w-11 h-11 rounded-full ${bg} flex items-center justify-center shadow-md`}>
                  <Icon size={18} className="text-white" />
                </div>
                <span className="text-[10px] font-semibold tracking-wide text-blue-100">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-1 text-blue-300 text-xs mt-10">
          <MapPin size={12} />
          Gingoog City, Misamis Oriental, Philippines
        </div>
      </div>

      {/* Right — sign-in card */}
      <div className="flex-1 bg-gray-50 flex items-center justify-center p-4 py-10">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            {!showAccounts ? (
              <div className="flex flex-col items-center text-center">
                <img src="/cdrrmo-logo.png" alt="CDRRMO" className="w-16 h-16 object-contain mb-3" />
                <div className="flex items-center justify-between w-full">
                  <div className="w-6" />
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Sign In</h2>
                    <p className="text-sm text-gray-400 mt-1">Continue to your account.</p>
                  </div>
                  <div className="w-6" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowAccounts(true)}
                  className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-800 border border-primary-200 rounded-lg px-2.5 py-1.5 hover:bg-primary-50 transition-colors mt-4"
                >
                  <Users size={13} />
                  Demo Accounts
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Sign In</h2>
                <button
                  type="button"
                  onClick={() => setShowAccounts(false)}
                  className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-800 border border-primary-200 rounded-lg px-2.5 py-1.5 hover:bg-primary-50 transition-colors flex-shrink-0"
                >
                  <Users size={13} />
                  Demo Accounts
                </button>
              </div>
            )}

            {/* Demo accounts panel */}
            {showAccounts && (
              <div className="mt-3 mb-2 p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
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
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex items-center gap-2">
                <span className="text-amber-500">⏱</span> Your session expired. Please sign in again.
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                <span className="text-red-500">⚠</span> {error}
              </div>
            )}

            {!showAccounts && (
              <>
                <form onSubmit={submit} className="space-y-5 mt-6">
                  <div>
                    <label className="label">Username</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        name="username"
                        value={form.username}
                        onChange={handle}
                        className="input pl-9"
                        placeholder="Enter your username"
                        autoComplete="username"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        name="password"
                        type={showPw ? 'text' : 'password'}
                        value={form.password}
                        onChange={handle}
                        className="input pl-9 pr-10"
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
                    {loading ? 'Signing in…' : 'Sign in'}
                  </button>
                </form>

                <div className="border-t border-gray-100 mt-6 pt-4 text-center">
                  <p className="text-sm text-gray-500">
                    Don't have an account? <span className="text-primary-600 font-medium">Contact CDRRMO office</span>
                  </p>
                </div>
              </>
            )}
          </div>

          <p className="text-center text-gray-400 text-xs mt-6">
            © {new Date().getFullYear()} Gingoog City CDRRMO. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}