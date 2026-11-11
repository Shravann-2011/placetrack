import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import { STAGES, STAGE_STYLES } from '../lib/constants';
import { describeDue, formatCtc } from '../lib/format';
import { useDebounce } from '../lib/useDebounce';
import { useToast } from '../context/ToastContext';
import { Icon } from '../components/Icon';
import { CompanyAvatar, ConfirmDialog, EmptyState } from '../components/ui';
import { ApplicationDrawer } from '../components/ApplicationDrawer';
import { ApplicationFormModal } from '../components/ApplicationForm';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { celebrate } from '../lib/confetti';

const DUE_PILL = {
  urgent: 'bg-rose-50 text-rose-700',
  soon: 'bg-amber-50 text-amber-800',
  later: 'bg-slate-100 text-slate-600',
  past: 'bg-slate-100 text-slate-400',
};

// Small "Move to…" menu: the way to move cards on phones and with the keyboard,
// where HTML drag-and-drop doesn't work
function MoveMenu({ app, onMove }) {
  return (
    <label className="relative grid size-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-within:bg-slate-100">
      <Icon name="chevronDown" className="size-4" />
      <span className="sr-only">Move {app.company} to another stage</span>
      <select value={app.stage} onChange={(e) => onMove(app, e.target.value)} onClick={(e) => e.stopPropagation()}
        className="absolute inset-0 cursor-pointer opacity-0">
        {STAGES.map((s) => <option key={s} value={s}>{s === app.stage ? `${s} (current)` : `Move to ${s}`}</option>)}
      </select>
    </label>
  );
}

