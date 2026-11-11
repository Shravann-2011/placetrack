import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { describeDue } from '../lib/format';
import { Icon } from '../components/Icon';
import { CompanyAvatar, ConfirmDialog, EmptyState, StageBadge } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { ChartCard, FunnelChart, SourceChart, WeeklyChart } from '../components/charts';
import { CountUp } from '../components/CountUp';
import { motion } from 'motion/react';
import { ApplicationFormModal } from '../components/ApplicationForm';
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
  const [reloadKey, setReloadKey] = useState(0);
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const toast = useToast();

  useEffect(() => {
    let ignore = false;
    Promise.all([
      api('/applications/stats'),
      api('/applications', { query: { dueWithinDays: 7, limit: 4 } }),
    ])
      .then(([s, u]) => { if (!ignore) { setStats(s.data); setUpcoming(u.data); } })
      .catch((err) => !ignore && setError(err.message));
    return () => { ignore = true; };
  }, [reloadKey]);

  const firstName = user?.name?.split(' ')[0];
  const header = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{greeting()}, {firstName} 👋</h1>
        <p className="mt-1 text-sm text-slate-500">Here’s how your placement season is going.</p>
      </div>
      <button className="btn-primary" onClick={() => setAdding(true)}><Icon name="plus" /> Add application</button>
    </div>
  );
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
        {modal}
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

        <ChartCard title="Up next" subtitle="Deadlines in the next 7 days"
          action={<Link to="/due-soon" className="text-sm font-semibold text-brand-600 hover:text-brand-700">View all</Link>}>
          {upcoming.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Nothing due this week. 🎉</p>
          ) : (
            <ul className="-my-2 divide-y divide-slate-100">
              {upcoming.map((a) => {
                const due = describeDue(a.dueDate);
                return (
                  <li key={a._id}>
                    <button onClick={() => setViewing(a)} className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-lg px-2 py-3 text-left transition hover:bg-slate-50">
                    <CompanyAvatar name={a.company} size="size-8" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{a.company}</p>
                      <p className="truncate text-xs text-slate-500">{a.role}</p>
                    </div>
                    <StageBadge stage={a.stage} className="hidden sm:inline-flex" />
                    <span className={`w-20 text-right text-sm ${due.urgency === 'urgent' ? 'font-semibold text-rose-600' : 'text-slate-600'}`}>{due.text}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ChartCard>
      </div>
      {modal}
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
