import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { ROLE_COLORS } from '../data/users'
import { apiGet } from '../utils/api'
import { getStoredToken } from '../utils/storage'

const ACCESS_SCOPE = {
  'CDRRMO Personnel': 'Citywide',
  'Barangay Official': 'Own barangay',
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
    const token = getStoredToken()
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.exp ? fmt(new Date(payload.exp * 1000)) : null
  } catch { return null }
}

const initials = (name = '') =>
  name.trim().split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'U'

function Row({ label, value, mono }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-xs text-gray-500 flex-shrink-0">{label}</dt>
      <dd className={`text-sm text-gray-800 text-right truncate ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  )
}

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
  const roleMeta = ROLE_COLORS[role] || { bg: 'bg-gray-500', badge: 'bg-gray-100 text-gray-700 border-gray-200' }
  const name = me?.name || currentUser?.name || ''
  const username = me?.username || currentUser?.username
  const email = me?.email || currentUser?.email || '—'
  const area = currentUser?.barangay === 'All' ? 'All barangays' : `Brgy. ${me?.barangay || currentUser?.barangay || '—'}`

  return (
    <div
      ref={panelRef}
      className="absolute top-full right-0 mt-2 w-80 max-w-[calc(100vw-1rem)] bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-800 to-primary-600 px-4 py-4 flex items-center gap-3">
        <div className={`w-11 h-11 rounded-full ${roleMeta.bg} ring-2 ring-white/30 flex items-center justify-center flex-shrink-0`}>
          <span className="text-white text-sm font-semibold">{currentUser?.avatar || initials(name)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-white font-semibold text-sm leading-tight truncate">{name}</p>
          <p className="text-white/70 text-xs leading-tight mt-0.5 truncate">{role}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="p-1 rounded-md text-white/70 hover:text-white hover:bg-white/15 transition-colors self-start"
        >
          <X size={15} />
        </button>
      </div>

      {/* Account */}
      <div className="px-4 pt-3 pb-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Account</p>
        <dl className="divide-y divide-gray-100">
          <Row label="Username" value={`@${username}`} mono />
          <Row label="Email" value={email} />
          <Row label="Assigned area" value={area} />
          <Row label="Access" value={ACCESS_SCOPE[role] || '—'} />
          <div className="flex items-baseline justify-between gap-4 py-2">
            <dt className="text-xs text-gray-500">Status</dt>
            <dd className="inline-flex items-center gap-1.5 text-sm text-gray-800">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Active
            </dd>
          </div>
        </dl>
      </div>

      {/* Session */}
      <div className="px-4 pt-2 pb-2 bg-gray-50 border-t border-gray-100">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 pt-1">Session</p>
        <dl className="divide-y divide-gray-100">
          <Row label="Signed in" value={formatPhTime(me?.last_login) || '—'} />
          <Row label="Expires" value={sessionExpiry() || '—'} />
        </dl>
      </div>
    </div>
  )
}