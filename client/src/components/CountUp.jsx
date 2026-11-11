import { useEffect, useRef } from 'react';
import { animate, useInView, useReducedMotion } from 'motion/react';

// Counts from 0 to `value` when it scrolls into view (instantly if reduced motion is on).
// Updates the DOM text directly, so React doesn't re-render 60 times a second.
export function CountUp({ value, suffix = '', duration = 0.9 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView) return;
    if (reduce) { el.textContent = `${value}${suffix}`; return; }
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => { el.textContent = `${Math.round(v)}${suffix}`; },
    });
    return () => controls.stop();
  }, [inView, value, suffix, duration, reduce]);

  return <span ref={ref}>{reduce ? `${value}${suffix}` : `0${suffix}`}</span>;
}
