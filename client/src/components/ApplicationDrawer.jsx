import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { celebrate } from '../lib/confetti';
import { api } from '../lib/api';
import { STAGE_STYLES } from '../lib/constants';
import { describeDue, formatCtc, formatDate } from '../lib/format';
import { useToast } from '../context/ToastContext';
import { Icon } from './Icon';
import { CompanyAvatar } from './ui';
import { StageSelect } from './StageSelect';

function Fact({ icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500"><Icon name={icon} /></div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <div className="truncate text-sm font-medium text-slate-900">{children}</div>
      </div>
    </div>
  );
}

function Timeline({ history }) {
  // Newest first; the most recent entry is the current stage
  const items = [...(history || [])].reverse();
  return (
    <ol className="relative space-y-5 pl-6">
      <span className="absolute left-[5px] top-2 bottom-2 w-px bg-slate-200" aria-hidden="true" />
      {items.map((h, i) => (
        <motion.li key={`${h.stage}-${h.changedAt}`} className="relative" layout
          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.06 }}>
          <span className={`absolute -left-6 top-1 size-[11px] rounded-full ring-4 ring-white ${STAGE_STYLES[h.stage]?.dot || 'bg-slate-400'}`} />
          <p className={`text-sm ${i === 0 ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
            {h.stage}{i === 0 && <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">Current</span>}
          </p>
          <p className="text-xs text-slate-500">
            {new Date(h.changedAt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </motion.li>
      ))}
    </ol>
  );
}

// Slide-over panel with everything about one application.
// AnimatePresence keeps the panel on screen while it slides out after closing.
export function ApplicationDrawer(props) {
  return (
    <AnimatePresence>
      {props.application && <DrawerPanel key={props.application._id} {...props} />}
    </AnimatePresence>
  );
}

function DrawerPanel({ application, onClose, onEdit, onDelete, onChanged }) {
  const [app, setApp] = useState(application);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  const due = describeDue(app.dueDate);

  const changeStage = async (stage) => {
    setBusy(true);
    try {
      const res = await api(`/applications/${app._id}/stage`, { method: 'PATCH', body: { stage } });
      setApp(res.data); // includes the new timeline entry
      onChanged?.(res.data);
      if (stage === 'Offer') celebrate();
      toast(stage === 'Offer' ? `🎉 Offer from ${app.company}! Congratulations!` : `${app.company} moved to ${stage}`);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      <motion.div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[1px]" onClick={onClose}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl"
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%', transition: { duration: 0.2, ease: 'easeIn' } }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}>
        {/* Header */}
        <div className="relative border-b border-slate-100 bg-gradient-to-b from-brand-50/70 to-white px-6 pt-6 pb-5">
          <button onClick={onClose} className="btn-ghost absolute right-4 top-4 p-1.5" aria-label="Close"><Icon name="x" className="size-5" /></button>
          <CompanyAvatar name={app.company} size="size-12" />
          <h2 id="drawer-title" className="mt-4 pr-8 text-xl font-bold tracking-tight text-slate-900">{app.company}</h2>
          <p className="text-sm text-slate-600">{app.role}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <StageSelect value={app.stage} onChange={changeStage} disabled={busy} />
            <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">{app.type}</span>
          </div>
        </div>

        <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
          {due && (
            <div className={`flex items-center gap-3 rounded-xl p-4 ${due.urgency === 'urgent' ? 'bg-rose-50 text-rose-800' : due.urgency === 'soon' ? 'bg-amber-50 text-amber-900' : 'bg-slate-50 text-slate-700'}`}>
              <Icon name="calendar" className="size-5 shrink-0" />
              <div className="text-sm"><span className="font-semibold">Next deadline {due.text.toLowerCase()}</span> · {formatDate(app.dueDate)}</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-5">
            <Fact icon="rupee" label={app.type === 'Internship' ? 'Stipend' : 'CTC'}>{formatCtc(app.ctc, app.type)}</Fact>
            <Fact icon="target" label="Source">{app.source}</Fact>
            <Fact icon="mapPin" label="Location">{app.location || '—'}</Fact>
            <Fact icon="calendar" label="Applied">{formatDate(app.appliedDate)}</Fact>
          </div>

          {app.jobLink && (
            <a href={app.jobLink} target="_blank" rel="noopener noreferrer" className="btn-secondary w-full">
              <Icon name="external" /> Open job posting
            </a>
          )}

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</h3>
            {app.notes
              ? <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">{app.notes}</p>
              : <button onClick={() => onEdit(app)} className="w-full rounded-xl border border-dashed border-slate-300 p-4 text-left text-sm text-slate-500 transition hover:border-brand-300 hover:text-brand-700">+ Add notes: interview topics, contacts, follow-ups</button>}
          </section>

          <section>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Timeline</h3>
            <Timeline history={app.stageHistory} />
          </section>
        </div>

        <div className="flex gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
          <button className="btn-secondary flex-1" onClick={() => onEdit(app)}><Icon name="edit" /> Edit</button>
          <button className="btn-secondary text-rose-600 hover:bg-rose-50" onClick={() => onDelete(app)} aria-label={`Delete ${app.company}`}><Icon name="trash" /></button>
        </div>
      </motion.aside>
    </div>
  );
}
