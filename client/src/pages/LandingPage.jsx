import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform } from 'motion/react';
import { Icon, Logo } from '../components/Icon';
import { JaggedEdge, Spark } from '../components/Doodles';

const EASE = [0.16, 1, 0.3, 1];

function Reveal({ children, delay = 0, className = '', y = 28 }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.7, delay, ease: EASE }}>
      {children}
    </motion.div>
  );
}

// Big headings: each line slides up from behind a mask, one after another
// (the visible wrapper is what's watched: the hidden lines themselves are clipped, so they never "enter view")
function MaskLines({ lines, delay = 0, inView = false, className = '' }) {
  const trigger = inView ? { whileInView: 'on', viewport: { once: true, amount: 0.5 } } : { animate: 'on' };
  return (
    <motion.span className="block" initial="off" {...trigger}>
      {lines.map((line, i) => (
        <span key={i} className={`block overflow-hidden pb-[0.06em] ${className}`}>
          <motion.span className="block origin-bottom-left"
            variants={{ off: { y: '110%', rotate: 3 }, on: { y: 0, rotate: 0, transition: { delay: delay + i * 0.11, duration: 0.85, ease: EASE } } }}>
            {line}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}

// The zig-zag underline draws itself in
function DrawnSquiggle({ className, delay = 0.2 }) {
  return (
    <svg viewBox="0 0 120 40" preserveAspectRatio="none" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <motion.path d="M4 30 L22 8 L38 30 L56 8 L72 30 L90 8 L114 30" strokeWidth="5" vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true, amount: 0.8 }}
        transition={{ delay, duration: 0.9, ease: 'easeInOut' }} />
    </svg>
  );
}

// Buttons that lean towards the cursor a little
function Magnetic({ children, strength = 0.25 }) {
  const x = useSpring(0, { stiffness: 250, damping: 18 });
  const y = useSpring(0, { stiffness: 250, damping: 18 });
  return (
    <motion.span className="inline-block" style={{ x, y }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse') return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * strength);
        y.set((e.clientY - r.top - r.height / 2) * strength);
      }}
      onPointerLeave={() => { x.set(0); y.set(0); }}>
      {children}
    </motion.span>
  );
}

// The problems students actually face, each answered by a feature
const PROBLEMS = [
  { problem: 'Deadlines everywhere', fix: 'Email, WhatsApp groups, the placement portal. PlaceTrack puts every OA, GD, interview and deadline on one calendar.', bg: 'bg-lime', tilt: -2 },
  { problem: 'Two rounds, one slot', fix: 'Two OAs at 10 am? Clashes are flagged the moment you add an event, so you can ask for a reschedule in time.', bg: 'bg-pink', tilt: 1.5 },
  { problem: '“Wait, which round was that?”', fix: 'Every application keeps its own rounds and a dated timeline from Applied to Offer.', bg: 'bg-cream', tilt: -1 },
  { problem: 'No reminders', fix: 'PlaceTrack emails you before each round, and one click adds it to Google Calendar.', bg: 'bg-coral', tilt: 2 },
  { problem: 'Lost in 40 applications', fix: 'Search, filters, a Kanban board and a Due Soon list keep the busiest week under control.', bg: 'bg-cream', tilt: -1.5 },
  { problem: 'Not sure what works', fix: 'Your funnel and reply rate by source show where your effort pays off: campus, referral or LinkedIn.', bg: 'bg-lime', tilt: 1 },
];

const TICKER = ['Paste the placement message', 'Online assessment', 'Group discussion', 'Technical round', 'HR round', 'Offer letter', 'Reminder emails', 'Clash warnings'];

const MINI_DAYS = Array.from({ length: 35 }, (_, i) => i - 2); // a sample month grid
const MINI_EVENTS = { 4: 'sky', 6: 'amber', 11: 'violet', 12: 'violet', 15: 'rose', 19: 'orange', 24: 'emerald' };
const DOT = { sky: 'bg-sky-500', amber: 'bg-amber-500', violet: 'bg-violet-500', rose: 'bg-rose-500', orange: 'bg-orange-500', emerald: 'bg-emerald-500' };

// Illustrative calendar card (sample data, not a screenshot). Tilts with the mouse;
// the days fill in, the event dots pop and the two rounds slide in.
function CalendarPreview({ delay = 0.5, inView = false }) {
  const mx = useMotionValue(0), my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [7, -7]), { stiffness: 150, damping: 18 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-9, 9]), { stiffness: 150, damping: 18 });
  const show = inView ? { whileInView: 'on', viewport: { once: true, amount: 0.4 } } : { animate: 'on' };
  return (
    <div className="[perspective:1200px]" onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); mx.set((e.clientX - r.left) / r.width - 0.5); my.set((e.clientY - r.top) / r.height - 0.5); }}
      onMouseLeave={() => { mx.set(0); my.set(0); }}>
      <motion.div style={{ rotateX, rotateY }} initial="off" {...show}
        variants={{ off: { opacity: 0, y: 40, rotate: 6 }, on: { opacity: 1, y: 0, rotate: 3, transition: { delay, duration: 0.9, ease: EASE, delayChildren: delay + 0.3, staggerChildren: 0.012 } } }}
        className="relative w-full max-w-md rounded-[28px] bg-cream p-5 text-left text-ink shadow-[10px_10px_0_0_var(--color-lime)]">
        <div className="flex items-center justify-between">
          <p className="display text-2xl">November</p>
          <motion.span variants={{ off: { scale: 0 }, on: { scale: 1 } }} className="rounded-full bg-ink px-3 py-1 text-xs font-bold text-lime">7 rounds</motion.span>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-ink/50">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i}>{d}</span>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {MINI_DAYS.map((d) => (
            <motion.div key={d} variants={{ off: { opacity: 0, scale: 0.6 }, on: { opacity: 1, scale: 1 } }} transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              className={`flex aspect-square flex-col items-center justify-center rounded-lg text-xs font-bold ${d === 11 ? 'bg-lime' : d > 0 && d <= 30 ? 'bg-white' : 'bg-transparent text-ink/20'}`}>
              {d > 0 && d <= 30 ? d : ''}
              {MINI_EVENTS[d] && <motion.span variants={{ off: { scale: 0 }, on: { scale: [0, 1.8, 1] } }} transition={{ duration: 0.5 }} className={`mt-0.5 size-1.5 rounded-full ${DOT[MINI_EVENTS[d]]}`} />}
            </motion.div>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          <motion.div variants={{ off: { opacity: 0, x: -24 }, on: { opacity: 1, x: 0 } }} transition={{ duration: 0.5, ease: EASE }} className="flex items-center gap-3 rounded-xl bg-white p-2.5">
            <span className="h-8 w-1 rounded-full bg-violet-500" />
            <div className="flex-1"><p className="text-sm font-bold">Zoho · Group discussion</p><p className="text-xs text-ink/60">Wed 11 · 2:00 – 3:00 pm · Seminar Hall 2</p></div>
            <motion.span animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 1.6 }}
              className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">Clash</motion.span>
          </motion.div>
          <motion.div variants={{ off: { opacity: 0, x: -24 }, on: { opacity: 1, x: 0 } }} transition={{ duration: 0.5, ease: EASE }} className="flex items-center gap-3 rounded-xl bg-white p-2.5">
            <span className="h-8 w-1 rounded-full bg-sky-500" />
            <div className="flex-1"><p className="text-sm font-bold">TCS · Online assessment</p><p className="text-xs text-ink/60">Tue 4 · 10:00 am – 12:00 pm · TCS iON</p></div>
            <Icon name="google" className="size-4 text-ink/40" />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

