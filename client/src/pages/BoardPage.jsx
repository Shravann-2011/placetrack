import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useAuth } from '../context/AuthContext';
import { BADGES, STAGE_XP, computeProgress, xpForMove } from '../lib/progress';
import { BadgeUnlocks, BadgesModal, GameBar, LevelUp, RoundPips } from '../components/BoardGame';

// Column headers: the path of rounds, like levels in a game
const ROUND_NO = { Applied: 'Start', 'Aptitude/OA': 'Round 1', GD: 'Round 2', Technical: 'Round 3', HR: 'Round 4', Offer: 'Goal', Rejected: 'Closed' };

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
      className={`group cursor-grab rounded-xl border bg-white p-3 shadow-xs transition hover:shadow-md active:cursor-grabbing ${
        app.stage === 'Offer' ? 'border-emerald-300' : 'border-[#e8e2cf] hover:border-ink/30'} ${dragging ? 'rotate-2 opacity-40' : ''}`}>
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
      <RoundPips app={app} />
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
  const { user } = useAuth();
  const [floats, setFloats] = useState([]); // "+20 XP" bubbles rising from a column
  const [levelUp, setLevelUp] = useState(null);
  const [unlocks, setUnlocks] = useState([]);
  const [badgesOpen, setBadgesOpen] = useState(false);
  const progress = useMemo(() => (apps ? computeProgress(apps) : null), [apps]);

  // Badges already shown to this student, so "Badge unlocked" only appears for new ones
  const seenKey = `placetrack-badges-${user?._id}`;
  const readSeen = useCallback(() => { try { return JSON.parse(localStorage.getItem(seenKey)) || null; } catch { return null; } }, [seenKey]);
  const writeSeen = useCallback((ids) => { try { localStorage.setItem(seenKey, JSON.stringify(ids)); } catch { /* storage blocked */ } }, [seenKey]);
  useEffect(() => {
    if (!progress) return;
    const seen = readSeen();
    if (!seen) { writeSeen([...progress.earned]); return; } // first visit: no burst of old badges
    const fresh = [...progress.earned].filter((id) => !seen.includes(id));
    if (fresh.length) {
      setUnlocks((u) => [...u, ...BADGES.filter((b) => fresh.includes(b.id))]);
      writeSeen([...seen, ...fresh]);
    }
  }, [progress, readSeen, writeSeen]);
  const dismissUnlock = useCallback((id) => setUnlocks((u) => u.filter((b) => b.id !== id)), []);
  const clearLevelUp = useCallback(() => setLevelUp(null), []);

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
    const gain = xpForMove(app, stage);
    const levelBefore = progress?.level;
    // Optimistic: move the card now (to the top of its new column), roll back if the API fails
    setApps((list) => [{ ...app, stage }, ...list.filter((a) => a._id !== app._id)]);
    try {
      const res = await api(`/applications/${app._id}/stage`, { method: 'PATCH', body: { stage } });
      const next = before.map((a) => (a._id === app._id ? res.data : a));
      setApps([res.data, ...next.filter((a) => a._id !== app._id)]);
      if (gain) {
        const id = crypto.randomUUID();
        setFloats((f) => [...f, { id, stage, gain }]);
        setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1400);
      }
      const levelAfter = computeProgress(next).level;
      if (levelBefore && levelAfter > levelBefore) { setLevelUp(levelAfter); celebrate(); }
      else if (stage === 'Offer') celebrate();
      toast(stage === 'Offer' ? `Offer from ${app.company}. +${gain} XP` : stage === 'Rejected' ? `${app.company} moved to Rejected. Your XP and badges stay.` : gain ? `${app.company} cleared to ${stage}. +${gain} XP` : `${app.company} moved to ${stage}`);
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
          <h1 className="display text-4xl text-ink sm:text-5xl">Board</h1>
          <p className="mt-2 text-sm text-slate-600">
            <span className="hidden sm:inline">Drag a card to the next round when you clear it. Every round you clear earns XP.</span>
            <span className="sm:hidden">Tap ⌄ on a card to move it. Every round you clear earns XP.</span>
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

      {progress && <GameBar progress={progress} onBadges={() => setBadgesOpen(true)} />}

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
            const dropGain = draggingId && dragApp.current ? xpForMove(dragApp.current, stage) : 0; // XP waiting in this column while dragging
            return (
              <section key={stage} {...columnHandlers(stage)} aria-label={`${stage} column, ${items.length} application${items.length === 1 ? "" : "s"}`}
                className={`flex w-[17rem] shrink-0 snap-start flex-col rounded-2xl border p-2.5 transition-all duration-200 ${
                  isOver ? 'border-ink/40 bg-lime/25 ring-4 ring-lime/40' : dropGain ? 'border-lime bg-lime/10' : stage === 'Offer' ? 'border-emerald-200 bg-emerald-50/60' : stage === 'Rejected' ? 'border-slate-200/70 bg-slate-100/40 opacity-90' : 'border-[#e8e2cf] bg-sand/50'}`}>
                <header className="relative px-1.5 pb-3 pt-1">
                  <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${stage === 'Offer' ? 'text-emerald-800' : 'text-slate-400'}`}>{ROUND_NO[stage]}</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    {stage === 'Offer' ? <Icon name="trophy" className="size-4 text-emerald-700" /> : <span className={`size-2 rounded-full ${s.dot}`} aria-hidden="true" />}
                    <h2 className="text-sm font-bold text-ink">{stage}</h2>
                    <motion.span key={apps ? items.length : 'x'} initial={{ scale: 0.7 }} animate={{ scale: 1 }}
                      className="rounded-full bg-white px-2 text-xs font-semibold text-slate-500 tabular-nums ring-1 ring-slate-200">{apps ? items.length : '·'}</motion.span>
                    {STAGE_XP[stage] && stage !== 'Applied' && (
                      <span className={`ml-auto rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${dropGain ? 'bg-lime text-ink' : 'bg-white/70 text-slate-500'}`}>+{STAGE_XP[stage]} XP</span>
                    )}
                  </div>
                  <AnimatePresence>
                    {floats.filter((f) => f.stage === stage).map((f) => (
                      <motion.span key={f.id} className="pointer-events-none absolute right-2 top-0 z-10 rounded-lg bg-lime px-2 py-1 font-display text-sm text-ink shadow-[2px_2px_0_0_var(--color-ink)]"
                        initial={{ opacity: 0, y: 10, scale: 0.6 }} animate={{ opacity: 1, y: -26, scale: 1 }} exit={{ opacity: 0, y: -48 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 18 }}>+{f.gain} XP</motion.span>
                    ))}
                  </AnimatePresence>
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
                      {isOver ? (dropGain ? `Drop for +${dropGain} XP` : 'Drop here') : dropGain ? `+${dropGain} XP waiting` : search ? 'No matches' : stage === 'Offer' ? 'Your first offer goes here' : 'No applications'}
                    </div>
                  )}
                  {isOver && items.length > 0 && (
                    <div className="rounded-xl border-2 border-dashed border-ink/30 py-2 text-center text-xs font-bold text-ink" aria-hidden="true">{dropGain ? `Drop for +${dropGain} XP` : 'Drop here'}</div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
        </LayoutGroup>
      </div>

      <BadgesModal open={badgesOpen} onClose={() => setBadgesOpen(false)} earned={progress?.earned || new Set()} />
      <LevelUp level={levelUp} onDone={clearLevelUp} />
      <BadgeUnlocks items={unlocks} onDismiss={dismissUnlock} />
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
