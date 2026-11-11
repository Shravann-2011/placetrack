import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { api } from '../lib/api';
import { JOB_TYPES, SORT_OPTIONS, SOURCES, STAGES } from '../lib/constants';
import { describeDue, formatCtc, formatDate } from '../lib/format';
import { useDebounce } from '../lib/useDebounce';
import { useToast } from '../context/ToastContext';
import { Icon } from '../components/Icon';
import { CompanyAvatar, ConfirmDialog, EmptyState, Pagination } from '../components/ui';
import { StageSelect } from '../components/StageSelect';
import { ApplicationFormModal } from '../components/ApplicationForm';
import { ApplicationDrawer } from '../components/ApplicationDrawer';

const LIMIT = 10;
const DUE_STYLES = { past: 'text-slate-400', urgent: 'text-rose-600 font-semibold', soon: 'text-amber-600 font-medium', later: 'text-slate-600' };

function DueCell({ date }) {
  const due = describeDue(date);
  if (!due) return <span className="text-slate-300">—</span>;
  return (
    <div className="leading-tight">
      <div className={`whitespace-nowrap text-sm ${DUE_STYLES[due.urgency]}`}>{due.text}</div>
      <div className="whitespace-nowrap text-xs text-slate-400">{formatDate(date)}</div>
    </div>
  );
}

function FilterSelect({ value, onChange, options, placeholder, label, active = Boolean(value) }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}
      className={`input w-full cursor-pointer py-2 pr-8 sm:w-auto ${active ? 'border-brand-300 bg-brand-50/60 text-brand-800' : 'text-slate-600'}`}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => typeof o === 'string'
        ? <option key={o} value={o}>{o}</option>
        : <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function RowActions({ app, onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-end gap-0.5">
      {app.jobLink && (
        <a href={app.jobLink} target="_blank" rel="noopener noreferrer" className="btn-ghost p-2" title="Open job posting" aria-label="Open job posting">
          <Icon name="link" />
        </a>
      )}
      <button className="btn-ghost p-2" onClick={() => onEdit(app)} title="Edit" aria-label={`Edit ${app.company}`}><Icon name="edit" /></button>
      <button className="btn-ghost p-2 hover:bg-rose-50 hover:text-rose-600" onClick={() => onDelete(app)} title="Delete" aria-label={`Delete ${app.company}`}><Icon name="trash" /></button>
    </div>
  );
}

function SkeletonRows() {
  return Array.from({ length: 5 }, (_, i) => (
    <div key={i} className="flex animate-pulse items-center gap-4 border-b border-slate-100 px-6 py-4 last:border-0">
      <div className="size-9 rounded-lg bg-slate-200" />
      <div className="flex-1 space-y-2"><div className="h-3 w-40 rounded bg-slate-200" /><div className="h-3 w-24 rounded bg-slate-100" /></div>
      <div className="hidden h-5 w-24 rounded-full bg-slate-100 sm:block" />
      <div className="hidden h-3 w-16 rounded bg-slate-100 md:block" />
    </div>
  ));
}

