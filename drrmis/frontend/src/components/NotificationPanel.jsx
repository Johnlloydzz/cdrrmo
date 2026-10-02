import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell, X, AlertTriangle, Tent, Package, ShieldAlert,
  Info, CheckCircle, Trash2
} from 'lucide-react'

import { apiGet, apiPut, apiDelete } from '../utils/api'

// ── Notification types → icon / colors ─────────────────────────────────────
const TYPE_META = {
  alert:     { icon: ShieldAlert,   color: 'text-red-500',    bg: 'bg-red-50',    dot: 'bg-red-500' },
  incident:  { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-50', dot: 'bg-orange-500' },
  evacuation:{ icon: Tent,          color: 'text-blue-500',   bg: 'bg-blue-50',   dot: 'bg-blue-500' },
  relief:    { icon: Package,       color: 'text-green-500',  bg: 'bg-green-50',  dot: 'bg-green-500' },
  system:    { icon: Info,          color: 'text-gray-500',   bg: 'bg-gray-50',   dot: 'bg-gray-400' },
}

// created_at is stored in Philippine time ("YYYY-MM-DD HH:MM:SS", +08:00).
function timeAgo(createdAt) {
  if (!createdAt) return ''
  const t = new Date(createdAt.replace(' ', 'T') + '+08:00').getTime()
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000))
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} hr${h > 1 ? 's' : ''} ago`
  const d = Math.floor(h / 24)
  return `${d} day${d > 1 ? 's' : ''} ago`
}

const POLL_MS = 30000

// Loads the signed-in user's OWN notifications from the server and checks
// for new ones every 30 seconds (and when the tab regains focus). CDRRMO
// Personnel and Barangay Officials each get only what's meant for them —
// the server decides who receives what.
export function useNotifications(enabled = true) {
  const [notifications, setNotifications] = useState([])

  const load = useCallback(async () => {
    try { setNotifications(await apiGet('/notifications')) } catch { /* keep current list */ }
  }, [])

  useEffect(() => {
    if (!enabled) return
    load()
    const timer = setInterval(() => { if (!document.hidden) load() }, POLL_MS)
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(timer); window.removeEventListener('focus', onFocus) }
  }, [enabled, load])

  return { notifications, setNotifications, reload: load }
}

export default function NotificationPanel({
  notifications, setNotifications, open, onClose
}) {
  const panelRef = useRef(null)
  const navigate = useNavigate()

  // Close when clicking outside
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  const unread = notifications.filter(n => !n.read).length

  // Update the list right away, then save to the server.
  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    apiPut('/notifications/read-all', {}).catch(() => {})
  }

  const markRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    apiPut(`/notifications/${id}/read`, {}).catch(() => {})
  }

  const dismiss = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
    apiDelete(`/notifications/${id}`).catch(() => {})
  }

  const clearAll = () => {
    setNotifications([])
    apiDelete('/notifications').catch(() => {})
  }

  const handleClick = (n) => {
    if (!n.read) markRead(n.id)
    onClose()
    if (n.link) navigate(n.link)
  }

  if (!open) return null

  return (
    <div
      ref={panelRef}
      className="fixed sm:absolute top-16 sm:top-full inset-x-3 sm:inset-x-auto sm:right-0 sm:mt-2 sm:w-96 sm:max-w-[calc(100vw-1rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 flex flex-col"
      style={{ maxHeight: 'min(520px, calc(100vh - 90px))' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Bell size={17} className="text-gray-700" />
          <span className="font-semibold text-gray-800 text-sm">Notifications</span>
          {unread > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {unread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-primary-600 hover:text-primary-800 font-medium flex items-center gap-1"
            >
              <CheckCircle size={13} /> Mark all read
            </button>
          )}
          <button
            onClick={clearAll}
            className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 ml-1"
            title="Clear all"
          >
            <Trash2 size={13} />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 ml-1"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-gray-400">
            <Bell size={32} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">No notifications</p>
            <p className="text-xs mt-1">You're all caught up!</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {notifications.map(n => {
              const meta = TYPE_META[n.type] || TYPE_META.system
              const Icon = meta.icon
              return (
                <li
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 ${!n.read ? 'bg-blue-50/40' : ''}`}
                  onClick={() => handleClick(n)}
                >
                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-full ${meta.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <Icon size={16} className={meta.color} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-snug ${!n.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {n.title}
                      </p>
                      {/* Unread dot */}
                      {!n.read && (
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${meta.dot}`} />
                      )}
                    </div>
                    {n.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-3">{n.body}</p>}
                    <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                  </div>

                  {/* Dismiss */}
                  <button
                    onClick={(e) => { e.stopPropagation(); dismiss(n.id) }}
                    className="p-1 rounded hover:bg-gray-200 text-gray-300 hover:text-gray-500 flex-shrink-0 mt-0.5"
                    title="Dismiss"
                  >
                    <X size={13} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

    </div>
  )
}