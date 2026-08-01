import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy, useMemo, useState } from 'react'

import MainLayout        from './layouts/MainLayout'
import RoleGuard         from './components/RoleGuard'
import Login             from './pages/auth/Login'
import ForgotPassword    from './pages/auth/ForgotPassword'
import ChangePassword    from './pages/auth/ChangePassword'
import Unauthorized      from './pages/Unauthorized'
import { getStoredUser, setStoredUser, clearStoredUser } from './utils/storage'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const BarangayManagement = lazy(() => import('./pages/BarangayManagement'))
const PurokManagement = lazy(() => import('./pages/PurokManagement'))
const HouseholdManagement = lazy(() => import('./pages/HouseholdManagement'))
const ResidentManagement = lazy(() => import('./pages/ResidentManagement'))
const HazardManagement = lazy(() => import('./pages/HazardManagement'))
const IncidentManagement = lazy(() => import('./pages/IncidentManagement'))
const EvacuationCenters = lazy(() => import('./pages/EvacuationCenters'))
const EvacuationManagement = lazy(() => import('./pages/EvacuationManagement'))
const ReliefManagement = lazy(() => import('./pages/ReliefManagement'))
const ResourceManagement = lazy(() => import('./pages/ResourceManagement'))
const WeatherPage = lazy(() => import('./pages/WeatherPage'))
const GISMap = lazy(() => import('./pages/GISMap'))
const UserManagement = lazy(() => import('./pages/UserManagement'))
const Reports = lazy(() => import('./pages/Reports'))
const Analytics = lazy(() => import('./pages/Analytics'))
const AuditLogs = lazy(() => import('./pages/AuditLogs'))
const Settings = lazy(() => import('./pages/Settings'))
const Alerts = lazy(() => import('./pages/Alerts'))
const Archive = lazy(() => import('./pages/Archive'))

// Wraps a page element with RoleGuard so direct URL access is also blocked
function Protected({ currentUser, children }) {
  return <RoleGuard currentUser={currentUser}>{children}</RoleGuard>
}

function App() {
  const [currentUser, setCurrentUser] = useState(() => getStoredUser())

  const handleLogin = (user) => {
    setStoredUser(user)
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
      <Suspense fallback={routeFallback}>
      <Routes>
        {/* Public */}
        <Route
          path="/login"
          element={currentUser ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />}
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Protected shell */}
        <Route
          path="/"
          element={
            currentUser
              ? <MainLayout onLogout={handleLogout} currentUser={currentUser} />
              : <Navigate to="/login" replace />
          }
        >
          {/* Dashboard — all roles */}
          <Route index element={<Dashboard currentUser={currentUser} />} />

          {/* Unauthorized landing */}
          <Route path="unauthorized" element={<Unauthorized />} />

          {/* Change password — all authenticated users */}
          <Route path="change-password" element={<ChangePassword />} />

          {/* Community */}
          <Route path="barangays"  element={<G><BarangayManagement /></G>} />
          <Route path="puroks"     element={<G><PurokManagement /></G>} />
          <Route path="households" element={<G><HouseholdManagement /></G>} />
          <Route path="residents"  element={<G><ResidentManagement /></G>} />

          {/* Disaster Response */}
          <Route path="hazards"            element={<G><HazardManagement currentUser={currentUser} /></G>} />
          <Route path="incidents"          element={<G><IncidentManagement currentUser={currentUser} /></G>} />
          <Route path="evacuation-centers" element={<G><EvacuationCenters /></G>} />
          <Route path="evacuation"         element={<G><EvacuationManagement /></G>} />
          <Route path="relief"             element={<G><ReliefManagement /></G>} />
          <Route path="resources"          element={<G><ResourceManagement /></G>} />

          {/* Main */}
          <Route path="weather" element={<G><WeatherPage /></G>} />
          <Route path="map"     element={<G><GISMap /></G>} />
          <Route path="alerts"  element={<G><Alerts /></G>} />

          {/* Administration */}
          <Route path="users"      element={<G><UserManagement currentUser={currentUser} /></G>} />
          <Route path="reports"    element={<G><Reports /></G>} />
          <Route path="analytics"  element={<G><Analytics /></G>} />
          <Route path="audit-logs" element={<G><AuditLogs /></G>} />
          <Route path="archive"    element={<G><Archive /></G>} />
          <Route path="settings"   element={<G><Settings /></G>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App