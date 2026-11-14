import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { api } from '../lib/api';
import { daysUntil, formatDate } from '../lib/format';
import { useToast } from '../context/ToastContext';
import { Icon } from '../components/Icon';
import { CompanyAvatar, EmptyState, Spinner } from '../components/ui';
import { OfferFormModal } from '../components/OfferForm';

const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const lpa = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })} LPA`;
const total = (o = {}) => (o.fixedLpa != null || o.variableLpa != null ? (o.fixedLpa || 0) + (o.variableLpa || 0) : null);

// Rows of the comparison. `best` picks the winning value among offers that have one.
const ROWS = [
  { key: 'total', label: 'Total CTC', get: (o) => total(o), fmt: lpa, best: 'max', strong: true },
  { key: 'fixed', label: 'Fixed pay', get: (o) => o.fixedLpa, fmt: lpa, best: 'max', hint: 'Guaranteed every year' },
  { key: 'variable', label: 'Variable pay', get: (o) => o.variableLpa, fmt: lpa },
  { key: 'bonus', label: 'Joining bonus', get: (o) => o.joiningBonus, fmt: inr, best: 'max' },
  { key: 'bond', label: 'Bond', get: (o) => o.bondMonths, fmt: (n, o) => (n === 0 ? 'No bond' : `${n} months${o.bondPenalty ? ` · ${inr(o.bondPenalty)} penalty` : ''}`), best: 'min' },
  { key: 'location', label: 'Location', get: (o) => o.location || null, fmt: (s) => s },
  { key: 'joining', label: 'Joining date', get: (o) => o.joiningDate, fmt: (d) => formatDate(d) },
  { key: 'accept', label: 'Accept by', get: (o) => o.acceptBy, fmt: (d) => d, accept: true },
  { key: 'notes', label: 'Notes', get: (o) => o.notes || null, fmt: (s) => s, wrap: true },
];

function AcceptBy({ date }) {
  const d = daysUntil(date);
  const tone = d < 0 ? 'text-slate-400' : d <= 3 ? 'bg-rose-100 text-rose-800' : d <= 7 ? 'bg-amber-100 text-amber-900' : 'bg-sand text-slate-700';
  const text = d < 0 ? 'Passed' : d === 0 ? 'Today!' : d === 1 ? 'Tomorrow' : `in ${d} days`;
  return (
    <div>
      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${tone}`}>{text}</span>
      <div className="mt-0.5 text-xs text-slate-500">{formatDate(date)}</div>
    </div>
  );
}

export default function OffersPage() {
  const [offers, setOffers] = useState(null);
  const [editing, setEditing] = useState(null);
  const toast = useToast();

  useEffect(() => {
    api('/applications', { query: { stage: 'Offer', limit: 100, sort: '-updatedAt' } })
      .then((r) => setOffers(r.data)).catch((e) => { setOffers([]); toast(e.message, 'error'); });
  }, [toast]);

  // For each row, which offer ids hold the best value (only when 2+ offers have a value)
  const winners = useMemo(() => {
    const out = {};
    for (const row of ROWS.filter((r) => r.best)) {
      const vals = (offers || []).map((a) => [a._id, row.get(a.offer || {})]).filter(([, v]) => v != null);
      if (vals.length < 2) continue;
      const target = row.best === 'max' ? Math.max(...vals.map(([, v]) => v)) : Math.min(...vals.map(([, v]) => v));
      out[row.key] = new Set(vals.filter(([, v]) => v === target).map(([id]) => id));
    }
    return out;
  }, [offers]);

  const addDeadline = async (a) => {
    try {
      const d = new Date(a.offer.acceptBy); d.setHours(17, 0, 0, 0); // 5 pm on the day
      await api('/events', { method: 'POST', body: { application: a._id, type: 'Offer deadline', start: d.toISOString(), notes: 'Accept or decline the offer' } });
      toast(`${a.company}'s accept-by date is on your calendar`);
    } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="display text-4xl text-ink sm:text-5xl">Offers</h1>
          <p className="mt-2 text-sm text-slate-600">Compare pay, bonds, location and deadlines side by side. The best value in each row is highlighted.</p>
        </div>
      </div>

      {offers === null ? (
        <div className="card mt-6 grid h-64 place-items-center text-brand-600"><Spinner className="size-6" /></div>
      ) : offers.length === 0 ? (
        <div className="card mt-6">
          <EmptyState icon="sparkles" title="No offers yet" action={<Link to="/board" className="btn-primary">Go to the board</Link>}>
            When you move an application to Offer, it appears here so you can compare it with your other offers.
          </EmptyState>
        </div>
      ) : (
        <>
          {offers.length === 1 && (
            <p className="mt-6 rounded-xl bg-lime/40 px-4 py-3 text-sm font-medium text-ink ring-1 ring-ink/10">
              🎉 One offer so far. Fill in its details now, so it's ready to compare when the next one comes in.
            </p>
          )}
          <div className="card mt-6 overflow-x-auto">
            <table className="w-full min-w-[560px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 w-40 bg-white p-4" />
                  {offers.map((a, i) => (
                    <th key={a._id} className="min-w-52 border-l border-[#efe9d8] p-4 text-left align-top font-normal">
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                        <div className="flex items-center gap-3">
                          <CompanyAvatar name={a.company} />
                          <div className="min-w-0">
                            <p className="truncate font-bold text-ink">{a.company}</p>
                            <p className="truncate text-xs text-slate-500">{a.role}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <button className="btn-secondary px-2.5 py-1 text-xs" onClick={() => setEditing(a)}><Icon name="edit" className="size-3.5" /> {a.offer?.fixedLpa != null ? 'Edit details' : 'Add details'}</button>
                          {a.offer?.acceptBy && <button className="btn-ghost px-2 py-1 text-xs" onClick={() => addDeadline(a)} title="Add the accept-by date to your calendar"><Icon name="calendar" className="size-3.5" /> Add deadline</button>}
                        </div>
                      </motion.div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.key}>
                    <th scope="row" className="sticky left-0 z-10 border-t border-[#efe9d8] bg-white p-4 text-left align-top">
                      <span className={`text-xs font-bold uppercase tracking-wide ${row.strong ? 'text-ink' : 'text-slate-500'}`}>{row.label}</span>
                      {row.hint && <span className="block text-[11px] font-normal text-slate-400">{row.hint}</span>}
                    </th>
                    {offers.map((a) => {
                      const o = a.offer || {};
                      const val = row.get(o);
                      const best = winners[row.key]?.has(a._id);
                      return (
                        <td key={a._id} className={`border-l border-t border-[#efe9d8] p-4 align-top ${best ? 'bg-lime/35' : ''}`}>
                          {val == null ? <span className="text-slate-300">—</span>
                            : row.accept ? <AcceptBy date={val} />
                            : <span className={`${row.strong ? 'display text-xl text-ink' : 'text-slate-800'} ${row.wrap ? 'block whitespace-pre-wrap text-xs' : ''}`}>{row.fmt(val, o)}</span>}
                          {best && <span className="ml-1.5 inline-flex items-center gap-0.5 align-middle text-[11px] font-bold text-ink"><Icon name="check" className="size-3" />Best</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500">Total CTC = fixed + variable. Variable pay usually depends on performance, so compare fixed pay too. A long bond with a high penalty limits your options early in your career.</p>
        </>
      )}

      <OfferFormModal application={editing} onClose={() => setEditing(null)} onSaved={(upd) => setOffers((list) => list.map((x) => (x._id === upd._id ? upd : x)))} />
    </div>
  );
}
