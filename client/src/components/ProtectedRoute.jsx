import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingBlock } from './ui/Spinner';

/**
 * Guards routes. Waits for the session to hydrate, then redirects guests to
 * /login (remembering where they wanted to go) and non-admins away from admin.
 */
export function ProtectedRoute({ adminOnly = false }) {
  const { user, ready, isAdmin } = useAuth();
  const location = useLocation();

  if (!ready) return <LoadingBlock />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}

/** Redirects logged-in users away from login/register. */
export function GuestRoute() {
  const { user, ready } = useAuth();
  if (!ready) return <LoadingBlock />;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}
