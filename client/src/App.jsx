import { createBrowserRouter, Link, RouterProvider } from 'react-router';
import { MotionConfig } from 'motion/react';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { GuestRoute, ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { lazy, Suspense } from 'react';
import { FullPageLoader } from './components/ProtectedRoute';

// Code splitting: each page is downloaded only when it is first visited,
// so the landing page doesn't make visitors download the whole app.
const LoginPage = lazy(() => import('./pages/AuthPages').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/AuthPages').then((m) => ({ default: m.RegisterPage })));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ApplicationsPage = lazy(() => import('./pages/ApplicationsPage'));
const BoardPage = lazy(() => import('./pages/BoardPage'));
const DueSoonPage = lazy(() => import('./pages/DueSoonPage'));

function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <p className="text-sm font-semibold text-brand-600">404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Page not found</h1>
        <Link to="/" className="btn-primary mt-6">Go home</Link>
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  {
    element: <GuestRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/', element: <LandingPage /> }, // visitors see the landing page; logged-in users go to /dashboard
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/applications', element: <ApplicationsPage /> },
          { path: '/board', element: <BoardPage /> },
          { path: '/due-soon', element: <DueSoonPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
]);

export default function App() {
  return (
    // reducedMotion="user": respects the OS "Reduce motion" setting automatically
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <ToastProvider>
          <Suspense fallback={<FullPageLoader />}>
            <RouterProvider router={router} />
          </Suspense>
        </ToastProvider>
      </AuthProvider>
    </MotionConfig>
  );
}
