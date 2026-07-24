import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, Mail, Building2, Shield, Key, LogOut, X, ChevronRight
} from 'lucide-react'
import { ROLE_COLORS } from '../data/users'

export default function ProfilePanel({ currentUser, open, onClose, onLogout }) {
  const panelRef = useRef(null)
  const navigate = useNavigate()

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  if (!open) return null

  const role = currentUser?.role || ''
  const roleMeta = ROLE_COLORS[role] || { bg: 'bg-gray-500', badge: 'bg-gray-100 text-gray-700 border-gray-200' }

  const go = (path) => { onClose(); navigate(path) }

  const menuItems = [
    {
      icon: Key,
      label: 'Change Password',
      sub: 'Update your account password',
      action: () => go('/change-password'),
    },
    ...(role === 'Super Administrator' ? [
      {
        icon: User,
        label: 'User Management',
        sub: 'Manage system users',
        action: () => go('/users'),
      },
      {
        icon: Shield,
        label: 'System Settings',
        sub: 'Configure system preferences',
        action: () => go('/settings'),
      },
    ] : []),
  ]

  return (
    <div
      ref={panelRef}
      className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden"
    >
      {/* Header / avatar card */}
      <div className="bg-gradient-to-br from-primary-800 to-primary-600 px-5 py-5">
        <div className="flex items-start justify-between">
          {/* Avatar */}
          <div className={`w-14 h-14 rounded-2xl ${roleMeta.bg} flex items-center justify-center shadow-lg`}>
            <span className="text-white text-xl font-bold">{currentUser?.avatar || 'U'}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 text-white/70 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-3">
          <h3 className="text-white font-bold text-base leading-tight">{currentUser?.name}</h3>
          <span className={`inline-block mt-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${roleMeta.badge}`}>
            {role}
          </span>
        </div>
      </div>

      {/* Info rows */}
      <div className="px-5 py-3 border-b border-gray-100 space-y-2.5">
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <Mail size={15} className="text-gray-400 flex-shrink-0" />
          <span className="truncate">{currentUser?.email || '—'}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <Building2 size={15} className="text-gray-400 flex-shrink-0" />
          <span>
            {currentUser?.barangay === 'All'
              ? 'All Barangays'
              : currentUser?.barangay || '—'}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <User size={15} className="text-gray-400 flex-shrink-0" />
          <span className="font-mono text-xs text-gray-500">@{currentUser?.username}</span>
        </div>
      </div>

      {/* Menu items */}
      <div className="px-3 py-2 border-b border-gray-100">
        {menuItems.map((item) => (
          <button
            key={item.label}
            onClick={item.action}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-primary-100 flex items-center justify-center flex-shrink-0 transition-colors">
              <item.icon size={15} className="text-gray-500 group-hover:text-primary-600 transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-400">{item.sub}</p>
            </div>
            <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-400 flex-shrink-0" />
          </button>
        ))}
      </div>

      {/* Logout */}
      <div className="px-3 py-2">
        <button
          onClick={() => { onClose(); onLogout() }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 transition-colors text-left group"
        >
          <div className="w-8 h-8 rounded-lg bg-red-50 group-hover:bg-red-100 flex items-center justify-center flex-shrink-0 transition-colors">
            <LogOut size={15} className="text-red-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-red-600">Sign Out</p>
            <p className="text-xs text-gray-400">End your current session</p>
          </div>
        </button>
      </div>
    </div>
  )
}
