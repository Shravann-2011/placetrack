import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { describeDue, formatCtc, formatDate } from '../lib/format';
import { Icon } from '../components/Icon';
import { CompanyAvatar, EmptyState, StageBadge } from '../components/ui';
import { ApplicationFormModal } from '../components/ApplicationForm';
import { ApplicationDrawer } from '../components/ApplicationDrawer';
import { ConfirmDialog } from '../components/ui';
import { useToast } from '../context/ToastContext';

const RANGES = [7, 14, 30];
const PILL = {
  urgent: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  soon: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  later: 'bg-slate-100 text-slate-700 ring-slate-500/20',
};

function group(apps) {
  const groups = [
    { title: 'Today & tomorrow', items: [] },
    { title: 'This week', items: [] },
    { title: 'Later', items: [] },
  ];
  for (const a of apps) {
    const d = describeDue(a.dueDate).days;
    groups[d <= 1 ? 0 : d <= 7 ? 1 : 2].items.push(a);
  }
  return groups.filter((g) => g.items.length);
}

export default function DueSoonPage() {
  const [days, setDays] = useState(7);
  const [apps, setApps] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const toast = useToast();
  const reload = () => setReloadKey((k) => k + 1);
  const confirmDelete = async () => {
    try { await api(`/applications/${deleting._id}`, { method: 'DELETE' }); toast(`${deleting.company} deleted`); setDeleting(null); reload(); }
    catch (err) { toast(err.message, 'error'); }
  };

  useEffect(() => {
    let ignore = false;
    setApps(null); setError('');
    api('/applications', { query: { dueWithinDays: days, limit: 100 } })
      .then((res) => !ignore && setApps(res.data))
      .catch((err) => !ignore && setError(err.message));
    return () => { ignore = true; };
  }, [days, reloadKey]);

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Due Soon</h1>
          <p className="mt-1 text-sm text-slate-500">Upcoming OAs, interviews and deadlines for active applications.</p>
        </div>
        <div className="inline-flex rounded-lg bg-slate-200/70 p-1" role="tablist" aria-label="Time range">
          {RANGES.map((r) => (
            <button key={r} role="tab" aria-selected={days === r} onClick={() => setDays(r)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${days === r ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
              {r} days
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {error ? (
          <div className="card"><EmptyState icon="alert" title="Couldn’t load deadlines">{error}</EmptyState></div>
        ) : !apps ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => <div key={i} className="card h-36 animate-pulse bg-slate-100/60" />)}
          </div>
        ) : apps.length === 0 ? (
          <div className="card">
            <EmptyState icon="calendar" title={`Nothing due in the next ${days} days`}>
              Add a “Next deadline” to an application and it will show up here.
            </EmptyState>
          </div>
        ) : (
          <div className="space-y-8">
            {group(apps).map((g) => (
              <section key={g.title}>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  {g.title}<span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">{g.items.length}</span>
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {g.items.map((app) => {
                    const due = describeDue(app.dueDate);
                    return (
                      <button key={app._id} onClick={() => setViewing(app)}
                        className="card group p-4 text-left transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md">
                        <div className="flex items-start gap-3">
                          <CompanyAvatar name={app.company} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-slate-900 group-hover:text-brand-700">{app.company}</p>
                            <p className="truncate text-xs text-slate-500">{app.role}</p>
                          </div>
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${PILL[due.urgency]}`}>{due.text}</span>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <StageBadge stage={app.stage} />
                          <span className="flex items-center gap-1 text-xs text-slate-500"><Icon name="calendar" className="size-3.5" />{formatDate(app.dueDate)}</span>
                        </div>
                        {app.notes && <p className="mt-3 line-clamp-2 border-t border-slate-100 pt-3 text-xs text-slate-500">{app.notes}</p>}
                        {!app.notes && app.ctc != null && <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">{formatCtc(app.ctc, app.type)}</p>}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <ApplicationDrawer application={viewing} onClose={() => setViewing(null)} onChanged={reload}
        onEdit={(a) => { setViewing(null); setEditing(a); }} onDelete={(a) => { setViewing(null); setDeleting(a); }} />
      <ApplicationFormModal open={editing !== null} application={editing} onClose={() => setEditing(null)} onSaved={reload} />
      <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={confirmDelete}
        title="Delete application?" message={<>This permanently removes <strong className="text-slate-900">{deleting?.company}</strong>.</>} />
    </div>
  );
}
