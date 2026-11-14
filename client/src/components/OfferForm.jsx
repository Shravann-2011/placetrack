import { useState } from 'react';
import { api, ApiError } from '../lib/api';
import { toDateInput } from '../lib/format';
import { useToast } from '../context/ToastContext';
import { Field, Modal, Spinner } from './ui';

const NUM = ['fixedLpa', 'variableLpa', 'joiningBonus', 'bondMonths', 'bondPenalty'];

export function OfferFormModal({ application, onClose, onSaved }) {
  return (
    <Modal open={Boolean(application)} onClose={onClose} size="max-w-xl" title="Offer details"
      description={application ? `${application.company} · ${application.role}` : ''}>
      {application && <OfferForm key={application._id} app={application} onClose={onClose} onSaved={onSaved} />}
    </Modal>
  );
}

function OfferForm({ app, onClose, onSaved }) {
  const o = app.offer || {};
  const [v, setV] = useState({
    fixedLpa: o.fixedLpa ?? (app.ctc ?? ''), variableLpa: o.variableLpa ?? '', joiningBonus: o.joiningBonus ?? '',
    bondMonths: o.bondMonths ?? '', bondPenalty: o.bondPenalty ?? '', location: o.location ?? app.location ?? '',
    joiningDate: toDateInput(o.joiningDate), acceptBy: toDateInput(o.acceptBy), notes: o.notes ?? '',
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const bind = (k, extra = {}) => ({ value: v[k], onChange: (e) => setV((x) => ({ ...x, [k]: e.target.value })), className: `input ${errors[`offer.${k}`] ? 'input-error' : ''}`, ...extra });
  const err = (k) => errors[`offer.${k}`];

  const save = async (e) => {
    e.preventDefault();
    const offer = { location: v.location.trim(), notes: v.notes.trim(), joiningDate: v.joiningDate || null, acceptBy: v.acceptBy || null };
    for (const k of NUM) offer[k] = v[k] === '' ? null : Number(v[k]);
    setBusy(true); setErrors({});
    try {
      const res = await api(`/applications/${app._id}`, { method: 'PATCH', body: { offer } });
      toast('Offer details saved'); onSaved(res.data); onClose();
    } catch (er) {
      if (er instanceof ApiError && er.details.length) setErrors(er.fieldErrors); else toast(er.message, 'error');
    } finally { setBusy(false); }
  };

  const num = { type: 'number', min: 0, inputMode: 'decimal' };
  return (
    <form onSubmit={save} noValidate>
      <div className="grid gap-5 px-6 py-5 sm:grid-cols-2">
        <Field label="Fixed pay (₹ LPA)" error={err('fixedLpa')} hint="Base salary per year"><input {...bind('fixedLpa', { ...num, step: 0.1 })} placeholder="e.g. 7.5" /></Field>
        <Field label="Variable pay (₹ LPA)" error={err('variableLpa')} hint="Performance bonus, not guaranteed"><input {...bind('variableLpa', { ...num, step: 0.1 })} placeholder="e.g. 1" /></Field>
        <Field label="Joining bonus (₹)" error={err('joiningBonus')} hint="One-time"><input {...bind('joiningBonus', { ...num, step: 1000 })} placeholder="e.g. 50000" /></Field>
        <Field label="Location" error={err('location')}><input {...bind('location')} placeholder="e.g. Bengaluru" /></Field>
        <Field label="Bond (months)" error={err('bondMonths')} hint="0 if there is no bond"><input {...bind('bondMonths', { ...num, step: 1 })} placeholder="e.g. 24" /></Field>
        <Field label="Bond penalty (₹)" error={err('bondPenalty')} hint="Payable if you leave early"><input {...bind('bondPenalty', { ...num, step: 10000 })} placeholder="e.g. 200000" /></Field>
        <Field label="Joining date" error={err('joiningDate')}><input type="date" {...bind('joiningDate')} /></Field>
        <Field label="Accept by" error={err('acceptBy')} hint="Deadline to accept the offer"><input type="date" {...bind('acceptBy')} /></Field>
        <Field label="Notes" className="sm:col-span-2"><textarea rows={2} {...bind('notes')} placeholder="Team, tech stack, what seniors said…" /></Field>
      </div>
      <div className="flex justify-end gap-3 border-t border-slate-100 bg-cream/90 px-6 py-4 sm:rounded-b-2xl">
        <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn-primary" disabled={busy}>{busy && <Spinner className="size-4" />}Save offer</button>
      </div>
    </form>
  );
}
