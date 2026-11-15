import { useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Field, Spinner } from '../components/ui';
import { Icon } from '../components/Icon';
import { RevealText } from '../components/Motion';

function Toggle({ checked, onChange, disabled, label }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${checked ? 'bg-ink' : 'bg-slate-300'}`}>
      <span className={`absolute top-1 left-1 size-5 rounded-full transition-transform ${checked ? 'translate-x-5 bg-lime' : 'bg-white'}`} />
    </button>
  );
}

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const remindersOn = user?.reminders?.email !== false;

  const patch = async (body, message) => {
    const res = await api('/auth/me', { method: 'PATCH', body });
    updateUser(res.user);
    toast(message);
  };

  const toggleReminders = async (on) => {
    try { await patch({ reminders: { email: on } }, on ? 'Reminder emails are on' : 'Reminder emails are off'); }
    catch (e) { toast(e.message, 'error'); }
  };

  const saveName = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { await patch({ name }, 'Name updated'); } catch (err) { toast(err.message, 'error'); } finally { setSaving(false); }
  };

  const sendTest = async () => {
    setTesting(true);
    try { const r = await api('/auth/me/test-email', { method: 'POST' }); toast(r.message); }
    catch (e) { toast(e.message, 'error'); }
    finally { setTesting(false); }
  };

  return (
    <div className="stagger-in max-w-2xl">
      <h1 className="display text-4xl text-ink sm:text-5xl"><RevealText text="Settings" /></h1>
      <p className="mt-2 text-sm text-slate-600">Your account and how PlaceTrack keeps you on time.</p>

      <section className="card mt-6 p-6">
        <div className="flex items-start gap-4">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-lime text-ink"><Icon name="clock" /></div>
          <div className="flex-1">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-ink">Reminder emails</h2>
              <Toggle checked={remindersOn} onChange={toggleReminders} label="Reminder emails" />
            </div>
            <p className="mt-1 text-sm text-slate-600">
              One email about a day before each round or deadline on your calendar, sent to <strong className="text-ink">{user?.email}</strong>.
              It includes the time, the venue or link, and what's left on your prep checklist. No daily digests, no spam.
            </p>
            <button className="btn-secondary mt-4" onClick={sendTest} disabled={testing || !remindersOn}>
              {testing ? <Spinner className="size-4" /> : <Icon name="sparkles" />} Send me a test email
            </button>
            <p className="mt-2 text-xs text-slate-500">Can't find it? Check your spam folder and mark it "Not spam" so the real reminders land in your inbox.</p>
          </div>
        </div>
      </section>

      <section className="card mt-4 p-6">
        <h2 className="text-lg font-bold text-ink">Profile</h2>
        <form onSubmit={saveName} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Name" className="flex-1"><input className="input" value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={60} required /></Field>
          <button className="btn-primary" disabled={saving || name.trim() === user?.name || name.trim().length < 2}>{saving && <Spinner className="size-4" />} Save</button>
        </form>
        <p className="mt-3 text-sm text-slate-500">Email: {user?.email}</p>
      </section>
    </div>
  );
}
