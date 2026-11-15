import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { fmtDay, sameDay, timeLabel } from '../lib/calendar';
import { EVENT_STYLES } from '../lib/constants';
import { Icon } from '../components/Icon';
import { CompanyAvatar, ConfirmDialog, EmptyState, StageBadge } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { ChartCard, FunnelChart, SourceChart, WeeklyChart } from '../components/charts';
import { CountUp } from '../components/CountUp';
import { motion } from 'motion/react';
import { ApplicationFormModal } from '../components/ApplicationForm';
import { ExplainedButton, WelcomeGuide } from '../components/Explainers';
import { PasteModal } from '../components/PasteModal';
import { ApplicationDrawer } from '../components/ApplicationDrawer';

function StatTile({ label, value, suffix = '', sub, icon, to, index = 0 }) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className="grid size-8 place-items-center rounded-lg bg-brand-50 text-brand-600"><Icon name={icon} /></div>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900"><CountUp value={value} suffix={suffix} /></p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </>
  );
  // Tiles rise in one after another and lift slightly on hover
  const motionProps = {
    initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 },
    transition: { delay: index * 0.07, type: 'spring', stiffness: 260, damping: 24 },
    whileHover: to ? { y: -3 } : undefined,
  };
  return to
    ? <motion.div {...motionProps}><Link to={to} className="card block h-full p-5 transition-shadow hover:border-brand-200 hover:shadow-md">{body}</Link></motion.div>
    : <motion.div {...motionProps} className="card p-5">{body}</motion.div>;
}

