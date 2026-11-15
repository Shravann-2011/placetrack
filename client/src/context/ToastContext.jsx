import { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Icon } from '../components/Icon';

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'success') => {
    const id = crypto.randomUUID();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  const dismiss = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] lg:bottom-4 flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6" aria-live="polite">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div key={t.id} layout drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.6}
              onDragEnd={(_, info) => Math.abs(info.offset.x) > 70 && dismiss(t.id)}
              initial={{ opacity: 0, y: 24, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, x: 40, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 460, damping: 28 }}
              className="pointer-events-auto relative flex cursor-grab touch-pan-y items-center gap-3 overflow-hidden rounded-xl bg-ink py-3 pl-3 pr-4 text-sm font-medium text-cream shadow-[0_12px_32px_-8px_rgb(16_35_26/0.55)] ring-1 ring-white/10 active:cursor-grabbing">
              <motion.span initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 14, delay: 0.08 }}
                className={`grid size-6 shrink-0 place-items-center rounded-full ${t.type === 'error' ? 'bg-coral text-ink' : 'bg-lime text-ink'}`}>
                <Icon name={t.type === 'error' ? 'alert' : 'check'} className="size-3.5" strokeWidth={3} />
              </motion.span>
              {t.message}
              {/* drains over the 3.5 s the toast is on screen */}
              <motion.span className={`absolute inset-x-0 bottom-0 h-0.5 origin-left ${t.type === 'error' ? 'bg-coral' : 'bg-lime'}`}
                initial={{ scaleX: 1 }} animate={{ scaleX: 0 }} transition={{ duration: 3.5, ease: 'linear' }} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
