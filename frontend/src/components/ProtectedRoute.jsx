import { Navigate } from 'react-router-dom'
import { getCurrentUser } from '../api'

/**
 * ProtectedRoute — wraps any route that requires login.
 * If no token/user found in localStorage → redirect to /login.
 */
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token')
  const user  = getCurrentUser()

  if (!token || !user) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute
