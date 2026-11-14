import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { EVENT_MODES, EVENT_TYPES, DEADLINE_TYPES } from '../lib/constants';
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
    };
  }
  return {
    application: defaults?.application || '', type: defaults?.type || 'Online assessment', title: '',
    date: defaults?.date || dayKey(new Date()), startTime: '10:00', endTime: '11:00',
    allDay: false, mode: 'Online', location: '', notes: '', done: false,
  };
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
          <textarea rows={3} {...bind('notes')} placeholder="Topics to revise, documents to carry, dress code…" />
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
