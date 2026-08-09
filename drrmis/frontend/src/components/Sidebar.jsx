import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, MapPin, Home, Users, Shield, AlertTriangle,
  Tent, Package, Truck, CloudRain, Map, Bell, UserCog,
  FileText, BarChart2, ClipboardList, Settings, ChevronDown,
  Building2, TreePine, LogOut, Archive
} from 'lucide-react'
import { useState } from 'react'
import { ROLE_ACCESS, ROLE_COLORS } from '../data/users'

const navGroups = [
  {
    label: 'Main',
    items: [
      { to: '/',    icon: LayoutDashboard, label: 'Risk Assessment Dashboard', exact: true },
      { to: '/map', icon: Map,             label: 'Hazard Map & Geofencing' },
    ],
  },
  {
    label: 'Household & Population',
    items: [
      { to: '/barangays',  icon: Building2, label: 'Barangays' },
      { to: '/puroks',     icon: TreePine,  label: 'Puroks' },
      { to: '/households', icon: Home,      label: 'Households' },
      { to: '/residents',  icon: Users,     label: 'Residents' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: '/users',    icon: UserCog,  label: 'User Management' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
]

function NavItem({ to, icon: Icon, label, exact }) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
          isActive
            ? 'bg-primary-700 text-white'
            : 'text-blue-100 hover:bg-primary-700 hover:text-white'
        }`
      }
    >
      <Icon size={18} />
      <span>{label}</span>
    </NavLink>
  )
}

function canAccess(role, path) {
  const access = ROLE_ACCESS[role]
  if (!access) return false
  if (access === '*') return true
  return access.includes(path)
}

export default function Sidebar({ onLogout, currentUser, mobileOpen, onClose }) {
  const [collapsed, setCollapsed] = useState({})
  const role = currentUser?.role || 'Viewer'

  const toggleGroup = (label) =>
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }))

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-primary-800 flex flex-col z-30
          transform transition-transform duration-300
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:flex
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-primary-700">
          <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
            <img src="/cdrrmo-logo.png" alt="CDRRMO" className="w-full h-full object-contain p-0.5" />
          </div>
          <div className="overflow-hidden">
            <p className="text-white font-bold text-sm leading-tight">DRRMIS</p>
            <p className="text-blue-200 text-xs truncate">Gingoog City CDRRMO</p>
          </div>
        </div>

        {/* Current user info */}
        <div className="px-4 py-3 border-b border-primary-700 flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full ${ROLE_COLORS[role]?.bg || 'bg-gray-500'} flex items-center justify-center flex-shrink-0`}>
            <span className="text-white text-xs font-bold">{currentUser?.avatar || 'U'}</span>
          </div>
          <div className="overflow-hidden">
            <p className="text-white text-sm font-medium truncate">{currentUser?.name || 'User'}</p>
            <p className="text-blue-300 text-xs truncate">{role}</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto scrollbar-hide px-3 py-4 space-y-5">
          {navGroups.map((group) => {
            // Filter items by role access
            const visibleItems = group.items.filter(item => canAccess(role, item.to))
            if (visibleItems.length === 0) return null

            return (
              <div key={group.label}>
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="flex items-center justify-between w-full px-1 mb-1 text-xs font-semibold uppercase tracking-wider text-blue-300 hover:text-white transition-colors"
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform ${collapsed[group.label] ? '-rotate-90' : ''}`}
                  />
                </button>
                {!collapsed[group.label] && (
                  <div className="space-y-0.5">
                    {visibleItems.map((item) => (
                      <NavItem key={item.to} {...item} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-primary-700 space-y-1">
          <NavLink
            to="/change-password"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-blue-100 hover:bg-primary-700 hover:text-white transition-colors"
          >
            <UserCog size={18} />
            <span>Change Password</span>
          </NavLink>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-blue-100 hover:bg-red-600 hover:text-white transition-colors"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}