import { Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import NotificationPanel, { INITIAL_NOTIFICATIONS } from '../components/NotificationPanel'
import ProfilePanel from '../components/ProfilePanel'
import { Menu, Bell, ChevronDown } from 'lucide-react'

const pageTitles = {
  '/': 'Dashboard',
  '/map': 'GIS Map',
  '/alerts': 'Real-Time Alerts',
  '/weather': 'Weather Monitoring',
  '/barangays': 'Barangay Management',
  '/puroks': 'Purok Management',
  '/households': 'Household Management',
  '/residents': 'Resident Management',
  '/hazards': 'Hazard Management',
  '/incidents': 'Incident Management',
  '/evacuation-centers': 'Evacuation Centers',
  '/evacuation': 'Evacuation Records',
  '/relief': 'Relief Management',
  '/resources': 'Resource Management',
  '/users': 'User Management',
  '/reports': 'Reports',
  '/analytics': 'Analytics',
  '/audit-logs': 'Audit Logs',
  '/settings': 'System Settings',
  '/change-password': 'Change Password',
}

export default function MainLayout({ onLogout, currentUser }) {
  const [mobileOpen, setMobileOpen]       = useState(false)
  const [notifOpen, setNotifOpen]         = useState(false)
  const [profileOpen, setProfileOpen]     = useState(false)
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS)

  const location = useLocation()
  const title = pageTitles[location.pathname] || 'DRRMIS'
  const unread = notifications.filter(n => !n.read).length

  const toggleNotif  = () => { setNotifOpen(o => !o);   setProfileOpen(false) }
  const toggleProfile = () => { setProfileOpen(o => !o); setNotifOpen(false) }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar
        onLogout={onLogout}
        currentUser={currentUser}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Top bar ── */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0 shadow-sm">

          {/* Left: hamburger + page title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
          </div>

          {/* Right: notification + profile */}
          <div className="flex items-center gap-1">

            {/* Notification bell */}
            <div className="relative">
              <button
                onClick={toggleNotif}
                className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Notifications"
              >
                <Bell size={20} className="text-gray-600" />
                {unread > 0 && (
                  <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-[10px] font-bold leading-none px-0.5">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  </span>
                )}
              </button>

              <NotificationPanel
                notifications={notifications}
                setNotifications={setNotifications}
                open={notifOpen}
                onClose={() => setNotifOpen(false)}
              />
            </div>

            {/* Profile button */}
            <div className="relative ml-1">
              <button
                onClick={toggleProfile}
                className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200"
                aria-label="Profile menu"
              >
                <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">{currentUser?.avatar || 'U'}</span>
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-gray-800 leading-tight">{currentUser?.name || 'User'}</p>
                  <p className="text-xs text-gray-400 leading-tight">{currentUser?.role || ''}</p>
                </div>
                <ChevronDown
                  size={14}
                  className={`text-gray-400 transition-transform hidden sm:block ${profileOpen ? 'rotate-180' : ''}`}
                />
              </button>

              <ProfilePanel
                currentUser={currentUser}
                open={profileOpen}
                onClose={() => setProfileOpen(false)}
                onLogout={onLogout}
              />
            </div>

          </div>
        </header>

        {/* ── Page content ── */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