// Applications with no stage change or follow-up for 14+ days (and no round booked)
function NudgeCard({ items, onDone }) {
  const toast = useToast();
  const [busy, setBusy] = useState(null);
  const act = async (a, kind) => {
    setBusy(a._id);
    try {
      if (kind === 'followed') await api(`/applications/${a._id}`, { method: 'PATCH', body: { followedUpAt: new Date().toISOString() } });
      else await api(`/applications/${a._id}/stage`, { method: 'PATCH', body: { stage: 'Rejected' } });
      toast(kind === 'followed' ? `Noted. We'll check on ${a.company} again in 14 days` : `${a.company} marked as rejected`);
      onDone(a._id);
    } catch (err) { toast(err.message, 'error'); }
    finally { setBusy(null); }
  };
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="mt-4 rounded-2xl bg-coral/15 p-5 ring-1 ring-coral/40">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="display text-xl text-ink">Gone quiet</h2>
        <p className="text-sm text-slate-700">No update in 14+ days. Follow up, or clear them off your board.</p>
      </div>
      <ul className="mt-4 grid gap-2 md:grid-cols-2">
        {items.map((a) => (
          <li key={a._id} className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-[#e8e2cf]">
            <CompanyAvatar name={a.company} size="size-9" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{a.company}</p>
              <p className="truncate text-xs text-slate-500">{a.stage} · quiet for <strong className="text-coral">{a.days} days</strong></p>
            </div>
            <div className="flex gap-1.5">
              <button className="btn-lime px-2.5 py-1.5 text-xs" disabled={busy === a._id} onClick={() => act(a, 'followed')}>Followed up</button>
              <button className="btn-ghost px-2.5 py-1.5 text-xs text-rose-700 hover:bg-rose-50" disabled={busy === a._id} onClick={() => act(a, 'rejected')}>Mark rejected</button>
            </div>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const toast = useToast();

  useEffect(() => {
    let ignore = false;
    Promise.all([
      api('/applications/stats'),
      api('/events', { query: { from: new Date().toISOString(), to: new Date(Date.now() + 7 * 864e5).toISOString() } }),
    ])
      .then(([s, u]) => { if (!ignore) { setStats(s.data); setUpcoming(u.data.filter((e) => !e.done).slice(0, 5)); } })
      .catch((err) => !ignore && setError(err.message));
    return () => { ignore = true; };
  }, [reloadKey]);

  const firstName = user?.name?.split(' ')[0];

  // First visit (or "How it works" in the menu): show the two ways to add a company
  const guideKey = `placetrack-guide-seen-${user?._id}`;
  const [searchParams, setSearchParams] = useSearchParams();
  const [guideOpen, setGuideOpen] = useState(() => {
    try { return !localStorage.getItem(guideKey); } catch { return false; }
  });
  useEffect(() => { if (searchParams.get('guide')) setGuideOpen(true); }, [searchParams]);
  const closeGuide = () => {
    setGuideOpen(false);
    try { localStorage.setItem(guideKey, '1'); } catch { /* storage blocked */ }
    if (searchParams.get('guide')) setSearchParams({}, { replace: true });
  };
  const header = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="display text-4xl text-ink sm:text-5xl">{greeting()}, {firstName} 👋</h1>
        <p className="mt-2 text-sm text-slate-600">Here’s how your placement season is going.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <ExplainedButton kind="paste" className="btn-lime" onClick={() => setPasting(true)}><Icon name="paste" /> Paste a message</ExplainedButton>
        <ExplainedButton kind="add" className="btn-primary" onClick={() => setAdding(true)}><Icon name="plus" /> Add application</ExplainedButton>
      </div>
    </div>
  );
  const guide = <WelcomeGuide open={guideOpen} name={firstName} onClose={closeGuide}
    onPaste={() => { closeGuide(); setPasting(true); }} onAdd={() => { closeGuide(); setAdding(true); }} />;
  const pasteModal = <><PasteModal open={pasting} onClose={() => setPasting(false)} onAdded={() => setReloadKey((k) => k + 1)} />{guide}</>;
  const modal = <ApplicationFormModal open={adding} application={adding ? {} : null} onClose={() => setAdding(false)} onSaved={() => setReloadKey((k) => k + 1)} />;

  if (error) return <div className="animate-fade-in">{header}<div className="card mt-6"><EmptyState icon="alert" title="Couldn’t load your dashboard">{error}</EmptyState></div></div>;

  if (!stats) {
    return (
      <div>{header}
        <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="card h-[118px] animate-pulse bg-slate-100/60" />)}</div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">{Array.from({ length: 2 }, (_, i) => <div key={i} className="card h-72 animate-pulse bg-slate-100/60" />)}</div>
      </div>
    );
  }

  const t = stats.totals;
  if (t.total === 0) {
    return (
      <div className="animate-fade-in">{header}
        <div className="card mt-6">
          <EmptyState icon="chart" title="Your dashboard is waiting for data"
            action={<button className="btn-primary" onClick={() => setAdding(true)}><Icon name="plus" /> Add your first application</button>}>
            Add a few applications and you’ll see your stage funnel, weekly activity and which sources get the most replies.
          </EmptyState>
        </div>
        {modal}{pasteModal}
      </div>
    );
  }

  const weekCount = stats.weekly.at(-1).count;
  const best = stats.bySource[0];

  return (
    <div className="animate-fade-in">
      {header}

      <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatTile index={0} label="Applications" icon="briefcase" value={t.total} sub={`${weekCount} this week`} to="/applications" />
        <StatTile index={1} label="In progress" icon="clock" value={t.active} sub={`${t.dueThisWeek} deadline${t.dueThisWeek === 1 ? '' : 's'} this week`} to="/due-soon" />
        <StatTile index={2} label="Response rate" icon="inbox" value={Math.round(t.responseRate * 100)} suffix="%" sub="Companies that replied" />
        <StatTile index={3} label="Offers" icon="sparkles" value={t.offers} sub={`${t.rejected} rejected`} to="/applications?stage=Offer" />
      </div>

      {stats.stale?.length > 0 && (
        <NudgeCard items={stats.stale} onDone={(id) => setStats((st) => ({ ...st, stale: st.stale.filter((x) => x._id !== id) }))} />
      )}

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <ChartCard title="Placement funnel" subtitle="Applications that reached each round · % of previous round"
          table={{ columns: ['Stage', 'Reached', 'Of previous'], rows: stats.funnel.map((d, i) => [d.stage, d.count, i && stats.funnel[i - 1].count ? `${Math.round((d.count / stats.funnel[i - 1].count) * 100)}%` : '—']) }}>
          <FunnelChart data={stats.funnel} />
          {t.rejected > 0 && <p className="mt-5 border-t border-slate-100 pt-3 text-xs text-slate-500">{t.rejected} application{t.rejected === 1 ? '' : 's'} ended in rejection along the way.</p>}
        </ChartCard>

        <ChartCard title="Applications per week" subtitle="Last 8 weeks, by date applied"
          table={{ columns: ['Week of', 'Applications'], rows: stats.weekly.map((w) => [new Date(w.weekStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), w.count]) }}>
          <WeeklyChart data={stats.weekly} />
        </ChartCard>

        <ChartCard title="Response rate by source" subtitle={best ? `${best.source} gets you the most replies` : 'Where replies come from'}
          table={{ columns: ['Source', 'Replied', 'Applied', 'Rate', 'Offers'], rows: stats.bySource.map((s) => [s.source, s.responded, s.total, `${Math.round(s.rate * 100)}%`, s.offers]) }}>
          <SourceChart data={stats.bySource} />
        </ChartCard>

        <ChartCard title="Up next" subtitle="Rounds and deadlines in the next 7 days"
          action={<Link to="/calendar" className="text-sm font-semibold text-brand-600 hover:text-ink">Open calendar</Link>}>
          {upcoming.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              <p>Nothing scheduled this week.</p>
              <Link to="/calendar" className="mt-2 inline-block font-semibold text-ink underline decoration-lime decoration-2 underline-offset-4">Add your OA and interview dates</Link>
            </div>
          ) : (
            <ul className="-my-1 space-y-2">
              {upcoming.map((e) => {
                const st = EVENT_STYLES[e.type] || EVENT_STYLES.Other;
                const today = sameDay(e.start, new Date());
                return (
                  <li key={e._id} className="flex items-center gap-3 rounded-xl border border-[#efe9d8] p-2.5">
                    <div className={`grid size-11 shrink-0 place-items-center rounded-xl text-center leading-none ${today ? 'bg-lime text-ink' : 'bg-sand text-ink'}`}>
                      <span className="text-[10px] font-bold uppercase">{today ? 'Today' : fmtDay(e.start, { weekday: 'short' })}</span>
                      <span className="display text-base">{new Date(e.start).getDate()}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{e.application?.company}</p>
                      <p className="truncate text-xs text-slate-500">{e.type} · {timeLabel(e)}</p>
                    </div>
                    <span className={`hidden size-2.5 shrink-0 rounded-full sm:block ${st.dot}`} />
                  </li>
                );
              })}
            </ul>
          )}
        </ChartCard>
      </div>
      {modal}{pasteModal}
      <ApplicationDrawer application={viewing} onClose={() => setViewing(null)} onChanged={() => setReloadKey((k) => k + 1)}
        onEdit={(a) => { setViewing(null); setEditing(a); }} onDelete={(a) => { setViewing(null); setDeleting(a); }} />
      <ApplicationFormModal open={editing !== null} application={editing} onClose={() => setEditing(null)} onSaved={() => setReloadKey((k) => k + 1)} />
      <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)}
        onConfirm={async () => {
          try { await api(`/applications/${deleting._id}`, { method: 'DELETE' }); toast(`${deleting.company} deleted`); setDeleting(null); setReloadKey((k) => k + 1); }
          catch (err) { toast(err.message, 'error'); }
        }}
        title="Delete application?" message={<>This permanently removes <strong className="text-slate-900">{deleting?.company}</strong>.</>} />
    </div>
  );
}
