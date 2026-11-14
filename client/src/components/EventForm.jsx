import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { EVENT_MODES, EVENT_TYPES, DEADLINE_TYPES, PREP_TEMPLATES } from '../lib/constants';
import { dayKey, eventTitle, fmtDay, timeLabel } from '../lib/calendar';
import { useToast } from '../context/ToastContext';
import { Field, Modal, Spinner } from './ui';
import { Icon } from './Icon';

const pad = (n) => String(n).padStart(2, '0');
const timeOf = (d) => `${pad(new Date(d).getHours())}:${pad(new Date(d).getMinutes())}`;
const combine = (date, time) => new Date(`${date}T${time || '00:00'}`).toISOString(); // local time -> ISO

function toForm(ev, defaults) {
  if (ev?._id) {
    return {
      application: ev.application?._id || ev.application, type: ev.type, title: ev.title || '',
      date: dayKey(ev.start), startTime: timeOf(ev.start), endTime: timeOf(ev.end),
      allDay: Boolean(ev.allDay), mode: ev.mode || 'Online', location: ev.location || '', notes: ev.notes || '', done: Boolean(ev.done),
      checklist: (ev.checklist || []).map((c) => ({ text: c.text, done: Boolean(c.done) })), debrief: ev.debrief || '',
    };
  }
  return {
    application: defaults?.application || '', type: defaults?.type || 'Online assessment', title: '',
    date: defaults?.date || dayKey(new Date()), startTime: '10:00', endTime: '11:00',
    allDay: false, mode: 'Online', location: '', notes: '', done: false, checklist: [], debrief: '',
  };
}