// A slim bar that appears once you scroll past the hero, with the sign-up button always in reach
function FloatingNav() {
  const { scrollY } = useScroll();
  const [shown, setShown] = useState(false);
  useMotionValueEvent(scrollY, 'change', (v) => setShown(v > 520));
  return (
    <AnimatePresence>
      {shown && (
        <motion.header initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -80, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className="fixed inset-x-0 top-3 z-50 mx-auto flex w-[calc(100%-2rem)] max-w-3xl items-center justify-between rounded-full bg-ink/85 py-2 pl-2 pr-2 text-cream shadow-[0_12px_40px_-12px_rgb(16_35_26/0.6)] ring-1 ring-white/10 backdrop-blur-md">
          <Link to="/" className="rounded-full bg-cream px-3 py-1.5"><Logo /></Link>
          <nav className="flex items-center gap-1">
            <a href="#problems" className="hidden rounded-full px-3 py-2 text-sm font-semibold text-cream/80 transition hover:text-lime md:inline">Why PlaceTrack</a>
            <a href="#calendar" className="hidden rounded-full px-3 py-2 text-sm font-semibold text-cream/80 transition hover:text-lime md:inline">Calendar</a>
            <Link to="/login" className="rounded-full px-3 py-2 text-sm font-semibold transition hover:text-lime">Log in</Link>
            <Link to="/register" className="rounded-full bg-lime px-4 py-2 text-sm font-bold text-ink transition hover:scale-105">Start free</Link>
          </nav>
        </motion.header>
      )}
    </AnimatePresence>
  );
}

