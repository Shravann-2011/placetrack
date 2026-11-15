import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Icon } from './Icon';
import { Modal } from './ui';

// Restarts its children every `every` ms, so a little scene plays on a loop
function useLoop(every) {
  const [round, setRound] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setRound((r) => r + 1), every);
    return () => clearInterval(id);
  }, [every]);
  return round;
}

const ease = [0.22, 1, 0.36, 1];
// A highlighter stroke that sweeps across a word
const Mark = ({ children, delay, color = 'bg-lime' }) => (
  <span className="relative inline-block whitespace-nowrap">
    <motion.span className={`absolute inset-x-[-2px] inset-y-[1px] -z-0 origin-left rounded-[3px] ${color}`}
      initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay, duration: 0.45, ease }} />
    <span className="relative">{children}</span>
  </span>
);

// "Paste a message": a WhatsApp-style message is read, the key bits light up,
// and they turn into an application and a calendar entry.
export function PasteDemo() {
  const round = useLoop(6200);
  return (
    <div className="relative h-[168px] overflow-hidden rounded-xl bg-sand/70 p-3 ring-1 ring-[#e8e2cf]" aria-hidden="true">
      <div key={round} className="grid h-full grid-cols-[1.15fr_1fr] gap-3">
        {/* The pasted message */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}
          className="relative self-start rounded-xl rounded-tl-sm bg-white p-2.5 text-[10.5px] leading-[1.55] text-slate-600 shadow-sm">
          <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-emerald-700">Placement Cell</p>
          <p><Mark delay={0.9}>Infosys</Mark> is visiting campus.</p>
          <p>Role: <Mark delay={1.3} color="bg-pink">Systems Engineer</Mark></p>
          <p>Online test on <Mark delay={1.7} color="bg-sky-200">20 Nov, 10 AM</Mark></p>
          <p className="truncate text-slate-400">Register: forms.gle/…</p>
          <motion.span className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-ink text-lime shadow"
            initial={{ scale: 0 }} animate={{ scale: [0, 1.15, 1] }} transition={{ delay: 0.5, duration: 0.4 }}>
            <Icon name="sparkles" className="size-3.5" />
          </motion.span>
        </motion.div>

        {/* What PlaceTrack makes of it */}
        <div className="flex flex-col gap-2">
          <motion.div initial={{ opacity: 0, x: -24, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ delay: 2.4, duration: 0.5, ease }}
            className="flex items-center gap-2 rounded-lg bg-white p-2 shadow-sm ring-1 ring-[#e8e2cf]">
            <span className="grid size-6 shrink-0 place-items-center rounded-md bg-ink font-display text-[10px] text-lime">IN</span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[11px] font-bold text-ink">Infosys</p>
              <p className="truncate text-[9.5px] text-slate-500">Systems Engineer</p>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: -24, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ delay: 2.9, duration: 0.5, ease }}
            className="flex items-center gap-2 rounded-lg bg-white p-2 shadow-sm ring-1 ring-[#e8e2cf]">
            <span className="w-7 shrink-0 overflow-hidden rounded-md text-center ring-1 ring-[#e8e2cf]">
              <span className="block bg-ink text-[7px] font-bold leading-[11px] text-lime">NOV</span>
              <span className="block font-display text-[11px] leading-[15px] text-ink">20</span>
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[11px] font-bold text-ink">Online test</p>
              <p className="truncate text-[9.5px] text-slate-500">10:00 AM</p>
            </div>
          </motion.div>
          <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 3.6, duration: 0.4 }}
            className="mt-auto flex items-center gap-1 text-[10px] font-bold text-emerald-700">
            <Icon name="check" className="size-3" strokeWidth={3} /> Added to your board and calendar
          </motion.p>
        </div>
      </div>
    </div>
  );
}

// Types a word out letter by letter
const Typed = ({ text, delay }) => (
  <motion.span className="inline-block overflow-hidden whitespace-nowrap align-bottom"
    initial={{ width: 0 }} animate={{ width: 'auto' }} transition={{ delay, duration: text.length * 0.06, ease: 'linear' }}>{text}</motion.span>
);

