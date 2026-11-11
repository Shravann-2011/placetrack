import { useState } from 'react';
import { api, ApiError } from '../lib/api';
import { JOB_TYPES, SOURCES, STAGES } from '../lib/constants';
import { toDateInput } from '../lib/format';
import { Field, Modal, Spinner } from './ui';
import { useToast } from '../context/ToastContext';

const EMPTY = {
  company: '', role: '', type: 'Full-time', stage: 'Applied', source: 'Campus', location: '',
  ctc: '', jobLink: '', appliedDate: toDateInput(new Date()), dueDate: '', notes: '',
};

function toForm(app) {
  if (!app?._id) return { ...EMPTY, appliedDate: toDateInput(new Date()) }; // new application
  return {
    ...EMPTY, ...app,
    ctc: app.ctc ?? '', location: app.location ?? '', jobLink: app.jobLink ?? '', notes: app.notes ?? '',
    appliedDate: toDateInput(app.appliedDate), dueDate: toDateInput(app.dueDate),
  };
}

// Converts form strings into what the API expects
function toPayload(v, isEdit) {
  const payload = {
    company: v.company, role: v.role, type: v.type, stage: v.stage, source: v.source,
    location: v.location, notes: v.notes, jobLink: v.jobLink.trim(),
    ctc: v.ctc === '' ? null : Number(v.ctc),
    dueDate: v.dueDate || null,
  };
  if (v.appliedDate) payload.appliedDate = v.appliedDate;
  if (!isEdit) {
    // On create, leave out empty optional fields entirely
    for (const k of ['location', 'notes', 'jobLink', 'ctc', 'dueDate']) {
      if (payload[k] === '' || payload[k] === null) delete payload[k];
    }
  }
  return payload;
}

export function ApplicationFormModal({ open, onClose, application, onSaved }) {
  const isEdit = Boolean(application?._id);
  return (
    <Modal open={open} onClose={onClose} size="max-w-2xl"
      title={isEdit ? 'Edit application' : 'Add application'}
      description={isEdit ? `${application.company} · ${application.role}` : 'Log a new company you’ve applied to.'}>
      {/* key resets the form whenever a different application is opened */}
      <ApplicationForm key={application?._id || 'new'} application={application} isEdit={isEdit} onClose={onClose} onSaved={onSaved} />
    </Modal>
  );
}

function ApplicationForm({ application, isEdit, onClose, onSaved }) {
  const [values, setValues] = useState(() => toForm(application));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const bind = (name) => ({
    value: values[name],
    onChange: (e) => setValues((v) => ({ ...v, [name]: e.target.value })),
    className: `input ${errors[name] ? 'input-error' : ''}`,
  });

  const onSubmit = async (e) => {
    e.preventDefault();
    const clientErrors = {};
    if (!values.company.trim()) clientErrors.company = 'Company is required';
    if (!values.role.trim()) clientErrors.role = 'Role is required';
    if (Object.keys(clientErrors).length) return setErrors(clientErrors);

    setBusy(true); setErrors({});
    try {
      const body = toPayload(values, isEdit);
      const res = isEdit
        ? await api(`/applications/${application._id}`, { method: 'PATCH', body })
        : await api('/applications', { method: 'POST', body });
      toast(isEdit ? 'Application updated' : `${res.data.company} added`);
      onSaved(res.data);
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.details.length) setErrors(err.fieldErrors);
      else toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="grid gap-5 px-6 py-5 sm:grid-cols-2">
        <Field label="Company *" error={errors.company}>
          <input {...bind('company')} placeholder="e.g. Infosys" autoFocus />
        </Field>
        <Field label="Role *" error={errors.role}>
          <input {...bind('role')} placeholder="e.g. Systems Engineer" />
        </Field>
        <Field label="Stage" error={errors.stage}>
          <select {...bind('stage')}>{STAGES.map((s) => <option key={s}>{s}</option>)}</select>
        </Field>
        <Field label="Type" error={errors.type}>
          <select {...bind('type')}>{JOB_TYPES.map((s) => <option key={s}>{s}</option>)}</select>
        </Field>
        <Field label="Source" error={errors.source}>
          <select {...bind('source')}>{SOURCES.map((s) => <option key={s}>{s}</option>)}</select>
        </Field>
        <Field label={values.type === 'Internship' ? 'Stipend (₹ thousand / month)' : 'CTC (LPA)'} error={errors.ctc}>
          <input {...bind('ctc')} type="number" min="0" step="0.1" inputMode="decimal" placeholder={values.type === 'Internship' ? 'e.g. 25' : 'e.g. 6.5'} />
        </Field>
        <Field label="Applied on" error={errors.appliedDate}>
          <input {...bind('appliedDate')} type="date" />
        </Field>
        <Field label="Next deadline" error={errors.dueDate} hint="OA, interview or form deadline">
          <input {...bind('dueDate')} type="date" />
        </Field>
        <Field label="Location" error={errors.location}>
          <input {...bind('location')} placeholder="e.g. Bengaluru / Remote" />
        </Field>
        <Field label="Job link" error={errors.jobLink}>
          <input {...bind('jobLink')} type="url" placeholder="https://" />
        </Field>
        <Field label="Notes" error={errors.notes} className="sm:col-span-2">
          <textarea {...bind('notes')} rows={3} placeholder="Interview topics, contacts, follow-ups…" />
        </Field>
      </div>
      <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-100 bg-slate-50/90 px-6 py-4 backdrop-blur sm:rounded-b-2xl">
        <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn-primary" disabled={busy}>
          {busy && <Spinner className="size-4" />} {isEdit ? 'Save changes' : 'Add application'}
        </button>
      </div>
    </form>
  );
}
