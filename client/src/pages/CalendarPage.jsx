import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { api } from '../lib/api';
import { EVENT_STYLES, EVENT_TYPES } from '../lib/constants';
import {
  addDays, buildIcs, dayKey, downloadFile, eventTitle, findClashIds, fmtDay, fmtMonth, googleCalendarUrl,
  isDeadline, monthGrid, sameDay, startOfDay, startOfWeek, timeLabel,
} from '../lib/calendar';
import { onApplicationsChanged } from '../lib/events';
import { useToast } from '../context/ToastContext';
import { Icon } from '../components/Icon';
import { EmptyState, Spinner } from '../components/ui';
import { EventFormModal } from '../components/EventForm';
import { ExplainedButton } from '../components/Explainers';
import { PasteModal } from '../components/PasteModal';

const VIEWS = [
  { id: 'month', label: 'Month', icon: 'grid' },
  { id: 'week', label: 'Week', icon: 'columns' },
  { id: 'agenda', label: 'Agenda', icon: 'list' },
];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const style = (e) => EVENT_STYLES[e.type] || EVENT_STYLES.Other;

function rangeFor(view, cursor) {
  if (view === 'month') { const g = monthGrid(cursor); return [g[0], addDays(g[41], 1)]; }
  if (view === 'week') { const s = startOfWeek(cursor); return [s, addDays(s, 7)]; }
  const s = startOfDay(new Date()); return [s, addDays(s, 45)];
}

// Applications' "next deadline" field shows on the calendar too (read-only)
const dueItems = (apps, from, to) => apps
  .filter((a) => a.dueDate && new Date(a.dueDate) >= from && new Date(a.dueDate) < to && !['Offer', 'Rejected'].includes(a.stage))
  .map((a) => ({ _id: `due-${a._id}`, kind: 'due', type: 'Application deadline', start: a.dueDate, end: a.dueDate, allDay: true, application: a }));

