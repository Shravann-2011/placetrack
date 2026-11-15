import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { api, ApiError } from '../lib/api';
import { EVENT_MODES, EVENT_STYLES, EVENT_TYPES, JOB_TYPES, STAGES } from '../lib/constants';
import { dayKey, eventTitle, fmtDay, timeLabel } from '../lib/calendar';
import { useToast } from '../context/ToastContext';
import { Field, Modal, Spinner } from './ui';
import { Icon } from './Icon';

const EXAMPLE = `*🚨 Campus Drive Alert 🚨*
*Company:* Nimbus Analytics Pvt. Ltd.
*Role:* Associate Software Engineer
*CTC:* ₹ 6.5 LPA | *Location:* Bengaluru
*Eligibility:* CSE, ISE, ECE | 7 CGPA & above | No active backlogs

Register here 👉 forms.gle/nimbus-drive before 18/11/2026, 5 PM

*Online Assessment*
📅 Date: 20.11.2026
⏰ Time: 2:00 PM to 3:30 PM (HackerRank)

Shortlisted students: technical interview on 24 Nov, HR round on 25 Nov at 11 AM
📍 Venue: Seminar Hall, Block C`;

// Colour for each kind of highlighted text, matching the field it fills
const MARK = {
  company: 'bg-lime/70', role: 'bg-pink', ctc: 'bg-emerald-200', location: 'bg-teal-100',
  eligibility: 'bg-amber-100', link: 'bg-violet-200', date: 'bg-sky-200',
};
const LEGEND = [['company', 'Company'], ['role', 'Role'], ['ctc', 'Pay'], ['date', 'Dates'], ['link', 'Links'], ['eligibility', 'Eligibility']];

const pad = (n) => String(n).padStart(2, '0');
const timeOf = (iso) => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const toIso = (date, time) => new Date(`${date}T${time || '00:00'}`).toISOString();
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The pasted message with every recognised piece highlighted
function Highlighted({ text, matches }) {
  const parts = useMemo(() => {
    const ms = [...matches].filter((m) => m.text).sort((a, b) => b.text.length - a.text.length);
    if (!ms.length) return [{ text }];
    const re = new RegExp(`(${ms.map((m) => escapeRe(m.text)).join('|')})`, 'g');
    return text.split(re).map((t) => ({ text: t, field: ms.find((m) => m.text === t)?.field }));
  }, [text, matches]);
  return (
    <p className="whitespace-pre-wrap break-words rounded-xl bg-white p-4 text-sm leading-relaxed text-slate-700 ring-1 ring-[#e8e2cf]">
      {parts.map((p, i) => p.field ? <mark key={i} className={`rounded px-0.5 text-ink ${MARK[p.field]}`}>{p.text}</mark> : <span key={i}>{p.text}</span>)}
    </p>
  );
}

export function PasteModal({ open, onClose, onAdded }) {
  return (
    <Modal open={open} onClose={onClose} size="max-w-4xl" title="Paste a message" description="Paste a placement email or WhatsApp message. We'll read it and set everything up.">
      <PasteFlow key={open ? 'open' : 'closed'} onClose={onClose} onAdded={onAdded} />
    </Modal>
  );
}

