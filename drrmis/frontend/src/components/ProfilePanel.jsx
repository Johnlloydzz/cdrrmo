import { useEffect, useRef, useState } from 'react'
import { User, Mail, Building2, X, LogIn, Clock, ShieldCheck } from 'lucide-react'
import { ROLE_COLORS } from '../data/users'
import { apiGet } from '../utils/api'
import { getStoredToken } from '../utils/storage'

// What each role can do — shown so the user knows the scope of their account.
const ROLE_ACCESS = {
  'CDRRMO Personnel': 'Citywide access: view all barangays, classify puroks, set flood levels and manage user accounts.',
  'Barangay Official': 'Own barangay only: manage your puroks, households and residents.',
}

// "YYYY-MM-DD HH:MM:SS" (stored in PH time) → "Oct 6, 2026, 6:14 PM"
function formatPhTime(value) {
  if (!value) return null
  const d = new Date(String(value).replace(' ', 'T') + '+08:00')
  if (isNaN(d)) return null
  return d.toLocaleString('en-PH', {
    timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

// When the sign-in token expires (read from the token itself).
function sessionExpiry() {
  try {
    const token = getStoredToken()
    if (!token) return null
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (!payload.exp) return null
    return new Date(payload.exp * 1000).toLocaleString('en-PH', {
      timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    })
  } catch { return null }
}

const initials = (name = '') =>
  name.trim().split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'U'

export default function ProfilePanel({ currentUser, open, onClose }) {
  const panelRef = useRef(null)
  const [me, setMe] = useState(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  // Fresh account details (email, last sign-in) each time the panel opens.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    apiGet('/auth/me').then(d => { if (!cancelled) setMe(d) }).catch(() => {})
    return () => { cancelled = true }
  }, [open])

  if (!open) return null

  const role = currentUser?.role || ''
  const roleMeta = ROLE_COLORS[role] || { bg: 'bg-gray-500', badge: 'bg-gray-100 text-gray-700 border-gray-200' }
  const name = me?.name || currentUser?.name || ''
  const email = me?.email || currentUser?.email
  const barangay = currentUser?.barangay === 'All' ? 'All Barangays' : (me?.barangay || currentUser?.barangay || '—')
  const signedIn = formatPhTime(me?.last_login)
  const expires = sessionExpiry()

  const details = [
    { icon: LogIn, label: 'Signed in', value: signedIn || '—' },
    { icon: Clock, label: 'Session ends', value: expires || '—' },
  ]

  return (
    <div
      ref={panelRef}
      className="absolute top-full right-0 mt-2 w-80 max-w-[calc(100vw-1rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden"
    >
      {/* Header / avatar card */}
      <div className="bg-gradient-to-br from-primary-800 to-primary-600 px-5 py-5">
        <div className="flex items-start justify-between">
          <div className={`w-14 h-14 rounded-2xl ${roleMeta.bg} flex items-center justify-center shadow-lg`}>
            <span className="text-white text-xl font-bold">{currentUser?.avatar || initials(name)}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 text-white/70 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-3">
          <h3 className="text-white font-bold text-base leading-tight">{name}</h3>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border ${roleMeta.badge}`}>
              {role}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-white/90">
              <span className="w-2 h-2 rounded-full bg-green-400" /> Active
            </span>
          </div>
        </div>
      </div>

      {/* Info rows */}
      <div className="px-5 py-3 border-b border-gray-100 space-y-2.5">
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <Mail size={15} className="text-gray-400 flex-shrink-0" />
          <span className="truncate">{email || '—'}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <Building2 size={15} className="text-gray-400 flex-shrink-0" />
          <span>{barangay}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <User size={15} className="text-gray-400 flex-shrink-0" />
          <span className="font-mono text-xs text-gray-500">@{me?.username || currentUser?.username}</span>
        </div>
      </div>

      {/* Session details */}
      <div className="px-5 py-3 border-b border-gray-100 space-y-2.5">
        {details.map(d => (
          <div key={d.label} className="flex items-center gap-3 text-sm">
            <d.icon size={15} className="text-gray-400 flex-shrink-0" />
            <span className="text-gray-500 w-24 flex-shrink-0">{d.label}</span>
            <span className="text-gray-700 font-medium truncate">{d.value}</span>
          </div>
        ))}
      </div>

      {/* Access level */}
      {ROLE_ACCESS[role] && (
        <div className="px-5 py-3 flex gap-3">
          <ShieldCheck size={15} className="text-primary-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-gray-700">Your access</p>
            <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{ROLE_ACCESS[role]}</p>
          </div>
        </div>
      )}
    </div>
  )
}