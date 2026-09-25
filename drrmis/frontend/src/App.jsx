import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy, useMemo, useState, Component } from 'react'

// After a new deploy, page files get new names (e.g. GISMap-5RWd.js), so a
// tab that was already open before the deploy asks for old files that no
// longer exist — the page then fails to load and the screen goes blank.
// This wraps lazy() so that on such a failure the app reloads ONCE to pick
// up the new version. The sessionStorage flag prevents an endless reload
// loop if the failure is something else (e.g. no internet).
const RELOAD_FLAG = 'pdra_chunk_reload'
function lazyWithReload(factory) {
  return lazy(() => factory()
    .then(module => { sessionStorage.removeItem(RELOAD_FLAG); return module })
    .catch(err => {
      if (!sessionStorage.getItem(RELOAD_FLAG)) {
        sessionStorage.setItem(RELOAD_FLAG, '1')
        window.location.reload()
        return new Promise(() => {}) // keep showing the loading state until the reload happens
      }
      throw err
    }))
}
// Vite also reports failed preloads of those files through this event.
window.addEventListener('vite:preloadError', (event) => {
  if (!sessionStorage.getItem(RELOAD_FLAG)) {
    event.preventDefault()
    sessionStorage.setItem(RELOAD_FLAG, '1')
    window.location.reload()
  }
})

// Last line of defense: if any page still crashes, show a message with a
// Reload button instead of a completely blank screen.
class AppErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false } }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err) { console.error('Page error:', err) }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 max-w-sm text-center">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Something went wrong loading this page</h2>
          <p className="text-sm text-gray-500 mb-5">This usually happens right after the system is updated. Reloading will fix it.</p>
          <button type="button" className="btn-primary w-full" onClick={() => { sessionStorage.removeItem(RELOAD_FLAG); window.location.reload() }}>Reload</button>
        </div>
      </div>
    )
  }
}

import MainLayout        from './layouts/MainLayout'
import RoleGuard         from './components/RoleGuard'
import Login             from './pages/auth/Login'
import RequestAccount    from './pages/auth/RequestAccount'
import RequestPasswordReset from './pages/auth/RequestPasswordReset'
import ChangePassword    from './pages/auth/ChangePassword'
import Unauthorized      from './pages/Unauthorized'
import { getStoredUser, setStoredUser, clearStoredUser } from './utils/storage'

// PDRA — 5 modules only (Chapter 1, Section 1.5):
// Risk Assessment Dashboard, Web-Based Hazard Mapping (+ Geofencing),
// Household and Population Management, User Management
const RiskAssessmentDashboard = lazyWithReload(() => import('./pages/RiskAssessmentDashboard'))
const BarangayManagement      = lazyWithReload(() => import('./pages/BarangayManagement'))
const PurokManagement         = lazyWithReload(() => import('./pages/PurokManagement'))
const HouseholdManagement     = lazyWithReload(() => import('./pages/HouseholdManagement'))
const ResidentManagement      = lazyWithReload(() => import('./pages/ResidentManagement'))
const GISMap                  = lazyWithReload(() => import('./pages/GISMap'))
const FloodSimulationControl  = lazyWithReload(() => import('./pages/FloodSimulationControl'))
const UserManagement          = lazyWithReload(() => import('./pages/UserManagement'))
const Settings                = lazyWithReload(() => import('./pages/Settings'))

// Wraps a page element with RoleGuard so direct URL access is also blocked
function Protected({ currentUser, children }) {
  return <RoleGuard currentUser={currentUser}>{children}</RoleGuard>
}

// Dashboard and Barangays are now CDRRMO Personnel only — Barangay Official's
// default landing page after login is Households instead.
function defaultRouteFor(user) {
  if (!user) return '/login'
  return user.role === 'CDRRMO Personnel' ? '/' : '/households'
}

function App() {
  const [currentUser, setCurrentUser] = useState(() => getStoredUser())

  const handleLogin = (user, remember = true) => {
    setStoredUser(user, remember)
    setCurrentUser(user)
  }

  const handleLogout = () => {
    clearStoredUser()
    setCurrentUser(null)
  }

  const G = ({ children }) => <Protected currentUser={currentUser}>{children}</Protected>
  const routeFallback = useMemo(() => <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">Loading...</div>, [])

  return (
    <BrowserRouter>
      <AppErrorBoundary>
      <Suspense fallback={routeFallback}>
      <Routes>
        {/* Public */}
        <Route
          path="/login"
          element={currentUser ? <Navigate to={defaultRouteFor(currentUser)} replace /> : <Login onLogin={handleLogin} />}
        />
        <Route path="/request-password-reset" element={<RequestPasswordReset />} />
        <Route path="/request-account" element={<RequestAccount />} />

        {/* Fullscreen "big screen" display mode for the Flood Simulation
            Control — same page, same login/role requirement, but rendered
            without the sidebar/header for wall-mounted monitors. */}
        <Route
          path="/flood-control/display"
          element={
            currentUser
              ? <Protected currentUser={currentUser}><FloodSimulationControl /></Protected>
              : <Navigate to="/login" replace />
          }
        />

        {/* Protected shell */}
        <Route
          path="/"
          element={
            currentUser
              ? <MainLayout onLogout={handleLogout} currentUser={currentUser} />
              : <Navigate to="/login" replace />
          }
        >
          {/* Risk Assessment Dashboard Module — CDRRMO Personnel only */}
          <Route index element={<G><RiskAssessmentDashboard currentUser={currentUser} /></G>} />

          {/* Unauthorized landing */}
          <Route path="unauthorized" element={<Unauthorized />} />

          {/* Change password — all authenticated users */}
          <Route path="change-password" element={<ChangePassword />} />

          {/* Household and Population Management Module */}
          <Route path="barangays"  element={<G><BarangayManagement /></G>} />
          <Route path="puroks"     element={<G><PurokManagement currentUser={currentUser} /></G>} />
          <Route path="households" element={<G><HouseholdManagement currentUser={currentUser} /></G>} />
          <Route path="residents"  element={<G><ResidentManagement currentUser={currentUser} /></G>} />

          {/* Web-Based Hazard Mapping + Geofencing Module */}
          <Route path="map" element={<G><GISMap /></G>} />
          <Route path="flood-control" element={<G><FloodSimulationControl /></G>} />

          {/* User Management Module — CDRRMO Personnel only */}
          <Route path="users"    element={<G><UserManagement currentUser={currentUser} /></G>} />
          <Route path="settings" element={<G><Settings currentUser={currentUser} /></G>} />
        </Route>

        <Route path="*" element={<Navigate to={defaultRouteFor(currentUser)} replace />} />
      </Routes>
      </Suspense>
      </AppErrorBoundary>
    </BrowserRouter>
  )
}

export default App