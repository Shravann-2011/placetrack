import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';
import { Icon, Logo } from '../components/Icon';
import { Spark, Squiggle } from '../components/Doodles';
import { Field, Spinner } from '../components/ui';
import { STAGES, STAGE_STYLES } from '../lib/constants';

function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen bg-cream lg:grid-cols-2">
      {/* Brand panel (desktop only) */}
      <div className="relative hidden overflow-hidden bg-ink p-12 text-cream lg:flex lg:flex-col lg:justify-between">
        <Squiggle className="absolute right-12 top-32 w-28 rotate-6 text-lime" />
        <Spark className="absolute bottom-16 right-16 w-12 text-pink" />
        <Link to="/" className="relative w-fit rounded-full bg-cream px-4 py-2"><Logo /></Link>
        <div className="relative">
          <h2 className="display text-6xl xl:text-7xl">Every round.<br />Every deadline.<br /><span className="text-lime">One place.</span></h2>
          <p className="mt-6 max-w-sm text-cream/75">Your applications, rounds and deadlines on one board and one calendar, from the first OA to the offer letter.</p>
          <div className="mt-10 flex flex-wrap gap-2">
            {STAGES.filter((s) => s !== 'Rejected').map((stage, i) => (
              <span key={stage} className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold ring-1 ring-white/15" style={{ opacity: 1 - i * 0.1 }}>
                <span className="mr-1.5 inline-block size-2 rounded-full align-middle" style={{ background: STAGE_STYLES[stage].hex }} />{stage}
              </span>
            ))}
          </div>
        </div>
        <p className="relative text-sm font-semibold text-lime">Built for Indian campus placements</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="mb-10 block w-fit lg:hidden"><Logo /></Link>
          <h1 className="display text-4xl text-ink">{title}</h1>
          <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-8 text-center text-sm text-slate-600">{footer}</p>
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
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
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
      footer={<>New to PlaceTrack? <Link to="/register" className="font-bold text-ink underline decoration-lime decoration-2 underline-offset-4">Create an account</Link></>}>
      <FormAlert message={formError} />
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <Field label="Email" error={errors.email}>
          <input type="email" className={`input ${errors.email ? 'input-error' : ''}`} autoComplete="email" placeholder="you@college.edu" required {...bind('email')} />
        </Field>
        <Field label="Password" error={errors.password}>
          <PasswordInput {...bind('password')} error={errors.password} autoComplete="current-password" />
        </Field>
        <button className="btn-primary w-full py-3 text-base" disabled={busy}>
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
      footer={<>Already have an account? <Link to="/login" className="font-bold text-ink underline decoration-lime decoration-2 underline-offset-4">Log in</Link></>}>
      <FormAlert message={formError} />
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <Field label="Full name" error={errors.name}>
          <input className={`input ${errors.name ? 'input-error' : ''}`} autoComplete="name" placeholder="Your full name" required {...bind('name')} />
        </Field>
        <Field label="Email" error={errors.email}>
          <input type="email" className={`input ${errors.email ? 'input-error' : ''}`} autoComplete="email" placeholder="you@college.edu" required {...bind('email')} />
        </Field>
        <Field label="Password" error={errors.password} hint="At least 8 characters">
          <PasswordInput {...bind('password')} error={errors.password} autoComplete="new-password" />
        </Field>
        <button className="btn-primary w-full py-3 text-base" disabled={busy}>
          {busy && <Spinner className="size-4" />} Create account
        </button>
      </form>
    </AuthShell>
  );
}
