import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, User, Lock, Waves, Mountain, CloudRain, AlertTriangle, MapPin, Clock } from 'lucide-react'
import { apiPost } from '../../utils/api'
import CookieConsent, { preferencesAllowed } from '../../components/CookieConsent'
import { setStoredToken } from '../../utils/storage'

const REMEMBERED_USERNAME_KEY = 'pdra_remembered_username' // last username (always kept)
const REMEMBER_ME_KEY = 'pdra_remember_me'                   // '1' if Remember me was checked

const HAZARDS = [
  { icon: Waves, label: 'Flood', bg: 'bg-sky-500' },
  { icon: Mountain, label: 'Landslide', bg: 'bg-amber-700' },
  { icon: CloudRain, label: 'Storm', bg: 'bg-teal-600' },
  { icon: AlertTriangle, label: 'Emergency', bg: 'bg-red-600' },
]

// Sharp, small logo (WebP, ~35 KB) with the original PNG as a fallback.
// Fixed width/height so nothing shifts while it loads.
function Logo({ className }) {
  return (
    <picture>
      <source srcSet="/cdrrmo-logo-256.webp" type="image/webp" />
      <img src="/cdrrmo-logo.png" alt="Gingoog City CDRRMO" width="112" height="112" decoding="async" className={className} />
    </picture>
  )
}

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
  const [capsOn, setCapsOn] = useState(false)
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
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      {/* Left — branding panel (compact on phones so the form is in view) */}
      <div className="relative md:w-[46%] md:min-h-screen bg-gradient-to-b from-blue-950 via-blue-900 to-blue-800 overflow-hidden flex flex-col items-center justify-center px-8 pt-10 pb-14 md:py-12 text-center">
        <svg
          className="absolute bottom-0 left-0 w-full h-24 md:h-56 opacity-90 pointer-events-none"
          viewBox="0 0 800 220"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M0 220 L0 150 L90 90 L160 150 L230 60 L310 150 L400 100 L470 150 L560 70 L650 150 L720 110 L800 150 L800 220 Z" fill="#0c1f4a" opacity="0.6" />
          <path d="M0 220 L0 180 L120 140 L210 180 L300 130 L390 180 L480 140 L570 180 L660 150 L800 180 L800 220 Z" fill="#0a1836" opacity="0.85" />
        </svg>

        <div className="relative z-10 flex flex-col items-center animate-login-rise">
          <Logo className="w-16 h-16 md:w-28 md:h-28 object-contain drop-shadow-lg mb-4 md:mb-6" />

          <h1 className="text-white text-lg md:text-2xl font-bold leading-snug max-w-sm [text-wrap:balance]">
            PDRA — Pre-Disaster Risk Assessment for Gingoog City
          </h1>

          <p className="hidden sm:block text-blue-200 text-sm mt-5 max-w-xs leading-relaxed">
            <span className="font-semibold text-white">Assessing Risk. Protecting Lives.</span><br />
            A centralized platform for identifying at-risk households and assessing disaster risk before it happens in Gingoog City.
          </p>

          <ul className="hidden sm:flex items-start gap-5 mt-8" aria-label="Hazards covered">
            {HAZARDS.map(({ icon: Icon, label, bg }) => (
              <li key={label} className="flex flex-col items-center gap-1.5 w-16">
                <span className={`w-11 h-11 rounded-full ${bg} flex items-center justify-center shadow-md ring-4 ring-white/5`}>
                  <Icon size={18} className="text-white" aria-hidden="true" />
                </span>
                <span className="text-[11px] font-medium text-blue-100">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 hidden md:flex items-center gap-1 text-blue-300 text-xs mt-10">
          <MapPin size={12} aria-hidden="true" />
          Gingoog City, Misamis Oriental, Philippines
        </div>
      </div>

      {/* Right — sign-in card */}
      <main className="flex-1 flex items-start md:items-center justify-center px-4 -mt-8 md:mt-0 pb-28 md:py-10">
        <div className="w-full max-w-sm animate-login-rise-late">
          <div className="bg-white rounded-2xl shadow-xl shadow-blue-950/5 border border-gray-100 p-7 sm:p-8">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900">Sign in</h2>
              <p className="text-sm text-gray-500 mt-1">Use the account given to you by CDRRMO.</p>
            </div>

            {sessionExpired && !error && (
              <div role="status" className="mt-5 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-center gap-2 animate-slide-down-in">
                <Clock size={15} className="text-amber-500 flex-shrink-0" aria-hidden="true" /> Your session expired. Please sign in again.
              </div>
            )}

            <form onSubmit={submit} className="space-y-5 mt-6" noValidate>
              <div>
                <label htmlFor="login-username" className="label">Username</label>
                <div className="relative group">
                  <User size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-primary-600" />
                  <input
                    id="login-username"
                    name="username"
                    value={form.username}
                    onChange={handle}
                    className="input pl-9 py-2.5"
                    placeholder="Enter your username"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="label">Password</label>
                <div className="relative group">
                  <Lock size={16} aria-hidden="true" className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${error ? 'text-red-400' : 'text-gray-400 group-focus-within:text-primary-600'}`} />
                  <input
                    id="login-password"
                    name="password"
                    type={showPw ? 'text' : 'password'}
                    value={form.password}
                    onChange={handle}
                    onKeyUp={e => setCapsOn(e.getModifierState?.('CapsLock') || false)}
                    onBlur={() => setCapsOn(false)}
                    className={`input pl-9 pr-10 py-2.5 ${error ? 'border-red-400 focus:ring-red-200' : ''}`}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    autoFocus={!!form.username && rememberedBefore}
                    readOnly={!pwEditable}
                    onFocus={() => setPwEditable(true)}
                    aria-invalid={!!error}
                    aria-describedby={error ? 'login-error' : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {capsOn && (
                  <p className="text-xs text-amber-700 mt-1.5 animate-slide-down-in">Caps Lock is on.</p>
                )}
                {error && (
                  <p id="login-error" role="alert" className="text-sm text-red-600 mt-2 flex items-center gap-1.5 animate-slide-down-in">
                    <AlertTriangle size={14} className="flex-shrink-0" aria-hidden="true" /> {error}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <label
                  className={`flex items-center gap-2 select-none ${prefsOk ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                  title={prefsOk ? '' : 'Turned off because cookies were declined.'}
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
                <Link to="/request-password-reset" className="text-sm text-primary-600 hover:text-primary-700 font-medium rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 shadow-sm shadow-primary-600/20 transition-all active:scale-[0.99] disabled:opacity-80 disabled:cursor-wait"
              >
                {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />}
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div className="border-t border-gray-100 mt-6 pt-4 text-center">
              <p className="text-sm text-gray-500">
                Don't have an account?{' '}
                <Link to="/request-account" className="text-primary-600 font-medium hover:text-primary-800 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                  Request one
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-gray-400 text-xs mt-6">
            © {new Date().getFullYear()} Gingoog City CDRRMO. All rights reserved.
          </p>
        </div>
      </main>

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