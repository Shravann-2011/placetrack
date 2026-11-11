import { useEffect } from 'react';
import { STAGE_STYLES } from '../lib/constants';
import { initials } from '../lib/format';
import { Icon } from './Icon';

export function StageBadge({ stage, className = '' }) {
  const s = STAGE_STYLES[stage] || STAGE_STYLES.Applied;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${s.badge} ${className}`}>
      <span className={`size-1.5 rounded-full ${s.dot}`} />
      {stage}
    </span>
  );
}

// Coloured initials tile; the colour is derived from the name so it's stable
const AVATAR_COLORS = ['bg-indigo-100 text-indigo-700', 'bg-sky-100 text-sky-700', 'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-800', 'bg-rose-100 text-rose-700', 'bg-violet-100 text-violet-700', 'bg-teal-100 text-teal-700'];
export function CompanyAvatar({ name, size = 'size-9' }) {
  const hash = [...(name || '')].reduce((h, c) => h + c.charCodeAt(0), 0);
  return (
    <div className={`${size} grid shrink-0 place-items-center rounded-lg text-xs font-bold ${AVATAR_COLORS[hash % AVATAR_COLORS.length]}`}>
      {initials(name)}
    </div>
  );
}

export function Spinner({ className = 'size-5' }) {
  return <span className={`${className} inline-block animate-spin rounded-full border-2 border-current border-r-transparent`} role="status" aria-label="Loading" />;
}

export function EmptyState({ icon = 'inbox', title, children, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-600">
        <Icon name={icon} className="size-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {children && <p className="mt-1 max-w-sm text-sm text-slate-500">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, description, children, size = 'max-w-lg' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="animate-fade-in absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`animate-pop-in relative flex max-h-[92vh] w-full ${size} flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl`}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 id="modal-title" className="text-lg font-semibold text-slate-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          <button onClick={onClose} className="btn-ghost -mr-2 p-1.5" aria-label="Close">
            <Icon name="x" className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Delete', busy }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="max-w-md">
      <div className="px-6 py-5 text-sm text-slate-600">{message}</div>
      <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4 sm:rounded-b-2xl">
        <button className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn-danger" onClick={onConfirm} disabled={busy}>
          {busy && <Spinner className="size-4" />} {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export function Pagination({ page, totalPages, total, limit, onChange }) {
  if (!total) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return (
    <div className="flex items-center justify-between gap-4 border-t border-slate-100 px-4 py-3 sm:px-6">
      <p className="text-sm text-slate-500">
        Showing <span className="font-medium text-slate-900">{from}–{to}</span> of{' '}
        <span className="font-medium text-slate-900">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button className="btn-secondary px-2.5" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <Icon name="chevronLeft" />
        </button>
        <span className="px-2 text-sm text-slate-600 tabular-nums">{page} / {totalPages}</span>
        <button className="btn-secondary px-2.5" onClick={() => onChange(page + 1)} disabled={page >= totalPages} aria-label="Next page">
          <Icon name="chevronRight" />
        </button>
      </div>
    </div>
  );
}

export function Field({ label, error, hint, children, className = '' }) {
  // Wrapping in <label> links the text to the input for screen readers and clicks
  return (
    <label className={`block ${className}`}>
      {label && <span className="label">{label}</span>}
      {children}
      {error ? <span className="mt-1 block text-xs font-medium text-rose-600">{error}</span>
        : hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}
