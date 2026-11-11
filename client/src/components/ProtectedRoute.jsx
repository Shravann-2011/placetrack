import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './ui';

export function FullPageLoader() {
  return (
    <div className="grid min-h-screen place-items-center text-brand-600">
      <Spinner className="size-8" />
    </div>
  );
}

// Only logged-in users get through; others go to /login and come back after
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <FullPageLoader />;
  if (status === 'guest') return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

// Logged-in users shouldn't see the login/register pages
export function GuestRoute() {
  const { status } = useAuth();
  if (status === 'loading') return <FullPageLoader />;
  if (status === 'authenticated') return <Navigate to="/applications" replace />;
  return <Outlet />;
}