function BoardCard({ app, onOpen, onMove, onDragStart, onDragEnd, dragging }) {
  const due = describeDue(app.dueDate);
  return (
    <motion.div layout layoutId={app._id}
      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      whileHover={{ y: -2 }}>
    <article
      draggable
      onDragStart={(e) => onDragStart(e, app)}
      onDragEnd={onDragEnd}
      className={`group cursor-grab rounded-xl border border-slate-200 bg-white p-3 shadow-xs transition hover:border-slate-300 hover:shadow-md active:cursor-grabbing ${
        dragging ? 'rotate-1 opacity-40' : ''}`}>
      <div className="flex items-start gap-2.5">
        <CompanyAvatar name={app.company} size="size-8" />
        <button onClick={() => onOpen(app)} className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-brand-700">{app.company}</p>
          <p className="truncate text-xs text-slate-500">{app.role}</p>
        </button>
        <MoveMenu app={app} onMove={onMove} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
        <span className="tabular-nums text-slate-600">{formatCtc(app.ctc, app.type)}</span>
        {due ? (
          <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium ${DUE_PILL[due.urgency]}`}>
            <Icon name="clock" className="size-3" />{due.text}
          </span>
        ) : <span className="text-slate-400">{app.type === 'Internship' ? 'Internship' : app.source}</span>}
      </div>
    </article>
    </motion.div>
  );
}

export default function BoardPage() {
  const [apps, setApps] = useState(null);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput.trim().toLowerCase(), 150);
  const [draggingId, setDraggingId] = useState(null);
  const [overStage, setOverStage] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const dragApp = useRef(null);
  const toast = useToast();

  useEffect(() => {
    let ignore = false;
    api('/applications', { query: { limit: 100, sort: '-updatedAt' } })
      .then((res) => { if (!ignore) { setApps(res.data); setTotal(res.pagination.total); } })
      .catch((err) => !ignore && setError(err.message));
    return () => { ignore = true; };
  }, [reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  // Filter on the client: the board already has every card loaded
  const columns = useMemo(() => {
    const visible = (apps || []).filter((a) => !search || `${a.company} ${a.role}`.toLowerCase().includes(search));
    return STAGES.map((stage) => ({ stage, items: visible.filter((a) => a.stage === stage) }));
  }, [apps, search]);

  const move = async (app, stage) => {
    if (!app || app.stage === stage) return;
    const before = apps;
    // Optimistic: move the card now (to the top of its new column), roll back if the API fails
    setApps((list) => [{ ...app, stage }, ...list.filter((a) => a._id !== app._id)]);
    try {
      const res = await api(`/applications/${app._id}/stage`, { method: 'PATCH', body: { stage } });
      setApps((list) => list.map((a) => (a._id === app._id ? res.data : a)));
      if (stage === 'Offer') celebrate();
      toast(stage === 'Offer' ? `🎉 Offer from ${app.company}! Congratulations!` : `${app.company} moved to ${stage}`);
    } catch (err) {
      setApps(before);
      toast(err.message, 'error');
    }
  };

  const onDragStart = (e, app) => {
    dragApp.current = app;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', app._id); // required for Firefox
    // Delay so the browser takes its drag image before the card fades
    requestAnimationFrame(() => setDraggingId(app._id));
  };
  const onDragEnd = () => { setDraggingId(null); setOverStage(null); dragApp.current = null; };

  const columnHandlers = (stage) => ({
    onDragOver: (e) => {
      if (!dragApp.current) return;
      e.preventDefault(); // allows dropping here
      e.dataTransfer.dropEffect = 'move';
      if (overStage !== stage) setOverStage(stage);
    },
    onDragLeave: (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOverStage(null); },
    onDrop: (e) => {
      e.preventDefault();
      const app = dragApp.current;
      onDragEnd();
      move(app, stage);
    },
  });

  if (error) return <div className="card"><EmptyState icon="alert" title="Couldn’t load the board">{error}</EmptyState></div>;

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Board</h1>
          <p className="mt-1 text-sm text-slate-500">
            <span className="hidden sm:inline">Drag cards between rounds as you progress.</span>
            <span className="sm:hidden">Tap ⌄ on a card to move it to another round.</span>
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-64 sm:flex-none">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Filter cards…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} aria-label="Filter cards" />
          </div>
          <button className="btn-primary" onClick={() => setEditing({})}><Icon name="plus" /><span className="hidden sm:inline">Add</span></button>
        </div>
      </div>

      {total > 100 && (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Showing your 100 most recently updated applications.</p>
      )}

      {/* Columns scroll sideways; the negative margin lets them reach the screen edge on phones */}
      <div className="-mx-4 mt-6 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 [scrollbar-width:thin]">
        {/* LayoutGroup lets a card animate smoothly from one column to another */}
        <LayoutGroup>
        <div className="flex min-w-max snap-x snap-mandatory gap-4 sm:snap-none">
          {columns.map(({ stage, items }) => {
            const s = STAGE_STYLES[stage];
            const isOver = overStage === stage && dragApp.current?.stage !== stage;
            return (
              <section key={stage} {...columnHandlers(stage)} aria-label={`${stage} column, ${items.length} application${items.length === 1 ? "" : "s"}`}
                className={`flex w-[17rem] shrink-0 snap-start flex-col rounded-2xl border p-2.5 transition-colors ${
                  isOver ? 'border-brand-300 bg-brand-50/70 ring-4 ring-brand-100' : 'border-slate-200/70 bg-slate-100/60'}`}>
                <header className="flex items-center gap-2 px-1.5 pb-3 pt-1">
                  <span className={`size-2 rounded-full ${s.dot}`} aria-hidden="true" />
                  <h2 className="text-sm font-semibold text-slate-800">{stage}</h2>
                  <motion.span key={apps ? items.length : 'x'} initial={{ scale: 0.7 }} animate={{ scale: 1 }}
                    className="rounded-full bg-white px-2 text-xs font-medium text-slate-500 tabular-nums ring-1 ring-slate-200">{apps ? items.length : '·'}</motion.span>
                </header>
                <div className="flex min-h-24 flex-1 flex-col gap-2">
                  {!apps
                    ? Array.from({ length: stage === 'Applied' ? 3 : 1 }, (_, i) => <div key={i} className="h-[88px] animate-pulse rounded-xl bg-white/70" />)
                    : (
                      <AnimatePresence initial={false} mode="popLayout">
                        {items.map((app) => (
                          <BoardCard key={app._id} app={app} dragging={draggingId === app._id}
                            onOpen={setViewing} onMove={move} onDragStart={onDragStart} onDragEnd={onDragEnd} />
                        ))}
                      </AnimatePresence>
                    )}
                  {apps && items.length === 0 && (
                    <div className={`grid flex-1 place-items-center rounded-xl border-2 border-dashed px-3 py-6 text-center text-xs transition-colors ${
                      isOver ? 'border-brand-300 text-brand-700' : 'border-slate-200 text-slate-400'}`}>
                      {isOver ? 'Drop here' : search ? 'No matches' : 'No applications'}
                    </div>
                  )}
                  {isOver && items.length > 0 && <div className="h-2 rounded-full bg-brand-200" aria-hidden="true" />}
                </div>
              </section>
            );
          })}
        </div>
        </LayoutGroup>
      </div>

      <ApplicationDrawer application={viewing} onClose={() => setViewing(null)}
        onChanged={(a) => setApps((list) => list.map((x) => (x._id === a._id ? a : x)))}
        onEdit={(a) => { setViewing(null); setEditing(a); }} onDelete={(a) => { setViewing(null); setDeleting(a); }} />
      <ApplicationFormModal open={editing !== null} application={editing} onClose={() => setEditing(null)} onSaved={reload} />
      <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)}
        onConfirm={async () => {
          try { await api(`/applications/${deleting._id}`, { method: 'DELETE' }); toast(`${deleting.company} deleted`); setDeleting(null); reload(); }
          catch (err) { toast(err.message, 'error'); }
        }}
        title="Delete application?" message={<>This permanently removes <strong className="text-slate-900">{deleting?.company}</strong>.</>} />
    </div>
  );
}