// "Never miss an OA again." The two lines slide past each other as you scroll by
function StatementBand() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const left = useTransform(scrollYProgress, [0, 1], ['-8%', '6%']);
  const right = useTransform(scrollYProgress, [0, 1], ['8%', '-6%']);
  const spin = useTransform(scrollYProgress, [0, 1], [0, 180]);
  return (
    <section ref={ref} className="relative overflow-hidden bg-lime px-4 py-20 sm:px-8">
      <motion.div style={{ rotate: spin }} className="absolute right-[6%] top-8 w-14 text-ink"><Spark className="w-14" /></motion.div>
      <div className="mx-auto max-w-7xl text-center">
        <h2 className="display text-[clamp(2.6rem,9vw,8rem)]">
          <motion.span style={{ x: left }} className="block">Never miss</motion.span>
          <motion.span style={{ x: right }} className="block">an OA again.</motion.span>
        </h2>
        <Reveal><Magnetic><Link to="/register" className="sticker mt-10 rotate-2 bg-cream text-base">Make my calendar <Icon name="arrowRight" /></Link></Magnetic></Reveal>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const hero = useRef(null);
  const { scrollYProgress: heroProgress } = useScroll({ target: hero, offset: ['start start', 'end start'] });
  const drift = useTransform(heroProgress, [0, 1], [0, 140]);
  const driftBack = useTransform(heroProgress, [0, 1], [0, -90]);
  const cardY = useTransform(heroProgress, [0, 1], [0, 80]);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 30 });

  return (
    <div className="min-h-screen overflow-x-hidden bg-cream text-ink">
      {/* reading progress across the very top */}
      <motion.div style={{ scaleX: progress }} className="fixed inset-x-0 top-0 z-[60] h-1 origin-left bg-coral" aria-hidden="true" />
      <FloatingNav />

      {/* Hero */}
      <section ref={hero} className="relative overflow-hidden bg-ink text-cream">
        {/* soft lime light that slowly drifts */}
        <motion.div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 size-[34rem] rounded-full bg-lime/10 blur-3xl"
          animate={{ x: [0, -60, 0], y: [0, 40, 0] }} transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }} />

        <motion.header initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}
          className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-8">
          <Link to="/" className="shrink-0 rounded-full bg-cream px-3 py-2 sm:px-4"><Logo /></Link>
          <nav className="flex items-center gap-2">
            <a href="#problems" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-cream/80 transition hover:text-lime sm:inline">Why PlaceTrack</a>
            <a href="#calendar" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-cream/80 transition hover:text-lime sm:inline">Calendar</a>
            <Link to="/login" className="whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold text-cream transition hover:text-lime sm:px-4">Log in</Link>
            <Link to="/register" className="whitespace-nowrap rounded-full bg-lime px-4 py-2.5 text-sm font-bold text-ink transition hover:scale-105 sm:px-5">Start free</Link>
          </nav>
        </motion.header>

        <motion.div style={{ y: drift }} className="absolute bottom-[8%] left-[3%] hidden w-24 -rotate-6 text-lime md:block"><DrawnSquiggle className="w-24 h-8" delay={1.1} /></motion.div>
        <motion.div style={{ y: driftBack }} className="absolute right-[8%] top-[18%] w-12 text-pink">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}><Spark className="w-12" /></motion.div>
        </motion.div>
        <motion.div style={{ y: drift }} className="absolute bottom-[14%] left-[46%] hidden w-9 text-lime lg:block">
          <motion.div animate={{ rotate: -360 }} transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}><Spark className="w-9" /></motion.div>
        </motion.div>

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-24 pt-10 sm:px-8 lg:grid-cols-[1.15fr_1fr] lg:pb-32 lg:pt-16">
          <div>
            <motion.p initial={{ opacity: 0, y: -10, rotate: -8 }} animate={{ opacity: 1, y: 0, rotate: -2 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}
              className="inline-block bg-pink px-3 py-1 font-display text-sm uppercase tracking-wide text-ink">For Indian campus placements</motion.p>
            <h1 className="display mt-6 text-[clamp(2.75rem,6.4vw,6.25rem)]">
              <MaskLines delay={0.1} lines={['Every round.', 'Every deadline.', <span key="l" className="relative inline-block text-lime">One place.
                <motion.span aria-hidden="true" className="absolute -bottom-1 left-0 h-[0.08em] w-full origin-left rounded-full bg-lime/60"
                  initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.9, duration: 0.7, ease: EASE }} /></span>]} />
            </h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.7, ease: EASE }}
              className="mt-7 max-w-lg text-lg text-cream/80">
              Paste the placement cell's message and every round lands on your calendar. Track each application to the offer letter, get a reminder email before every round, and never get caught out by a clash.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.62, duration: 0.7, ease: EASE }}
              className="mt-9 flex flex-wrap items-center gap-5">
              <Magnetic><Link to="/register" className="sticker -rotate-2 text-base">Start tracking <Icon name="arrowRight" /></Link></Magnetic>
              <Link to="/login" className="group relative font-semibold text-cream transition hover:text-lime">
                I already have an account
                <span className="absolute -bottom-1.5 left-0 h-0.5 w-full origin-left bg-lime transition-transform duration-500 ease-out group-hover:scale-x-0 group-hover:origin-right" />
              </Link>
            </motion.div>
          </div>
          <motion.div style={{ y: cardY }} className="flex justify-center lg:justify-end"><CalendarPreview /></motion.div>
        </div>
      </section>

      {/* Ticker of what PlaceTrack keeps track of */}
      <div className="relative -mt-px overflow-hidden border-y-2 border-ink bg-pink py-3" aria-hidden="true">
        <div className="animate-marquee flex w-max whitespace-nowrap font-display text-lg uppercase text-ink">
          {[0, 1].map((k) => (
            <div key={k} className="flex gap-8 pr-8">
              {TICKER.map((t) => <span key={t} className="flex items-center gap-8">{t}<Spark className="w-5 text-ink" /></span>)}
            </div>
          ))}
        </div>
      </div>

      {/* Problems -> fixes */}
      <section id="problems" className="scroll-mt-20 px-4 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <h2 className="display text-[clamp(2.4rem,6vw,4.75rem)]">
              <MaskLines inView lines={['Placement season', <>is <span key="c" className="relative inline-block">chaos.<DrawnSquiggle className="absolute -bottom-2 left-0 h-3 w-full text-coral sm:h-4" delay={0.5} /></span></>]} />
            </h2>
            <Reveal delay={0.2}><p className="mt-6 max-w-xl text-lg text-ink/70">Six problems every student runs into, and how PlaceTrack fixes each one.</p></Reveal>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PROBLEMS.map((p, i) => (
              <motion.article key={p.problem} initial={{ opacity: 0, y: 60, rotate: p.tilt * -3 }} whileInView={{ opacity: 1, y: 0, rotate: p.tilt }}
                viewport={{ once: true, amount: 0.3 }} transition={{ delay: (i % 3) * 0.1, type: 'spring', stiffness: 120, damping: 16 }}
                whileHover={{ rotate: 0, y: -8, scale: 1.02, boxShadow: '10px 10px 0 0 var(--color-ink)', transition: { type: 'spring', stiffness: 400, damping: 20 } }}
                className={`group rounded-[26px] ${p.bg} p-7 ring-2 ring-ink shadow-[6px_6px_0_0_var(--color-ink)]`}>
                <p className="flex items-center justify-between font-display text-sm uppercase text-ink/50">
                  Problem {i + 1}
                  <Icon name="arrowRight" className="size-5 -translate-x-2 text-ink opacity-0 transition duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                </p>
                <h3 className="display mt-2 text-2xl">{p.problem}</h3>
                <p className="mt-4 text-[15px] leading-relaxed text-ink/80">{p.fix}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <StatementBand />

      {/* Calendar spotlight */}
      <section id="calendar" className="scroll-mt-20 bg-ink px-4 py-20 text-cream sm:px-8 sm:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">
          <div>
            <h2 className="display text-[clamp(2.4rem,5.5vw,4.5rem)] text-lime"><MaskLines inView lines={['One calendar', 'for the whole drive.']} /></h2>
            <ul className="mt-8 space-y-4 text-lg text-cream/85">
              {[
                ['calendar', 'Month, week and agenda views of every OA, GD, interview and deadline.'],
                ['alert', 'Clash warnings the moment two rounds overlap.'],
                ['clock', 'A reminder email before every round, written for that round.'],
                ['google', 'Add any round to Google Calendar in one click.'],
              ].map(([icon, text], i) => (
                <motion.li key={text} className="group flex gap-4" initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.6 }} transition={{ delay: 0.15 + i * 0.1, duration: 0.6, ease: EASE }}>
                  <motion.span initial={{ scale: 0, rotate: -30 }} whileInView={{ scale: 1, rotate: 0 }} viewport={{ once: true }}
                    transition={{ delay: 0.25 + i * 0.1, type: 'spring', stiffness: 300, damping: 14 }}
                    className="grid size-10 shrink-0 place-items-center rounded-xl bg-lime text-ink transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110">
                    <Icon name={icon} className="size-5" />
                  </motion.span>
                  <span className="pt-1.5">{text}</span>
                </motion.li>
              ))}
            </ul>
          </div>
          <div className="flex justify-center"><CalendarPreview inView delay={0.1} /></div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <h2 className="display text-[clamp(2.4rem,6vw,4.75rem)]"><MaskLines inView lines={['Three steps.', <span key="z" className="text-coral">Zero chaos.</span>]} /></h2>
          <div className="relative mt-14">
            {/* the path between the steps draws itself in */}
            <svg className="pointer-events-none absolute left-0 top-12 hidden h-10 w-full text-ink/20 md:block" viewBox="0 0 1000 40" preserveAspectRatio="none" aria-hidden="true">
              <motion.path d="M60 20 C 250 -10, 330 50, 500 20 S 760 -10, 940 20" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="1 10" strokeLinecap="round"
                vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 1.4, ease: 'easeInOut', delay: 0.3 }} />
            </svg>
            <ol className="relative grid gap-10 md:grid-cols-3">
              {[
                ['Paste or add', 'Paste the placement cell message, or type in the company. Ten seconds.'],
                ['Rounds land on your calendar', 'OA, GD, interviews, with clashes flagged and a reminder email before each.'],
                ['Move it to offer', 'Drag it across the board as you clear each round. Earn XP. Celebrate.'],
              ].map(([t, d], i) => (
                <motion.li key={t} className="list-none" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }} transition={{ delay: i * 0.15, duration: 0.7, ease: EASE }}>
                  <motion.span className="display inline-block bg-cream pr-3 text-8xl text-lime [-webkit-text-stroke:2px_var(--color-ink)]"
                    initial={{ scale: 0.4, rotate: -12 }} whileInView={{ scale: 1, rotate: 0 }} viewport={{ once: true }}
                    whileHover={{ rotate: -6, scale: 1.08 }} transition={{ delay: 0.1 + i * 0.15, type: 'spring', stiffness: 260, damping: 12 }}>{i + 1}</motion.span>
                  <h3 className="display mt-3 text-2xl">{t}</h3>
                  <p className="mt-2 text-ink/70">{d}</p>
                </motion.li>
              ))}
            </ol>
          </div>
          <Reveal className="mt-16 text-center"><Magnetic><Link to="/register" className="sticker -rotate-1 text-base">Create your free account <Icon name="arrowRight" /></Link></Magnetic></Reveal>
        </div>
      </section>

      {/* Footer with a jagged edge */}
      <footer className="relative">
        <JaggedEdge className="block h-20 w-full text-lime sm:h-28" />
        <div className="overflow-hidden bg-lime px-4 pb-10 sm:px-8">
          <motion.h2 initial="off" whileInView="on" viewport={{ once: true, amount: 0.4 }}
            className="display mx-auto max-w-7xl overflow-hidden text-center text-[clamp(2.5rem,12.5vw,11rem)] leading-[0.85] text-ink" aria-label="PlaceTrack">
            <motion.span className="block" aria-hidden="true" variants={{ off: { y: '100%' }, on: { y: 0, transition: { duration: 1, ease: EASE } } }}>PlaceTrack</motion.span>
          </motion.h2>
          <div className="mx-auto mt-8 flex max-w-7xl flex-col items-center justify-between gap-4 border-t-2 border-ink/15 pt-6 sm:flex-row">
            <Logo />
            <p className="text-sm font-semibold text-ink/70">© {new Date().getFullYear()} PlaceTrack · Built for campus placements</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
