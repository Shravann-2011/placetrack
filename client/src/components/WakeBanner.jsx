import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { onWakeChange } from '../lib/wake';
import { Spinner } from './ui';

// Shown at the top of the screen while a request is waiting for the sleeping server
export function WakeBanner() {
  const [waking, setWaking] = useState(false);
  useEffect(() => onWakeChange(setWaking), []);
  return (
    <AnimatePresence>
      {waking && (
        <motion.div role="status" aria-live="polite"
          initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }}
          className="fixed inset-x-0 top-3 z-[70] mx-auto flex w-fit max-w-[92vw] items-center gap-2.5 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
          <Spinner className="size-4 text-brand-300" />
          Waking up the server, this can take up to a minute…
        </motion.div>
      )}
    </AnimatePresence>
  );
}
