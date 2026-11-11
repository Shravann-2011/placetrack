import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { CountUp } from '../components/CountUp';
import { Icon, Logo } from '../components/Icon';
import { STAGES, STAGE_STYLES } from '../lib/constants';

const FEATURES = [
  { icon: 'layers', title: 'Every placement round', text: 'Applied, Aptitude/OA, GD, Technical, HR, Offer — the stages Indian campus drives actually use.' },
  { icon: 'clock', title: 'Never miss a deadline', text: 'Due Soon groups upcoming OAs, interviews and form deadlines so today’s round is always on top.' },
  { icon: 'chart', title: 'See what’s working', text: 'A stage funnel, weekly activity and response rate by source show where your effort pays off.' },
  { icon: 'search', title: 'Find anything instantly', text: 'Search by company or role and filter by stage, source or job type — even with 100+ applications.' },
  { icon: 'rupee', title: 'Compare offers', text: 'Log CTC in LPA or stipend per month and sort to see your strongest options at a glance.' },
  { icon: 'shield', title: 'Private by design', text: 'Your data is scoped to your account, passwords are hashed, and sessions use secure httpOnly cookies.' },
];

const STEPS = [
  { title: 'Add an application', text: 'Company, role, CTC, source and the next deadline — it takes ten seconds.' },
  { title: 'Move it through rounds', text: 'Update the stage as you clear each round. PlaceTrack records the full timeline.' },
  { title: 'Learn from your data', text: 'Your dashboard shows conversion at every stage and which channels reply most.' },
];

const EASE = [0.16, 1, 0.3, 1];

// Fades + slides its children up the first time they scroll into view
function Reveal({ children, delay = 0, className = '', y = 24 }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.6, delay, ease: EASE }}>
      {children}
    </motion.div>
  );
}

