import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';
import { Icon, Logo } from '../components/Icon';
import { Field, Spinner } from '../components/ui';
import { STAGES, STAGE_STYLES } from '../lib/constants';

function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel (desktop only) */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-violet-600 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-lg bg-white/15 ring-1 ring-white/25">
            <svg viewBox="0 0 32 32" className="size-5" fill="none" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 23V9h7a4.5 4.5 0 010 9h-7" /></svg>
          </div>
          <span className="text-lg font-bold">PlaceTrack</span>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-4xl font-bold leading-tight tracking-tight">Every application.<br />Every round.<br />One place.</h2>
          <p className="mt-4 text-brand-100">Track your campus placement journey from the first application to the offer letter.</p>
          <div className="mt-10 space-y-2.5">
            {STAGES.filter((s) => s !== 'Rejected').map((stage, i) => (
              <div key={stage} className="flex items-center gap-3" style={{ opacity: 1 - i * 0.12 }}>
                <span className="size-2.5 rounded-full ring-4 ring-white/10" style={{ background: STAGE_STYLES[stage].hex }} />
                <span className="text-sm font-medium">{stage}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-sm text-brand-200">Built for Indian campus placements 🇮🇳</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Logo className="mb-10 lg:hidden" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-8 text-center text-sm text-slate-500">{footer}</p>
        </div>
      </div>
    </div>
  );
}

function PasswordInput({ value, onChange, error, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input type={show ? 'text' : 'password'} className={`input pr-10 ${error ? 'input-error' : ''}`}
        value={value} onChange={onChange} autoComplete={autoComplete} required />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute inset-y-0 right-0 grid w-10 place-items-center text-slate-400 hover:text-slate-600">
        <Icon name={show ? 'eyeOff' : 'eye'} />
      </button>
    </div>
  );
}

function useAuthForm(initial, submit) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const bind = (name) => ({ value: values[name], onChange: (e) => setValues((v) => ({ ...v, [name]: e.target.value })) });

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true); setErrors({}); setFormError('');
    try {
      await submit(values);
      navigate(location.state?.from?.pathname || '/applications', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.details.length) setErrors(err.fieldErrors);
      else setFormError(err.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };
  return { bind, errors, formError, busy, onSubmit };
}

function FormAlert({ message }) {
  if (!message) return null;
  return (
    <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
      <Icon name="alert" className="mt-0.5 size-4 shrink-0" /> {message}
    </div>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const { bind, errors, formError, busy, onSubmit } = useAuthForm({ email: '', password: '' }, login);
  return (
    <AuthShell title="Welcome back" subtitle="Log in to continue tracking your placements."
      footer={<>New to PlaceTrack? <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">Create an account</Link></>}>
      <FormAlert message={formError} />
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <Field label="Email" error={errors.email}>
          <input type="email" className={`input ${errors.email ? 'input-error' : ''}`} autoComplete="email" placeholder="you@college.edu" required {...bind('email')} />
        </Field>
        <Field label="Password" error={errors.password}>
          <PasswordInput {...bind('password')} error={errors.password} autoComplete="current-password" />
        </Field>
        <button className="btn-primary w-full py-2.5" disabled={busy}>
          {busy && <Spinner className="size-4" />} Log in
        </button>
      </form>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const { bind, errors, formError, busy, onSubmit } = useAuthForm({ name: '', email: '', password: '' }, register);
  return (
    <AuthShell title="Create your account" subtitle="Start organising your placement season in under a minute."
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">Log in</Link></>}>
      <FormAlert message={formError} />
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <Field label="Full name" error={errors.name}>
          <input className={`input ${errors.name ? 'input-error' : ''}`} autoComplete="name" placeholder="Shravan Kumar" required {...bind('name')} />
        </Field>
        <Field label="Email" error={errors.email}>
          <input type="email" className={`input ${errors.email ? 'input-error' : ''}`} autoComplete="email" placeholder="you@college.edu" required {...bind('email')} />
        </Field>
        <Field label="Password" error={errors.password} hint="At least 8 characters">
          <PasswordInput {...bind('password')} error={errors.password} autoComplete="new-password" />
        </Field>
        <button className="btn-primary w-full py-2.5" disabled={busy}>
          {busy && <Spinner className="size-4" />} Create account
        </button>
      </form>
    </AuthShell>
  );
}
