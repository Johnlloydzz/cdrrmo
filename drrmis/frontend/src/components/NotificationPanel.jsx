import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell, X, AlertTriangle, Tent, Package, ShieldAlert,
  Info, CheckCircle, Trash2
} from 'lucide-react'

// ── Mock notifications ─────────────────────────────────────────────────────
const TYPE_META = {
  alert:     { icon: ShieldAlert,   color: 'text-red-500',    bg: 'bg-red-50',    dot: 'bg-red-500' },
  incident:  { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-50', dot: 'bg-orange-500' },
  evacuation:{ icon: Tent,          color: 'text-blue-500',   bg: 'bg-blue-50',   dot: 'bg-blue-500' },
  relief:    { icon: Package,       color: 'text-green-500',  bg: 'bg-green-50',  dot: 'bg-green-500' },
  system:    { icon: Info,          color: 'text-gray-500',   bg: 'bg-gray-50',   dot: 'bg-gray-400' },
}

const INITIAL_NOTIFICATIONS = [
  {
    id: 1, type: 'alert', read: false,
    title: 'RED Alert — Flood Warning',
    body: 'Mandatory evacuation in effect for Kioskos, Barangay 1–3.',
    time: '5 min ago', link: '/alerts',
  },
  {
    id: 2, type: 'incident', read: false,
    title: 'New Incident: INC-006',
    body: 'Flood reported in Kalambogan, Purok 3. Assigned to Team Alpha.',
    time: '18 min ago', link: '/incidents',
  },
  {
    id: 3, type: 'evacuation', read: false,
    title: 'Evacuation Update',
    body: '48 families checked in at Central Gym. Available space: 452.',
    time: '35 min ago', link: '/evacuation-centers',
  },
  {
    id: 4, type: 'relief', read: true,
    title: 'Low Stock Warning',
    body: 'Baby Food stock is below threshold (40 boxes remaining).',
    time: '1 hr ago', link: '/relief',
  },
  {
    id: 5, type: 'incident', read: true,
    title: 'Incident Resolved: INC-002',
    body: 'Landslide in Magsaysay has been cleared. Road now passable.',
    time: '2 hrs ago', link: '/incidents',
  },
  {
    id: 6, type: 'system', read: true,
    title: 'New User Registered',
    body: 'Barangay Admin account created for Brgy. 12.',
    time: '5 hrs ago', link: '/users',
  },
]

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

  const markAllRead = () =>
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))

  const markRead = (id) =>
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))

  const dismiss = (id) =>
    setNotifications(prev => prev.filter(n => n.id !== id))

  const clearAll = () => setNotifications([])

  const handleClick = (n) => {
    markRead(n.id)
    onClose()
    navigate(n.link)
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
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-xs text-gray-400 mt-1">{n.time}</p>
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

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-2.5 border-t border-gray-100 text-center">
          <button
            onClick={() => { onClose(); navigate('/alerts') }}
            className="text-xs text-primary-600 hover:text-primary-800 font-medium"
          >
            View all alerts →
          </button>
        </div>
      )}
    </div>
  )
}

export { INITIAL_NOTIFICATIONS }