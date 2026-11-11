const DAY = 24 * 60 * 60 * 1000;

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// For <input type="date">: "2026-11-20"
export function toDateInput(value) {
  if (!value) return '';
  const d = new Date(value);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function daysUntil(value) {
  if (!value) return null;
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const target = new Date(value); target.setHours(0, 0, 0, 0);
  return Math.round((target - start) / DAY);
}

// "Today", "Tomorrow", "in 5 days", "3 days ago" + an urgency level for colouring
export function describeDue(value) {
  const days = daysUntil(value);
  if (days === null) return null;
  const text =
    days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : days === -1 ? 'Yesterday'
    : days > 0 ? `in ${days} days` : `${-days} days ago`;
  const urgency = days < 0 ? 'past' : days <= 2 ? 'urgent' : days <= 7 ? 'soon' : 'later';
  return { days, text, urgency };
}

export function formatCtc(ctc, type) {
  if (ctc === null || ctc === undefined) return '—';
  return type === 'Internship' ? `₹${ctc}k/mo` : `₹${ctc} LPA`;
}

export function initials(text = '') {
  return text.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
}
