import { Link } from 'react-router';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { Icon, Logo } from '../components/Icon';
import { JaggedEdge, Spark, Squiggle } from '../components/Doodles';

const EASE = [0.16, 1, 0.3, 1];

function Reveal({ children, delay = 0, className = '', y = 28 }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.7, delay, ease: EASE }}>
      {children}
    </motion.div>
  );
}

// The problems students actually face, each answered by a feature
const PROBLEMS = [
  { problem: 'Deadlines everywhere', fix: 'Email, WhatsApp groups, the placement portal. PlaceTrack puts every OA, GD, interview and deadline on one calendar.', bg: 'bg-lime', tilt: -2 },
  { problem: 'Two rounds, one slot', fix: 'Two OAs at 10 am? Clashes are flagged the moment you add an event, so you can ask for a reschedule in time.', bg: 'bg-pink', tilt: 1.5 },
  { problem: '“Wait, which round was that?”', fix: 'Every application keeps its own rounds and a dated timeline from Applied to Offer.', bg: 'bg-cream', tilt: -1 },
  { problem: 'No reminders', fix: 'One click adds a round to Google Calendar, or export them all with a reminder an hour before each.', bg: 'bg-coral', tilt: 2 },
  { problem: 'Lost in 40 applications', fix: 'Search, filters, a Kanban board and a Due Soon list keep the busiest week under control.', bg: 'bg-cream', tilt: -1.5 },
  { problem: 'Not sure what works', fix: 'Your funnel and reply rate by source show where your effort pays off: campus, referral or LinkedIn.', bg: 'bg-lime', tilt: 1 },
];

const MINI_DAYS = Array.from({ length: 35 }, (_, i) => i - 2); // a sample month grid
const MINI_EVENTS = { 4: 'sky', 6: 'amber', 11: 'violet', 12: 'violet', 15: 'rose', 19: 'orange', 24: 'emerald' };
const DOT = { sky: 'bg-sky-500', amber: 'bg-amber-500', violet: 'bg-violet-500', rose: 'bg-rose-500', orange: 'bg-orange-500', emerald: 'bg-emerald-500' };