// "Add application": a short form fills in, and the card lands in the Applied column
export function AddDemo() {
  const round = useLoop(6200);
  return (
    <div className="relative h-[168px] overflow-hidden rounded-xl bg-sand/70 p-3 ring-1 ring-[#e8e2cf]" aria-hidden="true">
      <div key={round} className="grid h-full grid-cols-[1.1fr_1fr] gap-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}
          className="space-y-1.5 self-start rounded-xl bg-white p-2.5 shadow-sm">
          {[['Company', 'Zoho', 0.6], ['Role', 'Developer', 1.2], ['Applied on', '12 Nov', 1.9]].map(([label, value, d]) => (
            <div key={label}>
              <p className="text-[8.5px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
              <p className="h-[18px] rounded-[5px] px-1.5 text-[10.5px] font-semibold leading-[18px] text-ink ring-1 ring-slate-200"><Typed text={value} delay={d} /></p>
            </div>
          ))}
          <motion.span initial={{ scale: 1 }} animate={{ scale: [1, 0.92, 1] }} transition={{ delay: 3.1, duration: 0.25 }}
            className="mt-1 block rounded-[6px] bg-ink py-1 text-center text-[10px] font-bold text-lime">Save</motion.span>
        </motion.div>

        {/* The board column it lands in */}
        <div className="rounded-xl bg-white/60 p-2 ring-1 ring-[#e8e2cf]">
          <p className="mb-1.5 flex items-center gap-1 text-[9.5px] font-bold text-slate-600"><span className="size-1.5 rounded-full bg-slate-400" /> Applied</p>
          <motion.div initial={{ opacity: 0, y: -40, rotate: -6, scale: 0.9 }} animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
            transition={{ delay: 3.4, type: 'spring', stiffness: 260, damping: 18 }}
            className="mb-1.5 rounded-lg bg-white p-1.5 shadow-md ring-2 ring-lime">
            <p className="text-[10.5px] font-bold text-ink">Zoho</p>
            <p className="text-[9px] text-slate-500">Developer</p>
          </motion.div>
          <motion.div animate={{ y: [0, 0, 6] }} transition={{ delay: 3.4, duration: 0.3, times: [0, 0.1, 1] }} className="space-y-1.5">
            <div className="h-8 rounded-lg bg-white/80 ring-1 ring-slate-200" />
            <div className="h-8 rounded-lg bg-white/80 ring-1 ring-slate-200" />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

const EXPLAIN = {
  paste: {
    title: 'Paste a message',
    body: 'Got a drive notice on WhatsApp or email? Paste it in. PlaceTrack picks out the company, role, pay and every date, and sets it all up for you to check.',
    best: 'Best for messages from your placement cell',
    Demo: PasteDemo,
  },
  add: {
    title: 'Add an application',
    body: 'Fill in a short form yourself: company, role and where you are. Good for off-campus applications, referrals or anything without a message.',
    best: 'Best when there is nothing to paste',
    Demo: AddDemo,
  },
};

// A button with a small "?" that explains what it does. Hovering the button for a moment
// (on a computer) or tapping the "?" (on a phone) opens a card with a short animation.
export function ExplainedButton({ kind, onClick, className, children, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const timer = useRef(null);
  const info = EXPLAIN[kind];
  const hoverable = typeof window !== 'undefined' && window.matchMedia?.('(hover: hover)').matches;

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const enter = () => { if (hoverable) { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(true), 550); } };
  const leave = () => { if (hoverable) { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(false), 180); } };

  return (
    <span className="relative inline-flex" onMouseEnter={enter} onMouseLeave={leave}>
      <button className={className} onClick={() => { setOpen(false); onClick(); }}>{children}</button>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={`What does "${info.title}" do?`}
        className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-white text-[11px] font-black text-ink shadow ring-1 ring-ink/15 transition hover:scale-110 before:absolute before:-inset-2 before:content-['']">
        ?
      </button>
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-30 bg-ink/30 sm:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.div role="dialog" aria-label={info.title}
              initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className={`z-40 w-auto rounded-2xl bg-white p-4 shadow-xl ring-1 ring-[#e8e2cf] max-sm:fixed max-sm:inset-x-4 max-sm:bottom-24 sm:absolute sm:top-full sm:mt-3 sm:w-[330px] ${align === 'left' ? 'sm:left-0' : 'sm:right-0'} ${align === 'left' ? 'sm:origin-top-left' : 'sm:origin-top-right'}`}>
              <info.Demo />
              <h3 className="mt-3 font-display text-base uppercase text-ink">{info.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{info.body}</p>
              <p className="mt-2 text-xs font-semibold text-emerald-800">{info.best}</p>
              <div className="mt-3 flex gap-2">
                <button className="btn-primary flex-1" onClick={() => { setOpen(false); onClick(); }}>Try it</button>
                <button className="btn-ghost" onClick={() => setOpen(false)}>Close</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </span>
  );
}

// First visit: the two ways to get a company into PlaceTrack, side by side
export function WelcomeGuide({ open, onClose, onPaste, onAdd, name }) {
  return (
    <Modal open={open} onClose={onClose} size="max-w-3xl" title={`Welcome${name ? `, ${name}` : ''}. Here's how PlaceTrack works`}
      description="Every company you apply to becomes a card that moves through the rounds. There are two ways to add one.">
      <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
        {[['paste', onPaste, 'btn-lime', 'paste'], ['add', onAdd, 'btn-primary', 'plus']].map(([kind, action, btn, icon], i) => {
          const info = EXPLAIN[kind];
          return (
            <motion.div key={kind} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.12, ease, duration: 0.5 }}
              className="flex flex-col rounded-2xl border border-[#e8e2cf] bg-cream/60 p-4">
              <p className="mb-2 font-display text-xs uppercase tracking-wider text-slate-500">Option {i + 1}</p>
              <info.Demo />
              <h3 className="mt-3 font-display text-lg uppercase text-ink">{info.title}</h3>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-600">{info.body}</p>
              <button className={`${btn} mt-4`} onClick={action}><Icon name={icon} /> {info.title}</button>
            </motion.div>
          );
        })}
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2"><Icon name="trophy" className="size-4 text-ink" /> Move cards forward on the <strong className="text-ink">Board</strong> to earn XP, keep a streak and unlock badges.</p>
        <button className="btn-ghost shrink-0" onClick={onClose}>I'll explore myself</button>
      </div>
    </Modal>
  );
}
