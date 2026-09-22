import { Navigate, useLocation } from 'react-router-dom'
import { ROLE_ACCESS } from '../data/users'

// Same logic as App.jsx's defaultRouteFor — kept in sync manually since
// this file can't import from App.jsx without a circular import.
function defaultRouteFor(user) {
  if (!user) return '/login'
  return user.role === 'CDRRMO Personnel' ? '/' : '/households'
}

/**
 * Wraps a page and, if the current user's role doesn't have access to the
 * current path, silently redirects them to their own default landing page
 * instead of showing an "Access Restricted" screen — a Barangay Official
 * hitting a CDRRMO-only URL (bookmarked, typed, or a stale link) should
 * just land on Households, not see an error page about it.
 */
export default function RoleGuard({ currentUser, children }) {
  const location = useLocation()
  const role = currentUser?.role

  if (!role) return <Navigate to="/login" replace />

  const access = ROLE_ACCESS[role]
  const allowed = access === '*' || (Array.isArray(access) && access.includes(location.pathname))

  if (!allowed) return <Navigate to={defaultRouteFor(currentUser)} replace />

  return children
}