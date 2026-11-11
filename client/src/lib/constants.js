// Must match server/src/constants.js
export const STAGES = ['Applied', 'Aptitude/OA', 'GD', 'Technical', 'HR', 'Offer', 'Rejected'];
export const SOURCES = ['Campus', 'Referral', 'LinkedIn', 'Company Website', 'Job Portal', 'Other'];
export const JOB_TYPES = ['Internship', 'Full-time', 'Internship + Full-time'];

// One colour per stage, used everywhere (badges, board columns, charts)
export const STAGE_STYLES = {
  Applied: { badge: 'bg-slate-100 text-slate-700 ring-slate-500/20', dot: 'bg-slate-400', hex: '#94a3b8' },
  'Aptitude/OA': { badge: 'bg-sky-50 text-sky-700 ring-sky-600/20', dot: 'bg-sky-500', hex: '#0ea5e9' },
  GD: { badge: 'bg-violet-50 text-violet-700 ring-violet-600/20', dot: 'bg-violet-500', hex: '#8b5cf6' },
  Technical: { badge: 'bg-amber-50 text-amber-800 ring-amber-600/20', dot: 'bg-amber-500', hex: '#f59e0b' },
  HR: { badge: 'bg-orange-50 text-orange-700 ring-orange-600/20', dot: 'bg-orange-500', hex: '#f97316' },
  Offer: { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', dot: 'bg-emerald-500', hex: '#10b981' },
  Rejected: { badge: 'bg-rose-50 text-rose-700 ring-rose-600/20', dot: 'bg-rose-500', hex: '#f43f5e' },
};

export const SORT_OPTIONS = [
  { value: '-appliedDate', label: 'Newest applied' },
  { value: 'appliedDate', label: 'Oldest applied' },
  { value: '-updatedAt', label: 'Recently updated' },
  { value: 'company', label: 'Company A–Z' },
  { value: '-ctc', label: 'Highest CTC' },
];