function EventCard({ e, clash, onEdit, onToggleDone, compact }) {
  const s = style(e);
  return (
    <motion.article layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className={`group relative flex gap-3 rounded-xl border bg-white p-3 pl-4 transition hover:shadow-md ${clash ? 'border-amber-400' : 'border-[#e8e2cf]'} ${e.done ? 'opacity-55' : ''}`}>
      <span className={`absolute inset-y-2 left-1.5 w-1 rounded-full ${s.bar}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className={`rounded-full px-2 py-0.5 font-semibold ring-1 ring-inset ${s.chip}`}>{compact ? s.short : e.type}</span>
          <span className="font-semibold text-slate-700 tabular-nums">{timeLabel(e)}</span>
          {clash && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-900"><Icon name="alert" className="size-3" /> Clash</span>}
          {e.checklist?.length > 0 && (() => {
            const ready = e.checklist.filter((c) => c.done).length;
            return <span className={`rounded-full px-2 py-0.5 font-semibold ${ready === e.checklist.length ? 'bg-lime text-ink' : 'bg-sand text-slate-700'}`}>{ready}/{e.checklist.length} ready</span>;
          })()}
        </div>
        <p className={`mt-1.5 truncate font-semibold text-ink ${e.done ? 'line-through' : ''}`}>{e.application?.company}{e.title ? ` · ${e.title}` : ''}</p>
        {!compact && (
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {e.application?.role}{e.mode && e.kind !== 'due' ? ` · ${e.mode}` : ''}{e.location ? ` · ${e.location}` : ''}
          </p>
        )}
        {!compact && e.notes && <p className="mt-1.5 line-clamp-2 text-xs text-slate-600">{e.notes}</p>}
      </div>
      {e.kind !== 'due' && (
        <div className="flex shrink-0 flex-col items-end gap-1">
          <button onClick={() => onToggleDone(e)} title={e.done ? 'Mark as not done' : 'Mark as done'} aria-label={e.done ? `Mark ${eventTitle(e)} as not done` : `Mark ${eventTitle(e)} as done`}
            className={`grid size-7 place-items-center rounded-full ring-1 transition ${e.done ? 'bg-ink text-lime ring-ink' : 'text-slate-400 ring-slate-300 hover:text-ink hover:ring-ink'}`}>
            <Icon name="check" className="size-3.5" />
          </button>
          {!compact && (
            <div className="flex gap-0.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              <a href={googleCalendarUrl(e)} target="_blank" rel="noopener noreferrer" className="btn-ghost p-1.5" title="Add to Google Calendar" aria-label="Add to Google Calendar"><Icon name="google" /></a>
              <button onClick={() => onEdit(e)} className="btn-ghost p-1.5" title="Edit" aria-label={`Edit ${eventTitle(e)}`}><Icon name="edit" /></button>
            </div>
          )}
        </div>
      )}
    </motion.article>
  );
}

function DayPanel({ day, events, clashIds, onAdd, onEdit, onToggleDone }) {
  const today = sameDay(day, new Date());
  return (
    <div className="card p-4 lg:sticky lg:top-6">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{today ? 'Today' : fmtDay(day, { weekday: 'long' })}</p>
          <p className="display text-2xl text-ink">{fmtDay(day, { day: 'numeric', month: 'long' })}</p>
        </div>
        <button className="btn-lime px-3" onClick={() => onAdd(day)}><Icon name="plus" /> Add</button>
      </div>
      {events.length === 0
        ? <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Nothing scheduled. A free day for prep!</p>
        : <div className="space-y-2">{events.map((e) => <EventCard key={e._id} e={e} clash={clashIds.has(e._id)} onEdit={onEdit} onToggleDone={onToggleDone} />)}</div>}
    </div>
  );
}

export default function CalendarPage() {
  const [view, setView] = useState(() => (window.innerWidth < 640 ? 'agenda' : 'month'));
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [selected, setSelected] = useState(() => startOfDay(new Date()));
  const [events, setEvents] = useState(null);
  const [apps, setApps] = useState([]);
  const [hidden, setHidden] = useState(() => new Set()); // event types filtered out
  const [editing, setEditing] = useState(null); // { event } or { defaults }
  const [reloadKey, setReloadKey] = useState(0);
  const [pasting, setPasting] = useState(false);
  const toast = useToast();
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  const [from, to] = useMemo(() => rangeFor(view, cursor), [view, cursor]);

  useEffect(() => onApplicationsChanged(reload), [reload]);
  useEffect(() => { api('/applications', { query: { limit: 100 } }).then((r) => setApps(r.data)).catch(() => {}); }, [reloadKey]);
  useEffect(() => {
    let ignore = false;
    setEvents(null);
    api('/events', { query: { from: from.toISOString(), to: to.toISOString() } })
      .then((r) => !ignore && setEvents(r.data))
      .catch((err) => { if (!ignore) { setEvents([]); toast(err.message, 'error'); } });
    return () => { ignore = true; };
  }, [from, to, reloadKey, toast]);

  // Real events + application deadlines, skipping a deadline when that company already
  // has a real event on the same day (it would just repeat it)
  const all = useMemo(() => {
    const real = events || [];
    const taken = new Set(real.map((e) => `${e.application?._id}|${dayKey(e.start)}`));
    const due = dueItems(apps, from, to).filter((d) => !taken.has(`${d.application._id}|${dayKey(d.start)}`));
    return [...real, ...due].sort((a, b) => new Date(a.start) - new Date(b.start));
  }, [events, apps, from, to]);
  const visible = useMemo(() => all.filter((e) => !hidden.has(e.type)), [all, hidden]);
  const clashIds = useMemo(() => findClashIds(all), [all]);
  const byDay = useMemo(() => visible.reduce((m, e) => { (m[dayKey(e.start)] ||= []).push(e); return m; }, {}), [visible]);

  // Next up: the next real event (OA, interview...) that hasn't ended; fall back to an application deadline
  const nextUp = useMemo(() => {
    const now = new Date();
    return all.find((e) => e.kind !== 'due' && !e.done && new Date(isDeadline(e) ? e.start : e.end) > now)
      || all.find((e) => e.kind === 'due' && addDays(startOfDay(e.start), 1) > now);
  }, [all]);
  const clashCount = useMemo(() => all.filter((e) => clashIds.has(e._id) && new Date(e.start) > new Date()).length, [all, clashIds]);

  const move = (dir) => setCursor((c) => view === 'month' ? new Date(c.getFullYear(), c.getMonth() + dir, 1) : addDays(c, 7 * dir));
  const goToday = () => { setCursor(startOfDay(new Date())); setSelected(startOfDay(new Date())); };
  const toggleType = (t) => setHidden((h) => { const n = new Set(h); n.has(t) ? n.delete(t) : n.add(t); return n; });

  const toggleDone = async (e) => {
    setEvents((list) => list.map((x) => (x._id === e._id ? { ...x, done: !e.done } : x)));
    try { await api(`/events/${e._id}`, { method: 'PATCH', body: { done: !e.done } }); if (!e.done) toast(`${eventTitle(e)} done`); }
    catch (err) { reload(); toast(err.message, 'error'); }
  };

  const exportIcs = async () => {
    const start = startOfDay(new Date());
    const r = await api('/events', { query: { from: start.toISOString(), to: addDays(start, 90).toISOString() } });
    const list = r.data.filter((e) => !e.done);
    if (!list.length) return toast('No upcoming events to export', 'error');
    downloadFile('placetrack-calendar.ics', buildIcs(list));
    toast(`Exported ${list.length} events with 1-hour reminders`);
  };

  const label = view === 'month' ? fmtMonth(cursor) : view === 'week'
    ? `${fmtDay(from, { day: 'numeric', month: 'short' })} – ${fmtDay(addDays(to, -1), { day: 'numeric', month: 'short', year: 'numeric' })}`
    : 'Next 45 days';
  const selectedEvents = byDay[dayKey(selected)] || [];
  const openAdd = (day) => setEditing({ defaults: { date: dayKey(day || selected) } });

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="display text-4xl text-ink sm:text-5xl">Calendar</h1>
          <p className="mt-2 text-sm text-slate-600">Every OA, GD, interview and deadline in one place.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={exportIcs} title="Download an .ics file for Google, Apple or Outlook Calendar">
            <Icon name="download" /> <span className="hidden sm:inline">Export to calendar app</span><span className="sm:hidden">Export</span>
          </button>
          <ExplainedButton kind="paste" className="btn-lime" onClick={() => setPasting(true)}><Icon name="paste" /> <span className="hidden sm:inline">Paste a message</span><span className="sm:hidden">Paste</span></ExplainedButton>
          <button className="btn-primary" onClick={() => openAdd()}><Icon name="plus" /> <span className="hidden sm:inline">Add event</span><span className="sm:hidden">Add</span></button>
        </div>
      </div>

      {/* At a glance */}
      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-2xl bg-ink p-4 text-cream">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-lime text-ink"><Icon name="clock" className="size-5" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-lime">Next up</p>
            {nextUp
              ? <>
                  <p className="truncate font-semibold">{nextUp.application?.company} · {nextUp.type}</p>
                  <p className="text-sm text-cream/70">{sameDay(nextUp.start, new Date()) ? 'Today' : fmtDay(nextUp.start)}, {timeLabel(nextUp)}</p>
                </>
              : <p className="text-cream/70">Nothing coming up in this view.</p>}
          </div>
        </div>
        <div className={`flex items-center gap-4 rounded-2xl p-4 ring-1 ${clashCount ? 'bg-amber-50 text-amber-900 ring-amber-500/30' : 'bg-white text-slate-700 ring-[#e8e2cf]'}`}>
          <div className={`grid size-11 shrink-0 place-items-center rounded-xl ${clashCount ? 'bg-amber-400 text-ink' : 'bg-brand-50 text-brand-600'}`}><Icon name={clashCount ? 'alert' : 'checkCircle'} className="size-5" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider">{clashCount ? 'Clashes ahead' : 'No clashes'}</p>
            <p className="font-semibold">{clashCount ? `${clashCount} events overlap. Look for the ⚠ badge.` : 'None of your upcoming events overlap.'}</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-sand p-1" role="tablist" aria-label="Calendar view">
            {VIEWS.map((v) => (
              <button key={v.id} role="tab" aria-selected={view === v.id} onClick={() => setView(v.id)}
                className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${view === v.id ? 'text-lime' : 'text-slate-600 hover:text-ink'}`}>
                {view === v.id && <motion.span layoutId="cal-view" className="absolute inset-0 rounded-lg bg-ink" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
                <Icon name={v.icon} className="relative size-4" /><span className="relative">{v.label}</span>
              </button>
            ))}
          </div>
          {view !== 'agenda' && (
            <div className="flex items-center gap-1">
              <button className="btn-secondary px-2.5" onClick={() => move(-1)} aria-label="Previous"><Icon name="chevronLeft" /></button>
              <button className="btn-secondary px-3" onClick={goToday}>Today</button>
              <button className="btn-secondary px-2.5" onClick={() => move(1)} aria-label="Next"><Icon name="chevronRight" /></button>
            </div>
          )}
          <h2 className="ml-1 hidden text-lg font-bold text-ink sm:block">{label}</h2>
        </div>
        {/* Legend that doubles as a filter */}
        <div className="flex flex-wrap gap-1.5" aria-label="Show or hide event types">
          {EVENT_TYPES.filter((t) => t !== 'Other').map((t) => (
            <button key={t} onClick={() => toggleType(t)} aria-pressed={!hidden.has(t)}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset transition ${hidden.has(t) ? 'bg-transparent text-slate-400 ring-slate-300 line-through' : style({ type: t }).chip}`}>
              <span className={`size-1.5 rounded-full ${style({ type: t }).dot}`} />{EVENT_STYLES[t].short}
            </button>
          ))}
        </div>
      </div>
      <h2 className="mt-3 text-lg font-bold text-ink sm:hidden">{label}</h2>

      {events === null ? (
        <div className="card mt-4 grid h-80 place-items-center text-brand-600"><Spinner className="size-6" /></div>
      ) : view === 'month' ? (
        <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="card overflow-hidden">
            <div className="grid grid-cols-7 border-b border-[#e8e2cf] bg-sand/60 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {WEEKDAYS.map((d) => <div key={d} className="py-2">{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {monthGrid(cursor).map((d) => {
                const list = byDay[dayKey(d)] || [];
                const inMonth = d.getMonth() === cursor.getMonth();
                const isToday = sameDay(d, new Date());
                const isSel = sameDay(d, selected);
                const hasClash = list.some((e) => clashIds.has(e._id));
                return (
                  <button key={d.toISOString()} onClick={() => setSelected(d)} onDoubleClick={() => openAdd(d)}
                    aria-label={`${fmtDay(d, { weekday: 'long', day: 'numeric', month: 'long' })}, ${list.length} event${list.length === 1 ? '' : 's'}`}
                    className={`relative min-h-16 border-b border-r border-[#efe9d8] p-1.5 text-left align-top transition sm:min-h-28 ${inMonth ? 'bg-white' : 'bg-sand/40 text-slate-400'} ${isSel ? 'ring-2 ring-inset ring-ink' : 'hover:bg-brand-50/60'}`}>
                    <span className={`inline-grid size-6 place-items-center rounded-full text-xs font-bold tabular-nums ${isToday ? 'bg-lime text-ink' : ''}`}>{d.getDate()}</span>
                    {hasClash && <Icon name="alert" className="absolute right-1.5 top-1.5 size-3.5 text-amber-500" />}
                    {/* Phone: dots. Larger screens: chips */}
                    <div className="mt-1 flex flex-wrap gap-0.5 sm:hidden">{list.slice(0, 4).map((e) => <span key={e._id} className={`size-1.5 rounded-full ${style(e).dot}`} />)}</div>
                    <div className="mt-1 hidden space-y-0.5 sm:block">
                      {list.slice(0, 3).map((e) => (
                        <div key={e._id} className={`truncate rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${style(e).chip} ${e.done ? 'opacity-50 line-through' : ''}`}>
                          {!isDeadline(e) && !e.allDay && <span className="font-normal tabular-nums">{new Date(e.start).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }).replace(' ', '')} </span>}
                          {e.application?.company}
                        </div>
                      ))}
                      {list.length > 3 && <div className="px-1.5 text-[11px] font-semibold text-slate-500">+{list.length - 3} more</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <DayPanel day={selected} events={selectedEvents} clashIds={clashIds} onAdd={openAdd} onEdit={(e) => setEditing({ event: e })} onToggleDone={toggleDone} />
        </div>
      ) : view === 'week' ? (
        <div className="mt-4 grid gap-3 md:grid-cols-7">
          {Array.from({ length: 7 }, (_, i) => addDays(from, i)).map((d) => {
            const list = byDay[dayKey(d)] || [];
            const isToday = sameDay(d, new Date());
            return (
              <section key={d.toISOString()} className={`rounded-2xl p-2 ${isToday ? 'bg-lime/40 ring-2 ring-ink' : 'bg-sand/60'}`}>
                <header className="flex items-center justify-between px-1 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">{fmtDay(d, { weekday: 'short' })}</span>
                  <span className="display text-xl text-ink">{d.getDate()}</span>
                </header>
                <div className="space-y-2">
                  {list.map((e) => <EventCard key={e._id} e={e} compact clash={clashIds.has(e._id)} onEdit={(x) => setEditing({ event: x })} onToggleDone={toggleDone} />)}
                  <button onClick={() => openAdd(d)} className="w-full rounded-xl border border-dashed border-slate-300 py-2 text-xs font-semibold text-slate-500 transition hover:border-ink hover:text-ink">+ Add</button>
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 space-y-6">
          {Object.keys(byDay).length === 0 && (
            <div className="card"><EmptyState icon="calendar" title="Nothing in the next 45 days" action={<button className="btn-primary" onClick={() => openAdd()}><Icon name="plus" /> Add an event</button>}>
              Add your OAs, interviews and registration deadlines to see them here.
            </EmptyState></div>
          )}
          <AnimatePresence initial={false}>
            {Object.entries(byDay).map(([key, list]) => {
              const d = new Date(`${key}T00:00`);
              const today = sameDay(d, new Date());
              return (
                <motion.section key={key} layout className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[120px_minmax(0,1fr)]">
                  <div className="flex items-baseline gap-2 sm:block">
                    <p className={`display text-3xl ${today ? 'text-ink' : 'text-slate-800'}`}>{d.getDate()}</p>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{today ? 'Today' : fmtDay(d, { weekday: 'long', month: 'short' })}</p>
                  </div>
                  <div className="space-y-2">{list.map((e) => <EventCard key={e._id} e={e} clash={clashIds.has(e._id)} onEdit={(x) => setEditing({ event: x })} onToggleDone={toggleDone} />)}</div>
                </motion.section>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <PasteModal open={pasting} onClose={() => setPasting(false)} onAdded={reload} />
      <EventFormModal open={editing !== null} event={editing?.event} defaults={editing?.defaults} onClose={() => setEditing(null)} onSaved={reload} />
    </div>
  );
}
