import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, homeFor } from '../context/AuthContext.jsx';
import Loader from './Loader.jsx';

// Wrap a page: only logged-in users with one of the allowed roles can see it.
// (The backend still checks the role on every API call - this is only for a better UI.)
export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return children;
}