// Prep checklist editor: tick items, add your own, or tap a suggestion for this round type
function Checklist({ items, type, onChange }) {
  const [draft, setDraft] = useState('');
  const add = (text) => {
    const t = text.trim();
    if (!t || items.some((i) => i.text.toLowerCase() === t.toLowerCase()) || items.length >= 30) return;
    onChange([...items, { text: t, done: false }]);
  };
  const suggestions = (PREP_TEMPLATES[type] || []).filter((t) => !items.some((i) => i.text === t));
  const doneCount = items.filter((i) => i.done).length;
  return (
    <div className="sm:col-span-2">
      <div className="mb-2 flex items-center justify-between">
        <span className="label mb-0">Prep checklist</span>
        {items.length > 0 && <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${doneCount === items.length ? 'bg-lime text-ink' : 'bg-sand text-slate-700'}`}>{doneCount}/{items.length} ready</span>}
      </div>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-2 rounded-lg bg-sand/60 px-2.5 py-1.5">
            <input type="checkbox" className="size-4 accent-ink" checked={it.done} aria-label={it.text}
              onChange={() => onChange(items.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))} />
            <span className={`flex-1 text-sm ${it.done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{it.text}</span>
            <button type="button" className="text-slate-400 hover:text-rose-600" aria-label={`Remove ${it.text}`} onClick={() => onChange(items.filter((_, j) => j !== i))}><Icon name="x" className="size-3.5" /></button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-2">
        <input className="input" value={draft} placeholder="Add a prep item…" maxLength={200}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(draft); setDraft(''); } }} />
        <button type="button" className="btn-secondary" onClick={() => { add(draft); setDraft(''); }}>Add</button>
      </div>
      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="py-1 text-xs text-slate-500">Suggestions:</span>
          {suggestions.map((t) => (
            <button key={t} type="button" onClick={() => add(t)} className="rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-ink hover:bg-lime/40 hover:text-ink">+ {t}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export function EventFormModal({ open, onClose, event, defaults, onSaved }) {
  const isEdit = Boolean(event?._id);
  return (
    <Modal open={open} onClose={onClose} size="max-w-xl" title={isEdit ? 'Edit event' : 'Add to calendar'}
      description={isEdit ? eventTitle(event) : 'An OA, interview, GD or deadline for one of your applications.'}>
      <EventForm key={event?._id || defaults?.date || 'new'} event={event} defaults={defaults} isEdit={isEdit} onClose={onClose} onSaved={onSaved} />
    </Modal>
  );
}

function EventForm({ event, defaults, isEdit, onClose, onSaved }) {
  const [v, setV] = useState(() => toForm(event, defaults));
  const [apps, setApps] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [clashes, setClashes] = useState(null); // shown after saving, if any
  const toast = useToast();
  const isDeadline = DEADLINE_TYPES.includes(v.type);

  useEffect(() => {
    api('/applications', { query: { limit: 100, sort: 'company' } }).then((r) => setApps(r.data)).catch(() => setApps([]));
  }, []);

  const bind = (name) => ({ value: v[name], onChange: (e) => setV((x) => ({ ...x, [name]: e.target.value })), className: `input ${errors[name] ? 'input-error' : ''}` });

  const submit = async (e) => {
    e.preventDefault();
    if (!v.application) return setErrors({ application: 'Pick the application this belongs to' });
    setBusy(true); setErrors({});
    const body = {
      type: v.type, title: v.title.trim() || undefined, mode: v.mode, location: v.location.trim() || undefined,
      notes: v.notes.trim() || undefined, allDay: v.allDay, done: v.done,
      checklist: v.checklist, debrief: v.debrief.trim() || undefined,
      start: combine(v.date, v.allDay ? '00:00' : v.startTime),
      end: isDeadline ? undefined : combine(v.date, v.allDay ? '23:59' : v.endTime),
    };
    if (isDeadline) body.end = body.start;
    try {
      const res = isEdit
        ? await api(`/events/${event._id}`, { method: 'PATCH', body })
        : await api('/events', { method: 'POST', body: { ...body, application: v.application } });
      onSaved?.(res.data);
      if (res.clashes?.length) { setClashes(res.clashes); toast('Saved, but it clashes with another event', 'error'); }
      else { toast(isEdit ? 'Event updated' : 'Added to your calendar'); onClose(); }
    } catch (err) {
      if (err instanceof ApiError && err.details.length) setErrors(err.fieldErrors);
      else toast(err.message, 'error');
    } finally { setBusy(false); }
  };

  const remove = async () => {
    setBusy(true);
    try { await api(`/events/${event._id}`, { method: 'DELETE' }); toast('Event deleted'); onSaved?.(null); onClose(); }
    catch (err) { toast(err.message, 'error'); setBusy(false); }
  };

  if (clashes) {
    return (
      <div className="px-6 py-5">
        <div className="flex gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-600/20">
          <Icon name="alert" className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-semibold">Saved, but this overlaps with:</p>
            <ul className="mt-2 space-y-1">
              {clashes.map((c) => <li key={c._id}><strong>{eventTitle(c)}</strong> · {fmtDay(c.start)} · {timeLabel(c)}</li>)}
            </ul>
            <p className="mt-2 text-amber-800">Ask the placement cell or the company to move one of them, or pick the one that matters more.</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end"><button className="btn-primary" onClick={onClose}>Got it</button></div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="grid gap-5 px-6 py-5 sm:grid-cols-2">
        <Field label="Application *" error={errors.application} className="sm:col-span-2">
          <select {...bind('application')} disabled={isEdit || !apps}>
            <option value="">{apps ? 'Choose a company…' : 'Loading…'}</option>
            {apps?.map((a) => <option key={a._id} value={a._id}>{a.company} · {a.role}</option>)}
          </select>
        </Field>
        <Field label="Type" error={errors.type}>
          <select {...bind('type')}>{EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
        </Field>
        <Field label="Date" error={errors.start}>
          <input type="date" {...bind('date')} />
        </Field>
        {!v.allDay && (
          isDeadline ? (
            <Field label="Due at" hint="Deadlines are a single moment">
              <input type="time" {...bind('startTime')} />
            </Field>
          ) : (
            <>
              <Field label="Starts"><input type="time" {...bind('startTime')} /></Field>
              <Field label="Ends" error={errors.end}><input type="time" {...bind('endTime')} /></Field>
            </>
          )
        )}
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-slate-700">
          <input type="checkbox" className="size-4 accent-ink" checked={v.allDay} onChange={(e) => setV((x) => ({ ...x, allDay: e.target.checked }))} />
          All day
        </label>
        <Field label="Mode">
          <select {...bind('mode')}>{EVENT_MODES.map((m) => <option key={m}>{m}</option>)}</select>
        </Field>
        <Field label={v.mode === 'Online' ? 'Meeting link or platform' : 'Venue'} error={errors.location}>
          <input {...bind('location')} placeholder={v.mode === 'Online' ? 'e.g. HackerRank, Teams link' : 'e.g. Seminar Hall 2'} />
        </Field>
        <Field label="Title (optional)" hint="Defaults to company + type" className="sm:col-span-2">
          <input {...bind('title')} placeholder="e.g. Zoho round 2: system design" />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <textarea rows={2} {...bind('notes')} placeholder="Dress code, contact person, anything else…" />
        </Field>
        <Checklist items={v.checklist} type={v.type} onChange={(checklist) => setV((x) => ({ ...x, checklist }))} />
        <Field label="What was asked (fill in after the round)" className="sm:col-span-2" hint="Useful for your next interview, and for juniors">
          <textarea rows={3} {...bind('debrief')} placeholder="Questions asked, topics covered, how it went…" />
        </Field>
        {isEdit && (
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
            <input type="checkbox" className="size-4 accent-ink" checked={v.done} onChange={(e) => setV((x) => ({ ...x, done: e.target.checked }))} />
            Done (it happened or no longer needs attention)
          </label>
        )}
      </div>
      <div className="sticky bottom-0 flex items-center gap-3 border-t border-slate-100 bg-cream/90 px-6 py-4 backdrop-blur sm:rounded-b-2xl">
        {isEdit && <button type="button" onClick={remove} disabled={busy} className="btn-ghost text-rose-600 hover:bg-rose-50"><Icon name="trash" /> Delete</button>}
        <span className="flex-1" />
        <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn-primary" disabled={busy}>{busy && <Spinner className="size-4" />}{isEdit ? 'Save' : 'Add event'}</button>
      </div>
    </form>
  );
}
