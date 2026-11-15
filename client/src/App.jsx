import { createBrowserRouter, Link, RouterProvider } from 'react-router';
import { MotionConfig } from 'motion/react';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { GuestRoute, ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { lazy as lazyReact, Suspense } from 'react';
import { FullPageLoader } from './components/ProtectedRoute';
import { WakeBanner } from './components/WakeBanner';

// Code splitting: each page is downloaded only when it is first visited,
// so the landing page doesn't make visitors download the whole app.
// After a new deploy, a tab opened earlier asks for page files that no longer exist
// (their names change every build). Reload once to get the new version instead of crashing.
const RELOAD_KEY = 'placetrack-chunk-reload';
const lazy = (load) => lazyReact(() => load().then((m) => {
  try { sessionStorage.removeItem(RELOAD_KEY); } catch { /* storage blocked */ }
  return m;
}).catch((err) => {
  let reloaded = false;
  try { reloaded = sessionStorage.getItem(RELOAD_KEY) === '1'; sessionStorage.setItem(RELOAD_KEY, '1'); } catch { /* storage blocked */ }
  if (!reloaded) { window.location.reload(); return new Promise(() => {}); }
  throw err;
}));

const LoginPage = lazy(() => import('./pages/AuthPages').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/AuthPages').then((m) => ({ default: m.RegisterPage })));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ApplicationsPage = lazy(() => import('./pages/ApplicationsPage'));
const BoardPage = lazy(() => import('./pages/BoardPage'));
const DueSoonPage = lazy(() => import('./pages/DueSoonPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const OffersPage = lazy(() => import('./pages/OffersPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

// Shown instead of the router's bare "Unexpected Application Error!" page
function ErrorPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-cream px-6 text-center">
      <div className="max-w-sm">
        <p className="display text-5xl text-ink">Oops</p>
        <h1 className="mt-3 text-xl font-bold text-ink">Something went wrong loading this page</h1>
        <p className="mt-2 text-sm text-slate-600">PlaceTrack may have just been updated. Reloading usually fixes it. Your data is safe.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button className="btn-primary" onClick={() => window.location.reload()}>Reload</button>
          <a href="/dashboard" className="btn-secondary">Go to dashboard</a>
        </div>
      </div>
    </div>
  );
}

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
    errorElement: <ErrorPage />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/', element: <LandingPage /> }, // visitors see the landing page; logged-in users go to /dashboard
    ],
  },
  {
    element: <ProtectedRoute />,
    errorElement: <ErrorPage />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/applications', element: <ApplicationsPage /> },
          { path: '/board', element: <BoardPage /> },
          { path: '/calendar', element: <CalendarPage /> },
          { path: '/offers', element: <OffersPage /> },
          { path: '/due-soon', element: <DueSoonPage /> },
          { path: '/settings', element: <SettingsPage /> },
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
          <WakeBanner />
          <Suspense fallback={<FullPageLoader />}>
            <RouterProvider router={router} />
          </Suspense>
        </ToastProvider>
      </AuthProvider>
    </MotionConfig>
  );
}
