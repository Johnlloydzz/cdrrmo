import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, User, Lock, Waves, Mountain, CloudRain, AlertTriangle, MapPin } from 'lucide-react'
import { apiPost } from '../../utils/api'
import CookieConsent, { preferencesAllowed } from '../../components/CookieConsent'
import { setStoredToken } from '../../utils/storage'

const REMEMBERED_USERNAME_KEY = 'pdra_remembered_username' // last username (always kept)
const REMEMBER_ME_KEY = 'pdra_remember_me'                   // '1' if Remember me was checked

const HAZARDS = [
  { icon: Waves, label: 'FLOOD', bg: 'bg-sky-500' },
  { icon: Mountain, label: 'LANDSLIDE', bg: 'bg-amber-700' },
  { icon: CloudRain, label: 'STORM', bg: 'bg-teal-600' },
  { icon: AlertTriangle, label: 'EMERGENCY', bg: 'bg-red-600' },
]

export default function Login({ onLogin }) {
  // After logging out:
  //  - the last USERNAME is always filled in;
  //  - the PASSWORD is filled in (by the browser's own password manager) only
  //    if Remember me was checked last time — otherwise it stays blank.
  // The app itself never stores the password.
  // Preference storage (username, Remember me) only with cookie consent.
  const [prefsOk, setPrefsOk] = useState(preferencesAllowed)
  const [rememberedBefore] = useState(() => {
    if (!preferencesAllowed()) return false
    try { return localStorage.getItem(REMEMBER_ME_KEY) === '1' } catch { return false }
  })
  const [form, setForm] = useState(() => {
    let saved = ''
    if (preferencesAllowed()) {
      try { saved = localStorage.getItem(REMEMBERED_USERNAME_KEY) || '' } catch { /* storage blocked */ }
    }
    return { username: saved, password: '', remember: rememberedBefore }
  })
  // Without Remember me, the password box starts read-only so the browser
  // can't auto-fill it on page load; it becomes editable once clicked/typed in
  // (the browser may still offer its suggestions then — the user's choice).
  const [pwEditable, setPwEditable] = useState(rememberedBefore)
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionExpired] = useState(() => new URLSearchParams(window.location.search).get('expired') === '1')

  // Filling in a saved password is left to the browser's own autofill
  // (it fills the form / shows its account dropdown on its own). Asking it
  // via navigator.credentials.get() would show Chrome's black
  // "Signing in as …" popup, so that isn't used.

  useEffect(() => {
    if (sessionExpired) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [sessionExpired])

  const handle = (e) => {
    setForm({ ...form, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
    if (error) setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    // Read straight from the inputs too: a value the browser auto-filled may
    // not have reached React state yet.
    const username = (e.target.username?.value || form.username).trim()
    const password = e.target.password?.value || form.password
    if (!username || !password) {
      setError('Please enter your username and password.')
      return
    }
    setLoading(true)
    try {
      const data = await apiPost('/auth/login', {
        username,
        password,
        remember: prefsOk && form.remember,
      })
      try {
        if (prefsOk) {
          localStorage.setItem(REMEMBERED_USERNAME_KEY, username)
          if (form.remember) localStorage.setItem(REMEMBER_ME_KEY, '1')
          else localStorage.removeItem(REMEMBER_ME_KEY)
        } else {
          localStorage.removeItem(REMEMBERED_USERNAME_KEY)
          localStorage.removeItem(REMEMBER_ME_KEY)
        }
      } catch { /* storage blocked */ }
      // Remember me → ask the browser to save this login in ITS password
      // manager (Chrome shows "Save password?"). The app itself never stores
      // the password. Not awaited, so signing in isn't delayed.
      if (prefsOk && form.remember && window.PasswordCredential && navigator.credentials?.store) {
        try {
          navigator.credentials.store(new window.PasswordCredential({
            id: username,
            password,
            name: data.user?.name || username,
          })).catch(() => {})
        } catch { /* not supported */ }
      }
      setStoredToken(data.token, prefsOk && form.remember)
      onLogin(data.user, form.remember)
    } catch (err) {
      // The backend intentionally returns a generic "Invalid credentials."
      // for both an unknown username and a wrong password, so a bad actor
      // can't use the error to find out which usernames exist. On screen,
      // though, showing it as a password problem (like Facebook does) reads
      // more naturally for someone who just mistyped their own password.
      setError(err.message === 'Invalid credentials.' ? 'The password you entered is incorrect.' : (err.message || 'Invalid username or password.'))
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
            <div className="flex flex-col items-center text-center">
              <img src="/cdrrmo-logo.png" alt="CDRRMO" className="w-16 h-16 object-contain mb-3" />
              <h2 className="text-xl font-bold text-gray-900">Sign In</h2>
              <p className="text-sm text-gray-400 mt-1">Continue to your account.</p>
            </div>

            {sessionExpired && !error && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex items-center gap-2">
                <span className="text-amber-500">⏱</span> Your session expired. Please sign in again.
              </div>
            )}

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
                      <Lock size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${error ? 'text-red-400' : 'text-gray-400'}`} />
                      <input
                        name="password"
                        type={showPw ? 'text' : 'password'}
                        value={form.password}
                        onChange={handle}
                        className={`input pl-9 pr-10 ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : ''}`}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        autoFocus={!!form.username && rememberedBefore}
                        readOnly={!pwEditable}
                        onFocus={() => setPwEditable(true)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(!showPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {error && (
                      <p className="text-sm text-red-600 mt-2 flex items-center gap-1.5">
                        <span className="text-red-500">⚠</span> {error}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <label
                      className={`flex items-center gap-2 ${prefsOk ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                      title={prefsOk ? '' : 'Turned off — you chose "Essential only" cookies.'}
                    >
                      <input
                        type="checkbox"
                        name="remember"
                        checked={prefsOk && form.remember}
                        onChange={handle}
                        disabled={!prefsOk}
                        className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-600">Remember me</span>
                    </label>
                    <Link to="/request-password-reset" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
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
                    Don't have an account?{' '}
                    <Link to="/request-account" className="text-primary-600 font-medium hover:text-primary-800">
                      Request one
                    </Link>
                  </p>
                </div>
              </>
          </div>

          <p className="text-center text-gray-400 text-xs mt-6">
            © {new Date().getFullYear()} Gingoog City CDRRMO. All rights reserved.
          </p>
        </div>
      </div>

      <CookieConsent onChange={(value) => {
        const ok = value !== 'essential'
        setPrefsOk(ok)
        if (!ok) {
          // Essential only: forget the saved username / Remember me choice.
          try {
            localStorage.removeItem(REMEMBERED_USERNAME_KEY)
            localStorage.removeItem(REMEMBER_ME_KEY)
          } catch { /* storage blocked */ }
          setForm(f => ({ ...f, remember: false }))
        }
      }} />
    </div>
  )
}