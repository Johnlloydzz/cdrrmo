import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy, useMemo, useState } from 'react'

import MainLayout        from './layouts/MainLayout'
import RoleGuard         from './components/RoleGuard'
import Login             from './pages/auth/Login'
import ForgotPassword    from './pages/auth/ForgotPassword'
import ChangePassword    from './pages/auth/ChangePassword'
import Unauthorized      from './pages/Unauthorized'
import { getStoredUser, setStoredUser, clearStoredUser } from './utils/storage'

// PDRA — 5 modules only (Chapter 1, Section 1.5):
// Risk Assessment Dashboard, Web-Based Hazard Mapping (+ Geofencing),
// Household and Population Management, User Management
const RiskAssessmentDashboard = lazy(() => import('./pages/RiskAssessmentDashboard'))
const BarangayManagement      = lazy(() => import('./pages/BarangayManagement'))
const PurokManagement         = lazy(() => import('./pages/PurokManagement'))
const HouseholdManagement     = lazy(() => import('./pages/HouseholdManagement'))
const ResidentManagement      = lazy(() => import('./pages/ResidentManagement'))
const GISMap                  = lazy(() => import('./pages/GISMap'))
const UserManagement          = lazy(() => import('./pages/UserManagement'))
const Settings                = lazy(() => import('./pages/Settings'))

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
          {/* Risk Assessment Dashboard Module — landing page, all roles */}
          <Route index element={<RiskAssessmentDashboard currentUser={currentUser} />} />

          {/* Unauthorized landing */}
          <Route path="unauthorized" element={<Unauthorized />} />

          {/* Change password — all authenticated users */}
          <Route path="change-password" element={<ChangePassword />} />

          {/* Household and Population Management Module */}
          <Route path="barangays"  element={<G><BarangayManagement /></G>} />
          <Route path="puroks"     element={<G><PurokManagement currentUser={currentUser} /></G>} />
          <Route path="households" element={<G><HouseholdManagement /></G>} />
          <Route path="residents"  element={<G><ResidentManagement currentUser={currentUser} /></G>} />

          {/* Web-Based Hazard Mapping + Geofencing Module */}
          <Route path="map" element={<G><GISMap /></G>} />

          {/* User Management Module — CDRRMO Personnel only */}
          <Route path="users"    element={<G><UserManagement currentUser={currentUser} /></G>} />
          <Route path="settings" element={<G><Settings /></G>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App