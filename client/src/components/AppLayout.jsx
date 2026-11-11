import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Icon, Logo } from './Icon';
import { initials } from '../lib/format';

const NAV = [
  { to: '/applications', label: 'Applications', icon: 'briefcase' },
  { to: '/due-soon', label: 'Due Soon', icon: 'clock' },
];

function NavItems({ onNavigate }) {
  return (
    <nav className="space-y-1">
      {NAV.map((item) => (
        <NavLink key={item.to} to={item.to} onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
          <Icon name={item.icon} className="size-[18px]" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function UserCard() {
  const { user, logout } = useAuth();
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <div className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-xs font-bold text-white">
        {initials(user?.name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{user?.name}</p>
        <p className="truncate text-xs text-slate-500">{user?.email}</p>
      </div>
      <button onClick={logout} className="btn-ghost p-2" title="Log out" aria-label="Log out">
        <Icon name="logout" />
      </button>
    </div>
  );
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setMobileOpen(false), [location.pathname]);

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-slate-50/80 p-4 lg:flex">
        <Logo className="px-2 py-1.5" />
        <div className="mt-8 flex-1"><NavItems /></div>
        <UserCard />
      </aside>

      {/* Mobile top bar + drawer */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <Logo />
        <button className="btn-ghost p-2" onClick={() => setMobileOpen(true)} aria-label="Open menu">
          <Icon name="menu" className="size-5" />
        </button>
      </header>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="animate-fade-in absolute inset-0 bg-slate-900/40" onClick={() => setMobileOpen(false)} />
          <div className="animate-slide-up absolute inset-y-0 left-0 flex w-72 flex-col bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <Logo className="px-2" />
              <button className="btn-ghost p-2" onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <Icon name="x" className="size-5" />
              </button>
            </div>
            <div className="mt-8 flex-1"><NavItems onNavigate={() => setMobileOpen(false)} /></div>
            <UserCard />
          </div>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
