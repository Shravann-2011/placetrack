// Hand-built charts (plain HTML + Tailwind, no chart library).
// Rules followed: one series per chart in the brand colour, bars <= 24px thick with a
// 4px rounded data-end and square baseline, hairline grid, a hover/focus tooltip on
// every mark, and a table view so no value is only available on hover.
import { useState } from 'react';
import { STAGE_STYLES } from '../lib/constants';

export function ChartCard({ title, subtitle, table, children, action }) {
  const [view, setView] = useState('chart');
  return (
    <section className="card flex flex-col p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {action}
          {table && (
            <div className="inline-flex rounded-md bg-slate-100 p-0.5 text-xs font-medium" role="tablist" aria-label={`${title} view`}>
              {['chart', 'table'].map((v) => (
                <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}
                  className={`rounded px-2 py-1 capitalize transition ${view === v ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}>
                  {v}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex-1">{view === 'chart' ? children : <DataTable {...table} />}</div>
    </section>
  );
}

function DataTable({ columns, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>{columns.map((c, i) => <th key={c} className={`pb-2 font-medium ${i ? 'text-right' : ''}`}>{c}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r[0]}>{r.map((cell, i) => <td key={i} className={`py-2 ${i ? 'text-right tabular-nums text-slate-700' : 'text-slate-900'}`}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Tooltip shown when its parent `group/mark` is hovered or focused
function Tip({ value, label, className = '' }) {
  return (
    <div role="tooltip" className={`pointer-events-none absolute z-10 hidden whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg group-hover/mark:block group-focus-visible/mark:block ${className}`}>
      <span className="font-semibold">{value}</span>
      <span className="ml-1.5 text-slate-300">{label}</span>
    </div>
  );
}

const pct = (n) => `${Math.round(n * 100)}%`;

// Horizontal funnel: how many applications reached each round
export function FunnelChart({ data }) {
  const max = data[0]?.count || 1;
  return (
    <ul className="space-y-3">
      {data.map((d, i) => {
        const prev = i ? data[i - 1].count : null;
        const conversion = prev ? d.count / prev : null;
        return (
          <li key={d.stage} tabIndex={0} aria-label={`${d.stage}: ${d.count} applications${conversion !== null ? `, ${pct(conversion)} of previous round` : ''}`}
            className="group/mark relative grid grid-cols-[6.5rem_1fr_3rem] items-center gap-3 rounded-md outline-offset-4 sm:grid-cols-[7.5rem_1fr_3.5rem]">
            <span className="flex items-center gap-2 truncate text-sm text-slate-700">
              <span className={`size-2 shrink-0 rounded-full ${STAGE_STYLES[d.stage].dot}`} aria-hidden="true" />
              {d.stage}
            </span>
            <div className="flex items-center gap-2">
              {/* Width is a share of the row minus room for the label, and flex-none stops
                  the label from squeezing the bar (which made 12 look shorter than 9) */}
              <div className="h-5 flex-none rounded-r bg-brand-600 transition-colors group-hover/mark:bg-brand-700"
                style={{ width: d.count ? `max(calc((100% - 2.5rem) * ${d.count / max}), 3px)` : 0 }} />
              <span className="text-sm font-semibold text-slate-900 tabular-nums">{d.count}</span>
            </div>
            <span className="text-right text-xs text-slate-500 tabular-nums">{conversion === null ? '' : pct(conversion)}</span>
            <Tip value={d.count} label={conversion === null ? 'applications' : `reached ${d.stage} · ${pct(conversion)} of previous round`} className="-top-8 left-28" />
          </li>
        );
      })}
    </ul>
  );
}

// Round the axis up to a clean number with 4 gridlines
function niceScale(max) {
  if (max <= 4) return { top: 4, step: 1 };
  const step = Math.ceil(max / 4 / (max > 20 ? 5 : 1)) * (max > 20 ? 5 : 1);
  return { top: step * 4, step };
}

// Vertical columns: applications per week
export function WeeklyChart({ data }) {
  const { top, step } = niceScale(Math.max(...data.map((d) => d.count)));
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step).reverse();
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const label = (d) => { const x = new Date(d); return `${x.getDate()} ${MONTHS[x.getMonth()]}`; };
  return (
    <div className="flex gap-3">
      <div className="flex h-44 flex-col justify-between pb-6 text-right text-xs text-slate-400 tabular-nums" aria-hidden="true">
        {ticks.map((t) => <span key={t} className="-translate-y-1/2 leading-none first:translate-y-0 last:translate-y-0">{t}</span>)}
      </div>
      <div className="relative flex-1">
        <div className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between" aria-hidden="true">
          {ticks.map((t) => <div key={t} className="h-px bg-slate-200/80" />)}
        </div>
        <div className="relative flex h-44 items-end">
          {data.map((d, i) => {
            const isCurrent = i === data.length - 1;
            return (
              <div key={d.weekStart} tabIndex={0} aria-label={`Week of ${label(d.weekStart)}: ${d.count} applications`}
                className="group/mark relative flex h-full flex-1 flex-col items-center justify-end outline-offset-2">
                <div className="flex w-full flex-1 items-end justify-center pb-px">
                  <div className={`w-full max-w-6 rounded-t transition-colors ${isCurrent ? 'bg-brand-600' : 'bg-brand-500/70'} group-hover/mark:bg-brand-700`}
                    style={{ height: `${(d.count / top) * 100}%` }} />
                </div>
                {/* Label every other week (counting back from this week) so labels never collide */}
                <span className={`h-6 whitespace-nowrap pt-1.5 text-[11px] leading-none ${isCurrent ? 'font-semibold text-slate-700' : 'text-slate-400'}`}>
                  {isCurrent ? 'This wk' : (data.length - 1 - i) % 2 === 0 ? label(d.weekStart) : ''}
                </span>
                <Tip value={d.count} label={`applied · week of ${label(d.weekStart)}`} className="bottom-full mb-1 left-1/2 -translate-x-1/2" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Meter rows: % of applications from each source that got any reply
export function SourceChart({ data }) {
  return (
    <ul className="space-y-4">
      {data.map((d) => (
        <li key={d.source} tabIndex={0} aria-label={`${d.source}: ${pct(d.rate)} response rate, ${d.responded} of ${d.total}`}
          className="group/mark relative rounded-md outline-offset-4">
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="text-slate-700">{d.source}</span>
            <span><span className="font-semibold text-slate-900 tabular-nums">{pct(d.rate)}</span>
              <span className="ml-1.5 text-xs text-slate-500 tabular-nums">{d.responded} of {d.total}</span></span>
          </div>
          <div className="h-2 rounded-full bg-brand-100">
            <div className="h-2 rounded-full bg-brand-600 transition-colors group-hover/mark:bg-brand-700" style={{ width: `${d.rate * 100}%` }} />
          </div>
          <Tip value={pct(d.rate)} label={`replied · ${d.offers} offer${d.offers === 1 ? '' : 's'}`} className="-top-8 right-0" />
        </li>
      ))}
    </ul>
  );
}