export default function ApplicationsPage() {
  // Filters live in the URL (?stage=GD&page=2) so refresh/back/share keep them
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page')) || 1;
  const stage = params.get('stage') || '';
  const source = params.get('source') || '';
  const type = params.get('type') || '';
  const sort = params.get('sort') || '-appliedDate';
  const [searchInput, setSearchInput] = useState(params.get('search') || '');
  const search = useDebounce(searchInput.trim());

  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, app = edit
  const [deleting, setDeleting] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [viewing, setViewing] = useState(null); // application shown in the side panel
  const searchRef = useRef(null);
  const toast = useToast();

  // Keyboard shortcuts: "/" focuses search, "n" adds an application
  useEffect(() => {
    const onKey = (e) => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
      if (typing || e.metaKey || e.ctrlKey || e.altKey || document.querySelector('[role=dialog]')) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key.toLowerCase() === 'n') { e.preventDefault(); setEditing({}); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const setParam = useCallback((key, value) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      value ? next.set(key, value) : next.delete(key);
      if (key !== 'page') next.delete('page'); // any filter change goes back to page 1
      return next;
    }, { replace: true });
  }, [setParams]);

  useEffect(() => { if (search !== (params.get('search') || '')) setParam('search', search); }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let ignore = false; // ignore late responses if filters changed meanwhile
    setError('');
    api('/applications', { query: { page, limit: LIMIT, search: params.get('search'), stage, source, type, sort } })
      .then((res) => {
        if (ignore) return;
        // Deleted the last item on a page? Step back a page.
        if (res.data.length === 0 && page > 1) setParam('page', String(page - 1));
        else setResult(res);
      })
      .catch((err) => !ignore && setError(err.message));
    return () => { ignore = true; };
  }, [params, page, stage, source, type, sort, reloadKey, setParam]);

  const reload = () => setReloadKey((k) => k + 1);
  const filtersActive = Boolean(params.get('search') || stage || source || type);

  const changeStage = async (app, newStage) => {
    const old = app.stage;
    setBusyId(app._id);
    // Optimistic update: show the change immediately, undo it if the API fails
    setResult((r) => ({ ...r, data: r.data.map((a) => (a._id === app._id ? { ...a, stage: newStage } : a)) }));
    try {
      await api(`/applications/${app._id}/stage`, { method: 'PATCH', body: { stage: newStage } });
      toast(`${app.company} moved to ${newStage}`);
    } catch (err) {
      setResult((r) => ({ ...r, data: r.data.map((a) => (a._id === app._id ? { ...a, stage: old } : a)) }));
      toast(err.message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    setBusyId(deleting._id);
    try {
      await api(`/applications/${deleting._id}`, { method: 'DELETE' });
      toast(`${deleting.company} deleted`);
      setDeleting(null);
      reload();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const clearFilters = () => { setSearchInput(''); setParams({}, { replace: true }); };
  const apps = result?.data || [];
  const total = result?.pagination.total;

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Applications</h1>
          <p className="mt-1 text-sm text-slate-500">
            {total === undefined ? 'Loading…' : filtersActive ? `${total} matching application${total === 1 ? '' : 's'}` : `${total} application${total === 1 ? '' : 's'} tracked`}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setEditing({})} title="Shortcut: N">
          <Icon name="plus" /> Add application
          <kbd className="ml-1 hidden rounded bg-white/20 px-1.5 py-0.5 font-sans text-[11px] font-medium sm:inline">N</kbd>
        </button>
      </div>

      {/* Toolbar */}
      <div className="mt-6 flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative min-w-0 flex-1">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input ref={searchRef} className="input pl-9 pr-10" placeholder="Search company or role…" value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && e.currentTarget.blur()} aria-label="Search applications" />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-slate-50 px-1.5 text-[11px] text-slate-400 sm:block">/</kbd>
        </div>
        <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap">
          <FilterSelect label="Filter by stage" value={stage} onChange={(v) => setParam('stage', v)} options={STAGES} placeholder="All stages" />
          <FilterSelect label="Filter by source" value={source} onChange={(v) => setParam('source', v)} options={SOURCES} placeholder="All sources" />
          <FilterSelect label="Filter by type" value={type} onChange={(v) => setParam('type', v)} options={JOB_TYPES} placeholder="All types" />
          <FilterSelect label="Sort" active={sort !== '-appliedDate'} value={sort} onChange={(v) => setParam('sort', v === '-appliedDate' ? '' : v)} options={SORT_OPTIONS} />
          {filtersActive && (
            <button className="btn-ghost text-brand-700" onClick={clearFilters}><Icon name="x" /> Clear</button>
          )}
        </div>
      </div>

      <div className="card mt-4 overflow-hidden">
        {error ? (
          <EmptyState icon="alert" title="Couldn’t load applications" action={<button className="btn-secondary" onClick={reload}>Try again</button>}>{error}</EmptyState>
        ) : !result ? (
          <SkeletonRows />
        ) : apps.length === 0 ? (
          filtersActive ? (
            <EmptyState icon="search" title="No matches" action={<button className="btn-secondary" onClick={clearFilters}>Clear filters</button>}>
              Nothing matches these filters. Try a different search or stage.
            </EmptyState>
          ) : (
            <EmptyState icon="briefcase" title="No applications yet" action={<button className="btn-primary" onClick={() => setEditing({})}><Icon name="plus" /> Add your first application</button>}>
              Add the companies you’ve applied to and track each round from aptitude test to offer.
            </EmptyState>
          )
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-medium">Company</th>
                  <th className="px-3 py-3 font-medium">Stage</th>
                  <th className="hidden px-3 py-3 font-medium xl:table-cell">Source</th>
                  <th className="px-3 py-3 font-medium">CTC</th>
                  <th className="hidden px-3 py-3 font-medium 2xl:table-cell">Applied</th>
                  <th className="px-3 py-3 font-medium">Deadline</th>
                  <th className="px-6 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {apps.map((app) => (
                  <tr key={app._id} className="group transition hover:bg-slate-50/70">
                    {/* w-full + max-w-0 lets this cell shrink and truncate long text instead of widening the table */}
                    <td className="w-full max-w-0 px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <CompanyAvatar name={app.company} />
                        <div className="min-w-0">
                          <button onClick={() => setViewing(app)} className="block max-w-full truncate font-semibold text-slate-900 hover:text-brand-700">{app.company}</button>
                          <div className="truncate text-xs text-slate-500">{app.role} · {app.type}{app.location ? ` · ${app.location}` : ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5"><StageSelect value={app.stage} disabled={busyId === app._id} onChange={(s) => changeStage(app, s)} /></td>
                    <td className="hidden whitespace-nowrap px-3 py-3.5 text-slate-600 xl:table-cell">{app.source}</td>
                    <td className="whitespace-nowrap px-3 py-3.5 tabular-nums text-slate-700">{formatCtc(app.ctc, app.type)}</td>
                    <td className="hidden whitespace-nowrap px-3 py-3.5 text-slate-600 2xl:table-cell">{formatDate(app.appliedDate)}</td>
                    <td className="px-3 py-3.5"><DueCell date={app.dueDate} /></td>
                    <td className="px-4 py-3.5"><RowActions app={app} onEdit={setEditing} onDelete={setDeleting} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {apps.map((app) => (
                <li key={app._id} className="p-4">
                  <div className="flex items-start gap-3">
                    <CompanyAvatar name={app.company} />
                    <div className="min-w-0 flex-1">
                      <button onClick={() => setViewing(app)} className="block truncate text-left font-semibold text-slate-900">{app.company}</button>
                      <p className="truncate text-xs text-slate-500">{app.role} · {app.type}</p>
                    </div>
                    <RowActions app={app} onEdit={setEditing} onDelete={setDeleting} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 pl-12 text-xs text-slate-500">
                    <StageSelect value={app.stage} disabled={busyId === app._id} onChange={(s) => changeStage(app, s)} />
                    <span className="tabular-nums">{formatCtc(app.ctc, app.type)}</span>
                    {app.dueDate && <span className="flex items-center gap-1"><Icon name="calendar" className="size-3.5" />{describeDue(app.dueDate).text}</span>}
                  </div>
                </li>
              ))}
            </ul>

            <Pagination page={page} limit={LIMIT} total={total} totalPages={result.pagination.totalPages}
              onChange={(p) => setParam('page', p > 1 ? String(p) : '')} />
          </>
        )}
      </div>

      <ApplicationDrawer application={viewing} onClose={() => setViewing(null)}
        onEdit={(a) => { setViewing(null); setEditing(a); }}
        onDelete={(a) => { setViewing(null); setDeleting(a); }}
        onChanged={(a) => setResult((r) => ({ ...r, data: r.data.map((x) => (x._id === a._id ? a : x)) }))} />
      <ApplicationFormModal open={editing !== null} application={editing} onClose={() => setEditing(null)} onSaved={reload} />
      <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={confirmDelete} busy={busyId === deleting?._id}
        title="Delete application?" message={<>This permanently removes <strong className="text-slate-900">{deleting?.company}</strong> ({deleting?.role}) and its stage history.</>} />
    </div>
  );
}
