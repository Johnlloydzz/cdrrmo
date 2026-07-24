import { Navigate, useLocation } from 'react-router-dom'
import { ROLE_ACCESS } from '../data/users'

/**
 * Wraps a page and redirects to /unauthorized if the current user's
 * role does not have access to the current path.
 */
export default function RoleGuard({ currentUser, children }) {
  const location = useLocation()
  const role = currentUser?.role

  if (!role) return <Navigate to="/login" replace />

  const access = ROLE_ACCESS[role]
  const allowed = access === '*' || (Array.isArray(access) && access.includes(location.pathname))

  if (!allowed) return <Navigate to="/unauthorized" replace />

  return children
}