// The placement pipeline with a highlight that walks through each stage on a loop
function AnimatedPipeline() {
  const stages = STAGES.filter((s) => s !== 'Rejected');
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setActive((a) => (a + 1) % stages.length), 1100);
    return () => clearInterval(id);
  }, [stages.length]);
  return (
    <div className="mx-auto mt-12 flex max-w-3xl flex-wrap items-center justify-center gap-x-2 gap-y-3">
      {stages.map((s, i, arr) => (
        <div key={s} className="flex items-center gap-2">
          <motion.span animate={i === active ? { scale: 1.08, y: -2 } : { scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-shadow ${STAGE_STYLES[s].badge} ${
              i === active ? 'shadow-md shadow-brand-500/20' : ''}`}>
            <span className={`size-1.5 rounded-full ${STAGE_STYLES[s].dot}`} />{s}
          </motion.span>
          {i < arr.length - 1 && (
            <Icon name="chevronRight" className={`size-3.5 transition-colors duration-300 ${i < active ? 'text-brand-400' : 'text-slate-300'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// A lightweight, illustrative product preview drawn in HTML (not a screenshot)
function ProductPreview() {
  const funnel = [['Applied', 100], ['Aptitude/OA', 74], ['GD', 46], ['Technical', 41], ['HR', 20], ['Offer', 10]];
  const rows = [
    ['Zoho', 'Member Technical Staff', 'Technical', 'in 2 days'],
    ['TCS', 'Digital Engineer', 'Aptitude/OA', 'Tomorrow'],
    ['Razorpay', 'SDE Intern', 'HR', 'in 5 days'],
  ];
  // Mouse position → gentle 3D tilt (springs keep it smooth)
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [6, -6]), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-8, 8]), { stiffness: 150, damping: 20 });
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const reset = () => { mx.set(0); my.set(0); };

  return (
    <div className="relative mx-auto w-full max-w-5xl text-left [perspective:1400px]" onMouseMove={onMove} onMouseLeave={reset}>
      <div className="absolute -inset-x-8 -top-8 -bottom-4 -z-10 rounded-[2rem] bg-gradient-to-b from-brand-500/20 via-violet-400/10 to-transparent blur-2xl" />
      <motion.div style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        initial={{ opacity: 0, y: 40, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.45, duration: 0.8, ease: EASE }}
        className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-brand-900/10 ring-1 ring-slate-900/5">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-rose-300" /><span className="size-2.5 rounded-full bg-amber-300" /><span className="size-2.5 rounded-full bg-emerald-300" />
          <span className="ml-3 hidden rounded-md bg-white px-3 py-0.5 text-[11px] text-slate-400 ring-1 ring-slate-200 sm:block">placetrack.app/dashboard</span>
        </div>
        <div className="grid gap-4 p-4 sm:p-6 md:grid-cols-[1.1fr_1fr]">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[['Applications', '27'], ['In progress', '14'], ['Response rate', '63%']].map(([l, v]) => (
                <div key={l} className="rounded-xl border border-slate-200 p-3">
                  <p className="text-[11px] text-slate-500">{l}</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">
                    <CountUp value={parseInt(v, 10)} suffix={v.endsWith('%') ? '%' : ''} duration={1.4} />
                  </p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="mb-3 text-xs font-semibold text-slate-900">Placement funnel</p>
              <div className="space-y-2">
                {funnel.map(([s, w], i) => (
                  <div key={s} className="flex items-center gap-2">
                    <span className="w-20 truncate text-[11px] text-slate-500">{s}</span>
                    <motion.div className="h-3 origin-left rounded-r bg-brand-600" style={{ width: `${w * 0.7}%` }}
                      initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.9 + i * 0.09, duration: 0.7, ease: EASE }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="mb-3 text-xs font-semibold text-slate-900">Up next</p>
            <ul className="divide-y divide-slate-100">
              {rows.map(([c, r, st, d], i) => (
                <motion.li key={c} className="flex items-center gap-3 py-2.5"
                  initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1 + i * 0.12, duration: 0.5, ease: EASE }}>
                  <div className="grid size-8 place-items-center rounded-lg bg-brand-50 text-[11px] font-bold text-brand-700">{c[0]}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-900">{c}</p>
                    <p className="truncate text-[11px] text-slate-500">{r}</p>
                  </div>
                  <span className={`hidden rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset lg:inline ${STAGE_STYLES[st].badge}`}>{st}</span>
                  <span className={`text-[11px] ${d === 'Tomorrow' ? 'font-semibold text-rose-600' : 'text-slate-600'}`}>{d}</span>
                </motion.li>
              ))}
            </ul>
            <div className="mt-3 rounded-lg bg-brand-50 p-3 text-[11px] text-brand-800">
              <span className="font-semibold">Referral</span> applications reply 2× more often than job portals.
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-2">
            <a href="#features" className="btn-ghost hidden sm:inline-flex">Features</a>
            <a href="#how" className="btn-ghost hidden sm:inline-flex">How it works</a>
            <Link to="/login" className="btn-ghost">Log in</Link>
            <Link to="/register" className="btn-primary">Get started</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,var(--color-brand-100),transparent_60%)]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:48px_48px] opacity-40 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="mx-auto max-w-6xl px-4 pt-16 pb-20 text-center sm:px-6 sm:pt-24">
          <motion.span initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}
            className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-3 py-1 text-xs font-medium text-brand-700 shadow-xs">
            <motion.span animate={{ rotate: [0, 15, -10, 0] }} transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.5 }} className="inline-flex">
              <Icon name="sparkles" className="size-3.5" />
            </motion.span>
            Built for Indian campus placements
          </motion.span>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.7, ease: EASE }}
            className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
            Your placement season,{' '}
            <span className="animate-gradient bg-gradient-to-r from-brand-600 via-violet-500 to-brand-600 bg-[length:200%_auto] bg-clip-text text-transparent">finally organised.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.7, ease: EASE }}
            className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            Track every application from the aptitude test to the offer letter. See your deadlines, your funnel and what’s actually working — in one place.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.7, ease: EASE }}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link to="/register" className="btn-primary group px-5 py-3 text-base shadow-lg shadow-brand-600/25">
                Start tracking — it’s free <Icon name="arrowRight" className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link to="/login" className="btn-secondary px-5 py-3 text-base">Log in</Link>
            </motion.div>
          </motion.div>

          {/* Stage strip: a highlight walks through the rounds */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <AnimatedPipeline />
          </motion.div>

          <div className="mt-16"><ProductPreview /></div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 border-t border-slate-100 bg-slate-50/60 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-brand-600">Features</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Everything a spreadsheet can’t do</h2>
            <p className="mt-4 text-slate-600">Spreadsheets get messy by the third company. PlaceTrack is built around how placements actually work.</p>
          </Reveal>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} className="card group p-6 transition-shadow hover:shadow-lg hover:shadow-brand-900/5"
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: (i % 3) * 0.08, duration: 0.55, ease: EASE }} whileHover={{ y: -4 }}>
                <div className="grid size-10 place-items-center rounded-lg bg-brand-600 text-white shadow-sm shadow-brand-600/30 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
                  <Icon name={f.icon} className="size-5" />
                </div>
                <h3 className="mt-5 font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-20 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-brand-600">How it works</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Three steps. Zero chaos.</h2>
          </Reveal>
          <ol className="mt-14 grid gap-8 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <motion.li key={s.title} className="relative"
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }}
                transition={{ delay: i * 0.15, duration: 0.55, ease: EASE }}>
                {i < STEPS.length - 1 && <div className="absolute left-12 top-5 hidden h-px w-[calc(100%-2rem)] bg-gradient-to-r from-brand-200 to-transparent md:block" />}
                <div className="relative grid size-10 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand-700 ring-4 ring-white">{i + 1}</div>
                <h3 className="mt-5 font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.text}</p>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-20 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 30, scale: 0.98 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-violet-600 px-6 py-14 text-center text-white sm:px-12">
          <motion.div className="absolute -right-20 -top-20 size-72 rounded-full bg-white/10 blur-3xl"
            animate={{ x: [0, -40, 0], y: [0, 30, 0] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.div className="absolute -bottom-24 -left-10 size-72 rounded-full bg-violet-300/20 blur-3xl"
            animate={{ x: [0, 50, 0], y: [0, -20, 0] }} transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }} />
          <h2 className="relative text-3xl font-bold tracking-tight sm:text-4xl">Your next offer starts with your next application.</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-brand-100">Set up in under a minute. No spreadsheets, no lost deadlines.</p>
          <Link to="/register" className="btn relative mt-8 bg-white px-5 py-3 text-base text-brand-700 shadow-lg hover:bg-brand-50">
            Create your free account <Icon name="arrowRight" />
          </Link>
        </motion.div>
      </section>

      <footer className="border-t border-slate-100">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:px-6">
          <Logo className="scale-90" />
          <p>© {new Date().getFullYear()} PlaceTrack · Built for campus placements</p>
        </div>
      </footer>
    </div>
  );
}
