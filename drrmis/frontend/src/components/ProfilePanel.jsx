import { useEffect, useRef, useState } from 'react'
import { X, MapPin, ShieldCheck, LogIn, Clock } from 'lucide-react'
import { apiGet } from '../utils/api'
import { getStoredToken } from '../utils/storage'

const ACCESS = {
  'CDRRMO Personnel': 'Citywide access',
  'Barangay Official': 'Own barangay only',
}

const fmt = (d) => d.toLocaleString('en-PH', {
  timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric',
  hour: 'numeric', minute: '2-digit',
})

// "YYYY-MM-DD HH:MM:SS" stored in PH time
function formatPhTime(value) {
  if (!value) return null
  const d = new Date(String(value).replace(' ', 'T') + '+08:00')
  return isNaN(d) ? null : fmt(d)
}

// Expiry read from the sign-in token itself
function sessionExpiry() {
  try {
    const payload = JSON.parse(atob(getStoredToken().split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.exp ? fmt(new Date(payload.exp * 1000)) : null
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

  // Fresh account details (email, last sign-in) each time the panel opens
  useEffect(() => {
    if (!open) return
    let cancelled = false
    apiGet('/auth/me').then(d => { if (!cancelled) setMe(d) }).catch(() => {})
    return () => { cancelled = true }
  }, [open])

  if (!open) return null

  const role = currentUser?.role || ''
  const name = me?.name || currentUser?.name || ''
  const email = me?.email || currentUser?.email
  const area = currentUser?.barangay === 'All' ? 'All barangays' : `Brgy. ${me?.barangay || currentUser?.barangay || '—'}`
  const signedIn = formatPhTime(me?.last_login)
  const expires = sessionExpiry()

  const rows = [
    { icon: MapPin, label: 'Assigned area', value: area },
    { icon: ShieldCheck, label: 'Access level', value: ACCESS[role] || '—' },
    { icon: LogIn, label: 'Signed in', value: signedIn || '—' },
  ]

  return (
    <div
      ref={panelRef}
      className="absolute top-full right-0 mt-2 w-80 max-w-[calc(100vw-1rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden"
    >
      {/* Header — avatar, name, email, role */}
      <div className="relative bg-gradient-to-br from-primary-800 to-primary-600 px-5 pt-6 pb-5 text-center">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-colors"
        >
          <X size={16} />
        </button>
        <div className="mx-auto w-16 h-16 rounded-full bg-white/15 ring-4 ring-white/20 flex items-center justify-center">
          <span className="text-white text-xl font-bold tracking-wide">{currentUser?.avatar || initials(name)}</span>
        </div>
        <h3 className="mt-3 text-white font-semibold text-base leading-tight">{name}</h3>
        {email && <p className="text-white/75 text-xs mt-0.5 truncate">{email}</p>}
        <div className="mt-3 flex items-center justify-center gap-2">
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white text-primary-700">
            {role}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-500/20 text-green-100">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Active
          </span>
        </div>
      </div>

      {/* Account details */}
      <div className="px-2 py-2">
        {rows.map(r => (
          <div key={r.label} className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
              <r.icon size={15} className="text-primary-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-gray-400 leading-tight">{r.label}</p>
              <p className="text-sm font-medium text-gray-800 truncate">{r.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer — username and session expiry */}
      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3 text-xs text-gray-500">
        <span className="font-mono truncate">@{me?.username || currentUser?.username}</span>
        <span className="inline-flex items-center gap-1 flex-shrink-0" title="Session ends">
          <Clock size={12} /> {expires ? `Ends ${expires}` : '—'}
        </span>
      </div>
    </div>
  )
}