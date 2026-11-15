import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { RouteProgress, useSpotlight } from './Motion';
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
  // A soft highlight glides to whichever item the mouse is over
  const [hovered, setHovered] = useState(null);
  return (
    <LayoutGroup id={layoutKey}>
      <nav className="space-y-1" onMouseLeave={() => setHovered(null)}>
        {NAV.map((item, i) => {
          const count = totals && item.count ? item.count(totals) : 0;
          return (
            <motion.div key={item.to} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 + i * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
              <NavLink to={item.to} onClick={onNavigate} onMouseEnter={() => setHovered(item.to)}
                className={({ isActive }) => `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                  isActive ? 'text-ink' : 'text-cream/70 hover:text-cream'}`}>
                {({ isActive }) => (
                  <>
                    {hovered === item.to && !isActive && (
                      <motion.span layoutId="hover" className="absolute inset-0 rounded-xl bg-white/[0.07]" transition={{ type: 'spring', stiffness: 520, damping: 40 }} />
                    )}
                    {isActive && <motion.span layoutId="active" className="absolute inset-0 rounded-xl bg-lime shadow-[0_4px_16px_-4px_rgb(212_240_76/0.55)]" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
                    <Icon name={item.icon} className={`relative size-[18px] transition-transform duration-300 ${isActive ? '' : 'group-hover:-rotate-6 group-hover:scale-110'}`} />
                    <span className="relative flex-1 transition-transform duration-300 group-hover:translate-x-0.5">{item.label}</span>
                    <AnimatePresence initial={false}>
                      {count > 0 && (
                        <motion.span key={count} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 26 }}
                          className={`relative rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                            isActive ? 'bg-ink text-lime' : item.alert ? 'bg-coral text-ink' : 'bg-white/10 text-cream'}`}>{count}</motion.span>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </NavLink>
            </motion.div>
          );
        })}
      </nav>
    </LayoutGroup>
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

// Phone: a bottom tab bar with the four main pages + "More" (Due Soon, account).
// The lime pill slides to the tab you pick and the icon gives a small hop.
function BottomTabs({ onMore, moreOpen }) {
  const tabs = NAV.filter((n) => !['/due-soon', '/offers', '/settings'].includes(n.to));
  return (
    <nav className="fixed inset-x-0 bottom-0 z-[45] border-t border-white/10 bg-ink/95 px-2 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5 backdrop-blur-md lg:hidden" aria-label="Main">
      <LayoutGroup id="tabs">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {tabs.map((t) => (
            <NavLink key={t.to} to={t.to} className={({ isActive }) => `flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold transition-colors duration-300 ${isActive && !moreOpen ? 'text-lime' : 'text-cream/60'}`}>
              {({ isActive }) => (
                <motion.span className="flex flex-col items-center gap-0.5" whileTap={{ scale: 0.88 }}>
                  <span className="relative grid h-7 w-12 place-items-center">
                    {isActive && !moreOpen && <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-full bg-lime" transition={{ type: 'spring', stiffness: 520, damping: 34 }} />}
                    <motion.span key={String(isActive)} className={`relative ${isActive && !moreOpen ? 'text-ink' : ''}`}
                      initial={isActive ? { y: 0 } : false} animate={isActive ? { y: [0, -4, 0] } : { y: 0 }} transition={{ duration: 0.4, ease: 'easeOut' }}>
                      <Icon name={t.icon} className="size-[18px]" />
                    </motion.span>
                  </span>
                  {t.short}
                </motion.span>
              )}
            </NavLink>
          ))}
          <motion.button onClick={onMore} whileTap={{ scale: 0.88 }} className={`flex flex-col items-center gap-0.5 py-1.5 text-[11px] font-semibold transition-colors ${moreOpen ? 'text-lime' : 'text-cream/60'}`}>
            <span className="relative grid h-7 w-12 place-items-center">
              {moreOpen && <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-full bg-lime" transition={{ type: 'spring', stiffness: 520, damping: 34 }} />}
              <motion.span className={`relative ${moreOpen ? 'text-ink' : ''}`} animate={{ rotate: moreOpen ? 90 : 0 }}><Icon name="more" className="size-5" strokeWidth={3} /></motion.span>
            </span>More
          </motion.button>
        </div>
      </LayoutGroup>
    </nav>
  );
}

export function AppLayout() {
  const [moreOpen, setMoreOpen] = useState(false);
  const totals = useNavCounts();
  const location = useLocation();
  useEffect(() => setMoreOpen(false), [location.pathname]);
  useSpotlight();

  return (
    <div className="min-h-screen">
      <RouteProgress />
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-ink p-4 lg:flex">
        <motion.div whileHover={{ rotate: -2, scale: 1.03 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }} className="w-fit"><Logo onDark className="px-2 py-1.5" /></motion.div>
        <div className="mt-8 flex-1"><SideNav totals={totals} layoutKey="nav-active" /></div>
        <HowItWorks />
        <ShortcutHint />
        <UserCard />
      </aside>

      {/* Phone: top bar + bottom tabs + "More" sheet */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-ink px-4 py-3 lg:hidden">
        <Logo onDark />
      </header>
      <BottomTabs onMore={() => setMoreOpen((o) => !o)} moreOpen={moreOpen} />
      <AnimatePresence>
        {moreOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div className="absolute inset-0 bg-ink/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMoreOpen(false)} />
            <motion.div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-ink p-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)]" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
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
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
          <Suspense fallback={<div className="grid h-64 place-items-center text-brand-600"><Spinner className="size-6" /></div>}>
            <Outlet />
          </Suspense>
        </motion.div>
      </main>
    </div>
  );
}