function PasteFlow({ onClose, onAdded }) {
  const [step, setStep] = useState('paste'); // paste -> review -> done
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [app, setApp] = useState(null);
  const [events, setEvents] = useState([]);
  const [target, setTarget] = useState('new'); // 'new' or an existing application id
  const [moveStage, setMoveStage] = useState(true); // existing application: apply the stage the message implies
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const toast = useToast();

  const read = async () => {
    setBusy(true); setError('');
    try {
      const res = await api('/parse', { method: 'POST', body: { text, timezoneOffset: -new Date().getTimezoneOffset() } });
      const d = res.data;
      setResult(d);
      setApp({ ...d.application, ctc: d.application.ctc ?? '' });
      setEvents(d.events.map((e) => ({ ...e, include: e.include !== false, date: dayKey(e.start), time: timeOf(e.start), endTime: timeOf(e.end) })));
      setTarget(d.existing[0]?._id || 'new');
      setStep('review');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const targetApp = result?.existing.find((a) => a._id === target);

  // Adding to an application you already track: rounds it already has (same kind, same day) are
  // unticked and labelled, so pasting the same message twice doesn't add them again
  useEffect(() => {
    const booked = new Set((targetApp?.events || []).map((e) => `${e.type}|${dayKey(e.start)}`));
    setEvents((list) => list.map((e) => {
      const already = booked.has(`${e.type}|${e.date}`);
      if (already === Boolean(e.already)) return e;
      return { ...e, already, include: already ? false : !e.past };
    }));
  }, [targetApp]);
  const stageChange = Boolean(targetApp && result?.suggestedStage && result.suggestedStage !== targetApp.stage);

  const setEv = (i, patch) => setEvents((list) => list.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  const addRound = () => setEvents((list) => [...list, { type: 'Online assessment', include: true, date: dayKey(new Date()), time: '10:00', endTime: '11:00', allDay: false, snippet: 'Added by you' }]);

  const save = async () => {
    const chosen = events.filter((e) => e.include);
    if (target === 'new' && (!app.company.trim() || !app.role.trim())) return setError('Please fill in the company and role.');
    setBusy(true); setError('');
    try {
      let appId = target;
      let company = app.company;
      if (target === 'new') {
        const deadline = chosen.find((e) => e.type === 'Registration deadline') || chosen[0];
        const body = {
          company: app.company.trim(), role: app.role.trim(), type: app.type, source: 'Campus',
          ...(app.ctc !== '' && { ctc: Number(app.ctc) }), ...(app.location.trim() && { location: app.location.trim() }),
          ...(app.jobLink && { jobLink: app.jobLink }), ...(app.notes.trim() && { notes: app.notes.trim() }),
          ...(deadline && { dueDate: toIso(deadline.date, deadline.allDay ? '00:00' : deadline.time) }),
          ...(app.stage && app.stage !== 'Applied' && { stage: app.stage }),
          ...(app.stage === 'Offer' && app.offer && Object.keys(app.offer).length && { offer: app.offer }),
        };
        const created = await api('/applications', { method: 'POST', body });
        appId = created.data._id;
      } else {
        const existing = result.existing.find((a) => a._id === target);
        company = existing?.company || company;
        if (stageChange && moveStage) {
          await api(`/applications/${target}/stage`, { method: 'PATCH', body: { stage: result.suggestedStage } });
          if (result.suggestedStage === 'Offer' && app.offer && Object.keys(app.offer).length) {
            await api(`/applications/${target}`, { method: 'PATCH', body: { offer: app.offer } });
          }
        }
      }
      const clashes = [];
      for (const e of chosen) {
        const isDeadline = ['Registration deadline', 'Offer deadline'].includes(e.type);
        const start = toIso(e.date, e.allDay ? '00:00' : e.time);
        const end = isDeadline ? start : toIso(e.date, e.allDay ? '23:59' : e.endTime || e.time);
        const body = {
          application: appId, type: e.type, start, end, allDay: Boolean(e.allDay && !isDeadline),
          ...(e.title && { title: e.title }), ...(e.mode && !isDeadline && { mode: e.mode }), ...(e.location && !isDeadline && { location: e.location }),
        };
        const r = await api('/events', { method: 'POST', body });
        clashes.push(...(r.clashes || []));
      }
      setDone({ company, count: chosen.length, clashes, isNew: target === 'new', stage: target === 'new' ? app.stage : stageChange && moveStage ? result.suggestedStage : null });
      setStep('done');
      toast(`${company}: ${target === 'new' ? 'added' : 'updated'} with ${chosen.length} round${chosen.length === 1 ? '' : 's'}`);
      onAdded?.();
    } catch (err) {
      setError(err instanceof ApiError && err.details.length ? err.details.map((d) => d.message).join(' · ') : err.message);
    } finally { setBusy(false); }
  };

  if (step === 'paste') {
    return (
      <div className="px-6 py-5">
        <textarea className="input min-h-56 font-mono text-[13px] leading-relaxed" autoFocus value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Paste the message from your placement cell here…" maxLength={10000} aria-label="Placement message" />
        {error && <p className="mt-2 text-sm font-medium text-rose-600">{error}</p>}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button className="text-sm font-semibold text-ink underline decoration-lime decoration-2 underline-offset-4" onClick={() => setText(EXAMPLE)}>Try an example</button>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={read} disabled={busy || text.trim().length < 10}>{busy ? <Spinner className="size-4" /> : <Icon name="sparkles" />} Read message</button>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-500">We look for the company, role, pay, links and dates, and work out which round each date is for. You'll check everything before it's saved.</p>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="px-6 py-8 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-lime text-ink"><Icon name="check" className="size-7" strokeWidth={3} /></div>
        <h3 className="display mt-4 text-2xl text-ink">{done.company} is set up</h3>
        <p className="mt-1 text-sm text-slate-600">
          {done.isNew ? 'New application' : 'Existing application'}{done.stage && done.stage !== 'Applied' ? `, now at ${done.stage},` : ''} with {done.count} new round{done.count === 1 ? '' : 's'} on your calendar.
        </p>
        {done.clashes.length > 0 && (
          <div className="mx-auto mt-5 max-w-md rounded-xl bg-amber-50 p-4 text-left text-sm text-amber-900 ring-1 ring-amber-600/20">
            <p className="font-semibold">Heads up, this overlaps with:</p>
            <ul className="mt-1 list-disc pl-5">{done.clashes.map((c) => <li key={c._id}>{eventTitle(c)} · {fmtDay(c.start)} · {timeLabel(c)}</li>)}</ul>
          </div>
        )}
        <div className="mt-6 flex justify-center gap-2">
          <button className="btn-secondary" onClick={() => { setText(''); setStep('paste'); }}>Paste another</button>
          <Link to="/calendar" onClick={onClose} className="btn-primary"><Icon name="calendar" /> Open calendar</Link>
        </div>
      </div>
    );
  }

  // Review
  const bindApp = (k) => ({ value: app[k] ?? '', onChange: (e) => setApp((a) => ({ ...a, [k]: e.target.value })), className: 'input' });
  return (
    <div>
      <div className="grid gap-6 px-6 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* What we read */}
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">What we found in your message</p>
          <Highlighted text={text} matches={result.matches} />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {LEGEND.map(([k, label]) => <span key={k} className={`rounded px-1.5 py-0.5 text-[11px] font-semibold text-ink ${MARK[k]}`}>{label}</span>)}
          </div>
          {/* Company/role hints don't matter when adding to an application you already track */}
          {result.warnings.filter((w) => target === 'new' || !/company name|the role/.test(w)).length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-amber-800">{result.warnings.filter((w) => target === 'new' || !/company name|the role/.test(w)).map((w) => <li key={w} className="flex gap-1.5"><Icon name="alert" className="mt-0.5 size-3.5 shrink-0" />{w}</li>)}</ul>
          )}
        </div>

        {/* What will be created */}
        <div className="space-y-5">
          {result.existing.length > 0 && (
            <div className="rounded-xl bg-brand-50 p-3 text-sm ring-1 ring-brand-200">
              <p className="font-semibold text-ink">You already track {result.existing[0].company}.</p>
              <div className="mt-2 space-y-1">
                {result.existing.map((a) => (
                  <label key={a._id} className="flex items-start gap-2"><input type="radio" className="mt-1 accent-ink" checked={target === a._id} onChange={() => setTarget(a._id)} /><span>Add these rounds to <strong>{a.company} · {a.role}</strong> <span className="text-slate-500">({a.stage})</span></span></label>
                ))}
                <label className="flex items-start gap-2"><input type="radio" className="mt-1 accent-ink" checked={target === 'new'} onChange={() => setTarget('new')} /> Create a new application</label>
              </div>
              {stageChange && (
                <label className="mt-3 flex items-start gap-2 rounded-lg bg-white p-2.5 ring-1 ring-brand-200">
                  <input type="checkbox" className="mt-1 accent-ink" checked={moveStage} onChange={() => setMoveStage(!moveStage)} />
                  <span>Move it from <strong>{targetApp.stage}</strong> to <strong>{result.suggestedStage}</strong> <span className="text-slate-500">(this message sounds like {result.suggestedStage === 'Rejected' ? 'a rejection' : result.suggestedStage === 'Offer' ? 'an offer' : 'you were shortlisted'})</span></span>
                </label>
              )}
            </div>
          )}

          {target === 'new' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Company *"><input {...bindApp('company')} placeholder="e.g. Infosys" /></Field>
              <Field label="Role *"><input {...bindApp('role')} placeholder="e.g. Systems Engineer" /></Field>
              <Field label="Type"><select {...bindApp('type')}>{JOB_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
              <Field label="Stage" hint={result.suggestedStage ? 'Picked from the wording of the message' : undefined}><select {...bindApp('stage')}>{STAGES.map((t) => <option key={t}>{t}</option>)}</select></Field>
              <Field label={app.type === 'Internship' ? 'Stipend (₹ thousand/month)' : 'CTC (LPA)'}><input type="number" min="0" step="0.1" {...bindApp('ctc')} /></Field>
              <Field label="Location"><input {...bindApp('location')} /></Field>
              <Field label="Link"><input {...bindApp('jobLink')} placeholder="https://" /></Field>
              <Field label="Notes" className="sm:col-span-2"><input {...bindApp('notes')} /></Field>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Rounds to add ({events.filter((e) => e.include).length})</p>
              <button className="btn-ghost px-2 py-1 text-xs" onClick={addRound}><Icon name="plus" className="size-3.5" /> Add a round</button>
            </div>
            {events.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">No dates found. Add a round yourself, or save the application and add rounds later.</p>}
            <ul className="space-y-2">
              {events.map((e, i) => {
                const st = EVENT_STYLES[e.type] || EVENT_STYLES.Other;
                const isDeadline = ['Registration deadline', 'Offer deadline'].includes(e.type);
                return (
                  <li key={i} className={`rounded-xl border p-3 transition ${e.include ? 'border-[#e8e2cf] bg-white' : 'border-dashed border-slate-300 bg-transparent opacity-60'}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <input type="checkbox" className="size-4 accent-ink" checked={e.include} onChange={() => setEv(i, { include: !e.include })} aria-label="Include this round" />
                      <span className={`size-2.5 rounded-full ${st.dot}`} />
                      <select className="input w-auto py-1.5" value={e.type} onChange={(x) => setEv(i, { type: x.target.value })}>{EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
                      <input type="date" className="input w-auto py-1.5" value={e.date} onChange={(x) => setEv(i, { date: x.target.value })} />
                      {!e.allDay && <input type="time" className="input w-auto py-1.5" value={e.time} onChange={(x) => setEv(i, { time: x.target.value })} aria-label={isDeadline ? 'Due at' : 'Starts'} />}
                      {!e.allDay && !isDeadline && <><span className="text-xs text-slate-400">to</span><input type="time" className="input w-auto py-1.5" value={e.endTime} onChange={(x) => setEv(i, { endTime: x.target.value })} aria-label="Ends" /></>}
                      {!isDeadline && <label className="flex items-center gap-1 text-xs text-slate-600"><input type="checkbox" className="accent-ink" checked={Boolean(e.allDay)} onChange={() => setEv(i, { allDay: !e.allDay })} /> All day</label>}
                    </div>
                    {(e.title || e.past || e.already) && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5 pl-6 text-[11px] font-semibold">
                        {e.title && <span className="rounded bg-sand px-1.5 py-0.5 text-ink">{e.title}</span>}
                        {e.past && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">Already passed</span>}
                        {e.already && <span className="rounded bg-lime/60 px-1.5 py-0.5 text-ink">Already on your calendar</span>}
                      </div>
                    )}
                    {!isDeadline && e.include && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 pl-6">
                        <select className="input w-auto py-1 text-xs" value={e.mode || ''} onChange={(x) => setEv(i, { mode: x.target.value || undefined })} aria-label="Mode">
                          <option value="">Mode…</option>{EVENT_MODES.map((m) => <option key={m}>{m}</option>)}
                        </select>
                        <input className="input min-w-0 flex-1 py-1 text-xs" value={e.location || ''} onChange={(x) => setEv(i, { location: x.target.value })} placeholder="Venue or meeting link" aria-label="Venue" />
                      </div>
                    )}
                    {e.snippet && <p className="mt-1.5 truncate pl-6 text-xs text-slate-500">“{e.snippet}”</p>}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
      {error && <p className="px-6 pb-2 text-sm font-medium text-rose-600">{error}</p>}
      <div className="sticky bottom-0 flex items-center gap-3 border-t border-slate-100 bg-cream/90 px-6 py-4 backdrop-blur sm:rounded-b-2xl">
        <button className="btn-ghost" onClick={() => setStep('paste')}><Icon name="chevronLeft" /> Edit message</button>
        <span className="flex-1" />
        <button className="btn-primary" onClick={save} disabled={busy || (target !== 'new' && !events.some((e) => e.include) && !(stageChange && moveStage))}>
          {busy && <Spinner className="size-4" />} {target === 'new' ? 'Add to PlaceTrack' : 'Update application'}
        </button>
      </div>
    </div>
  );
}
