import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Icon, Logo } from './Icon';
import { Spinner } from './ui';
import { initials } from '../lib/format';
import { api } from '../lib/api';
import { onApplicationsChanged } from '../lib/events';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', short: 'Home', icon: 'home' },
  { to: '/calendar', label: 'Calendar', short: 'Calendar', icon: 'calendar' },
  { to: '/applications', label: 'Applications', short: 'Apps', icon: 'briefcase', count: (t) => t.total },
  { to: '/board', label: 'Board', short: 'Board', icon: 'board' },
  { to: '/due-soon', label: 'Due Soon', short: 'Due', icon: 'clock', count: (t) => t.dueThisWeek, alert: true },
  { to: '/offers', label: 'Offers', short: 'Offers', icon: 'sparkles', count: (t) => t.offers },
  { to: '/settings', label: 'Settings', short: 'Settings', icon: 'shield' },
];

// Live counts next to the nav items; refreshes whenever an application changes
function useNavCounts() {
  const [totals, setTotals] = useState(null);
  useEffect(() => {
    const load = () => api('/applications/stats').then((r) => setTotals(r.data.totals)).catch(() => {});
    load();
    return onApplicationsChanged(load);
  }, []);
  return totals;
}

function SideNav({ totals, onNavigate, layoutKey }) {
  return (
    <nav className="space-y-1">
      {NAV.map((item) => {
        const count = totals && item.count ? item.count(totals) : 0;
        return (
          <NavLink key={item.to} to={item.to} onClick={onNavigate}
            className={({ isActive }) => `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
              isActive ? 'text-ink' : 'text-cream/70 hover:bg-white/5 hover:text-cream'}`}>
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId={layoutKey} className="absolute inset-0 rounded-xl bg-lime" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
                <Icon name={item.icon} className="relative size-[18px]" />
                <span className="relative flex-1">{item.label}</span>
                {count > 0 && (
                  <span className={`relative rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                    isActive ? 'bg-ink text-lime' : item.alert ? 'bg-coral text-ink' : 'bg-white/10 text-cream'}`}>{count}</span>
                )}
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}

function UserCard() {
  const { user, logout } = useAuth();
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
      <div className="grid size-9 shrink-0 place-items-center rounded-full bg-pink font-display text-xs text-ink">{initials(user?.name)}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-cream">{user?.name}</p>
        <p className="truncate text-xs text-cream/50">{user?.email}</p>
      </div>
      <button onClick={logout} className="grid size-8 place-items-center rounded-lg text-cream/60 transition hover:bg-white/10 hover:text-cream" title="Log out" aria-label="Log out">
        <Icon name="logout" />
      </button>
    </div>
  );
}

// Reopens the welcome guide that explains Paste a message / Add application
function HowItWorks({ onNavigate }) {
  return (
    <Link to="/dashboard?guide=1" onClick={onNavigate}
      className="mb-3 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-cream/70 transition hover:bg-white/5 hover:text-cream">
      <Icon name="help" className="size-[18px]" /> How PlaceTrack works
    </Link>
  );
}

function ShortcutHint() {
  return (
    <div className="mb-3 rounded-2xl border border-dashed border-white/15 p-3 text-xs text-cream/60">
      <p className="mb-1.5 flex items-center gap-1.5 font-semibold text-cream/80"><Icon name="keyboard" className="size-3.5" /> Shortcuts</p>
      <p><kbd className="rounded bg-white/10 px-1.5 text-cream">N</kbd> new application</p>
      <p className="mt-1"><kbd className="rounded bg-white/10 px-1.5 text-cream">/</kbd> search</p>
    </div>
  );
}

// Phone: a bottom tab bar with the four main pages + "More" (Due Soon, account)
function BottomTabs({ onMore }) {
  const tabs = NAV.filter((n) => !['/due-soon', '/offers', '/settings'].includes(n.to));
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-ink px-2 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5 lg:hidden" aria-label="Main">
      <div className="mx-auto grid max-w-md grid-cols-5">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} className={({ isActive }) => `flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold ${isActive ? 'text-lime' : 'text-cream/60'}`}>
            {({ isActive }) => (
              <>
                <span className={`grid h-7 w-12 place-items-center rounded-full transition ${isActive ? 'bg-lime text-ink' : ''}`}><Icon name={t.icon} className="size-[18px]" /></span>
                {t.short}
              </>
            )}
          </NavLink>
        ))}
        <button onClick={onMore} className="flex flex-col items-center gap-0.5 py-1.5 text-[11px] font-semibold text-cream/60">
          <span className="grid h-7 w-12 place-items-center"><Icon name="more" className="size-5" strokeWidth={3} /></span>More
        </button>
      </div>
    </nav>
  );
}

export function AppLayout() {
  const [moreOpen, setMoreOpen] = useState(false);
  const totals = useNavCounts();
  const location = useLocation();
  useEffect(() => setMoreOpen(false), [location.pathname]);

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-ink p-4 lg:flex">
        <Logo onDark className="px-2 py-1.5" />
        <div className="mt-8 flex-1"><SideNav totals={totals} layoutKey="nav-active" /></div>
        <HowItWorks />
        <ShortcutHint />
        <UserCard />
      </aside>

      {/* Phone: top bar + bottom tabs + "More" sheet */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-ink px-4 py-3 lg:hidden">
        <Logo onDark />
      </header>
      <BottomTabs onMore={() => setMoreOpen(true)} />
      <AnimatePresence>
        {moreOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div className="absolute inset-0 bg-ink/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMoreOpen(false)} />
            <motion.div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-ink p-4 pb-8" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}>
              <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-white/20" />
              <SideNav totals={totals} layoutKey="nav-active-mobile" onNavigate={() => setMoreOpen(false)} />
              <div className="mt-2"><HowItWorks onNavigate={() => setMoreOpen(false)} /></div>
              <UserCard />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="pb-24 lg:pb-0 lg:pl-64">
        {/* Re-keyed on every route change so each page fades/slides in */}
        <motion.div key={location.pathname} className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }}>
          <Suspense fallback={<div className="grid h-64 place-items-center text-brand-600"><Spinner className="size-6" /></div>}>
            <Outlet />
          </Suspense>
        </motion.div>
      </main>
    </div>
  );
}
