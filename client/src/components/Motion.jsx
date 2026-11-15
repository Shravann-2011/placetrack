// Small motion building blocks shared by every page: a segmented control with a
// sliding pill, a heading that rises in word by word, a thin loading bar on route
// changes, and a soft glow that follows the cursor across cards.
import { useEffect, useId, useState } from 'react';
import { useLocation } from 'react-router';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';

const SPRING = { type: 'spring', stiffness: 480, damping: 36 };
const EASE = [0.16, 1, 0.3, 1];

// Tabs where the selected background slides from one option to the next.
// tone="ink" is the dark pill (Calendar, Due Soon), tone="light" the white one (charts).
export function Segmented({ options, value, onChange, label, tone = 'ink', size = 'md' }) {
  const id = useId();
  const pad = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm';
  const track = tone === 'ink' ? 'rounded-xl bg-sand p-1' : 'rounded-lg bg-slate-100 p-0.5';
  const pill = tone === 'ink' ? 'rounded-lg bg-ink shadow-[0_2px_8px_-2px_rgb(16_35_26/0.5)]' : 'rounded-md bg-white shadow-sm ring-1 ring-slate-900/5';
  const on = tone === 'ink' ? 'text-lime' : 'text-slate-900';
  return (
    <LayoutGroup id={id}>
      <div className={`inline-flex ${track}`} role="tablist" aria-label={label}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <motion.button key={o.value} type="button" role="tab" aria-selected={active} onClick={() => onChange(o.value)} whileTap={{ scale: 0.95 }}
              className={`relative flex items-center gap-1.5 font-semibold capitalize transition-colors ${pad} ${size === 'sm' ? 'rounded-md' : 'rounded-lg'} ${active ? on : 'text-slate-500 hover:text-ink'}`}>
              {active && <motion.span layoutId="pill" className={`absolute inset-0 ${pill}`} transition={SPRING} />}
              {o.icon && <span className="relative">{o.icon}</span>}
              <span className="relative">{o.label}</span>
            </motion.button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

// Cross-fades content when a tab changes (key it on the tab value)
export function SwapIn({ id, children, className }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={id} className={className}
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
        transition={{ duration: 0.3, ease: EASE }}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Page headings: each word slides up from behind a mask, one after another.
// Screen readers get the plain text once.
export function RevealText({ text, delay = 0 }) {
  const words = String(text).split(' ');
  return (
    <span aria-label={text} role="text">
      {words.map((w, i) => (
        <span key={i} aria-hidden="true" className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <motion.span className="inline-block" initial={{ y: '105%', rotate: 4 }} animate={{ y: 0, rotate: 0 }}
            transition={{ delay: delay + i * 0.07, duration: 0.65, ease: EASE }}>
            {w}{i < words.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

// Thin lime bar across the top whenever you open another page
export function RouteProgress() {
  const { pathname } = useLocation();
  const [run, setRun] = useState(0);
  useEffect(() => setRun((r) => r + 1), [pathname]);
  return (
    <AnimatePresence>
      {run > 1 && (
        <motion.div key={run} className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[3px] origin-left bg-lime shadow-[0_0_12px_rgb(212_240_76/0.8)]"
          initial={{ scaleX: 0, opacity: 1 }} animate={{ scaleX: 1, opacity: [1, 1, 0] }}
          transition={{ scaleX: { duration: 0.55, ease: EASE }, opacity: { duration: 0.8, times: [0, 0.7, 1] } }} />
      )}
    </AnimatePresence>
  );
}

// One listener for the whole app: cards light up softly where the cursor is.
// Only on devices with a real mouse, and never when reduced motion is on.
export function useSpotlight() {
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let last = null;
    const onMove = (e) => {
      const el = e.target.closest?.('.card, [data-spotlight]');
      if (last && last !== el) last.style.removeProperty('--spot');
      last = el;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
      el.style.setProperty('--spot', '1');
    };
    const onLeave = () => { last?.style.removeProperty('--spot'); last = null; };
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    return () => { document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerleave', onLeave); };
  }, []);
}