// Illustrative calendar card (sample data, not a screenshot)
function CalendarPreview() {
  const mx = useMotionValue(0), my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [7, -7]), { stiffness: 150, damping: 18 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-9, 9]), { stiffness: 150, damping: 18 });
  return (
    <div className="[perspective:1200px]" onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); mx.set((e.clientX - r.left) / r.width - 0.5); my.set((e.clientY - r.top) / r.height - 0.5); }}
      onMouseLeave={() => { mx.set(0); my.set(0); }}>
      <motion.div style={{ rotateX, rotateY }} initial={{ opacity: 0, y: 40, rotate: 4 }} animate={{ opacity: 1, y: 0, rotate: 3 }} transition={{ delay: 0.5, duration: 0.9, ease: EASE }}
        className="relative w-full max-w-md rounded-[28px] bg-cream p-5 text-left text-ink shadow-[10px_10px_0_0_var(--color-lime)]">
        <div className="flex items-center justify-between">
          <p className="display text-2xl">November</p>
          <span className="rounded-full bg-ink px-3 py-1 text-xs font-bold text-lime">7 rounds</span>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-ink/50">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i}>{d}</span>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {MINI_DAYS.map((d) => (
            <div key={d} className={`flex aspect-square flex-col items-center justify-center rounded-lg text-xs font-bold ${d === 11 ? 'bg-lime' : d > 0 && d <= 30 ? 'bg-white' : 'bg-transparent text-ink/20'}`}>
              {d > 0 && d <= 30 ? d : ''}
              {MINI_EVENTS[d] && <span className={`mt-0.5 size-1.5 rounded-full ${DOT[MINI_EVENTS[d]]}`} />}
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-3 rounded-xl bg-white p-2.5">
            <span className="h-8 w-1 rounded-full bg-violet-500" />
            <div className="flex-1"><p className="text-sm font-bold">Zoho · Group discussion</p><p className="text-xs text-ink/60">Wed 11 · 2:00 – 3:00 pm · Seminar Hall 2</p></div>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">Clash</span>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-white p-2.5">
            <span className="h-8 w-1 rounded-full bg-sky-500" />
            <div className="flex-1"><p className="text-sm font-bold">TCS · Online assessment</p><p className="text-xs text-ink/60">Tue 4 · 10:00 am – 12:00 pm · TCS iON</p></div>
            <Icon name="google" className="size-4 text-ink/40" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-cream text-ink">
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink text-cream">
        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-8">
          <Link to="/" className="shrink-0 rounded-full bg-cream px-3 py-2 sm:px-4"><Logo /></Link>
          <nav className="flex items-center gap-2">
            <a href="#problems" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-cream/80 transition hover:text-lime sm:inline">Why PlaceTrack</a>
            <a href="#calendar" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-cream/80 transition hover:text-lime sm:inline">Calendar</a>
            <Link to="/login" className="whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold text-cream transition hover:text-lime sm:px-4">Log in</Link>
            <Link to="/register" className="whitespace-nowrap rounded-full bg-lime px-4 py-2.5 text-sm font-bold text-ink transition hover:scale-105 sm:px-5">Start free</Link>
          </nav>
        </header>

        <Squiggle className="absolute bottom-[8%] left-[3%] hidden w-24 -rotate-6 text-lime md:block" />
        <Spark className="absolute right-[8%] top-[18%] w-12 text-pink" />
        <Spark className="absolute bottom-[14%] left-[46%] hidden w-9 text-lime lg:block" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-24 pt-10 sm:px-8 lg:grid-cols-[1.15fr_1fr] lg:pb-32 lg:pt-16">
          <div>
            <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="inline-block -rotate-2 bg-pink px-3 py-1 font-display text-sm uppercase tracking-wide text-ink">For Indian campus placements</motion.p>
            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.8, ease: EASE }}
              className="display mt-6 text-[clamp(2.75rem,6.4vw,6.25rem)]">
              Every round.<br />Every deadline.<br /><span className="text-lime">One place.</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7, ease: EASE }}
              className="mt-7 max-w-lg text-lg text-cream/80">
              Track every application from registration to offer letter, see every OA and interview on one calendar, and never get caught out by a clash again.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.7, ease: EASE }}
              className="mt-9 flex flex-wrap items-center gap-5">
              <Link to="/register" className="sticker -rotate-2 text-base">Start tracking <Icon name="arrowRight" /></Link>
              <Link to="/login" className="font-semibold text-cream underline decoration-lime decoration-2 underline-offset-8 transition hover:text-lime">I already have an account</Link>
            </motion.div>
          </div>
          <div className="flex justify-center lg:justify-end"><CalendarPreview /></div>
        </div>
      </section>

      {/* Problems -> fixes */}
      <section id="problems" className="scroll-mt-6 px-4 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <Reveal className="max-w-3xl">
            <h2 className="display text-[clamp(2.4rem,6vw,4.75rem)]">Placement season<br />is <span className="relative inline-block">chaos.<Squiggle stretch className="absolute -bottom-2 left-0 h-3 w-full text-coral sm:h-4" /></span></h2>
            <p className="mt-6 max-w-xl text-lg text-ink/70">Six problems every student runs into, and how PlaceTrack fixes each one.</p>
          </Reveal>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PROBLEMS.map((p, i) => (
              <motion.article key={p.problem} initial={{ opacity: 0, y: 40, rotate: 0 }} whileInView={{ opacity: 1, y: 0, rotate: p.tilt }}
                viewport={{ once: true, amount: 0.3 }} transition={{ delay: (i % 3) * 0.08, duration: 0.6, ease: EASE }}
                whileHover={{ rotate: 0, y: -6, transition: { duration: 0.2 } }}
                className={`rounded-[26px] ${p.bg} p-7 ring-2 ring-ink shadow-[6px_6px_0_0_var(--color-ink)]`}>
                <p className="font-display text-sm uppercase text-ink/50">Problem {i + 1}</p>
                <h3 className="display mt-2 text-2xl">{p.problem}</h3>
                <p className="mt-4 text-[15px] leading-relaxed text-ink/80">{p.fix}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Statement band */}
      <section className="relative overflow-hidden bg-lime px-4 py-20 sm:px-8">
        <Spark className="absolute right-[6%] top-8 w-14 text-ink" />
        <Reveal className="mx-auto max-w-7xl text-center">
          <h2 className="display text-[clamp(2.6rem,9vw,8rem)]">Never miss<br />an OA again.</h2>
          <Link to="/register" className="sticker mt-10 rotate-2 bg-cream text-base">Make my calendar <Icon name="arrowRight" /></Link>
        </Reveal>
      </section>

      {/* Calendar spotlight */}
      <section id="calendar" className="scroll-mt-6 bg-ink px-4 py-20 text-cream sm:px-8 sm:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">
          <Reveal>
            <h2 className="display text-[clamp(2.4rem,5.5vw,4.5rem)] text-lime">One calendar<br />for the whole drive.</h2>
            <ul className="mt-8 space-y-4 text-lg text-cream/85">
              {[
                ['calendar', 'Month, week and agenda views of every OA, GD, interview and deadline.'],
                ['alert', 'Clash warnings the moment two rounds overlap.'],
                ['google', 'Add any round to Google Calendar in one click.'],
                ['download', 'Export everything with a reminder an hour before each round.'],
              ].map(([icon, text]) => (
                <li key={text} className="flex gap-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-lime text-ink"><Icon name={icon} className="size-5" /></span><span className="pt-1.5">{text}</span></li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.1} className="flex justify-center"><CalendarPreview /></Reveal>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <Reveal><h2 className="display text-[clamp(2.4rem,6vw,4.75rem)]">Three steps.<br /><span className="text-coral">Zero chaos.</span></h2></Reveal>
          <ol className="mt-14 grid gap-10 md:grid-cols-3">
            {[
              ['Add the company', 'Role, CTC, source and the next deadline. Ten seconds.'],
              ['Drop in the rounds', 'OA, GD, interviews. They land on your calendar, clashes flagged.'],
              ['Move it to offer', 'Drag it across the board as you clear each round. Celebrate.'],
            ].map(([t, d], i) => (
              <Reveal key={t} delay={i * 0.12}>
                <li className="list-none">
                  <span className="display text-8xl text-lime [-webkit-text-stroke:2px_var(--color-ink)]">{i + 1}</span>
                  <h3 className="display mt-3 text-2xl">{t}</h3>
                  <p className="mt-2 text-ink/70">{d}</p>
                </li>
              </Reveal>
            ))}
          </ol>
          <Reveal className="mt-16 text-center"><Link to="/register" className="sticker -rotate-1 text-base">Create your free account <Icon name="arrowRight" /></Link></Reveal>
        </div>
      </section>

      {/* Footer with a jagged edge */}
      <footer className="relative">
        <JaggedEdge className="block h-20 w-full text-lime sm:h-28" />
        <div className="bg-lime px-4 pb-10 sm:px-8">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
            <Logo />
            <p className="text-sm font-semibold text-ink/70">© {new Date().getFullYear()} PlaceTrack · Built for campus placements</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
