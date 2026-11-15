import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Icon } from './Icon';
import { Modal } from './ui';
import { BADGES, furthestIndex } from '../lib/progress';

// A badge drawn as a sticker, in the same style as the rest of PlaceTrack
export function BadgeSticker({ badge, earned, size = 'md' }) {
  const box = size === 'lg' ? 'size-16 text-xl rounded-2xl' : size === 'sm' ? 'size-9 text-xs rounded-xl' : 'size-11 text-sm rounded-xl';
  const icon = size === 'lg' ? 'size-7' : size === 'sm' ? 'size-4' : 'size-5';
  return (
    <span className={`relative grid shrink-0 place-items-center font-display text-ink ${box} ${
      earned ? `${badge.tone} shadow-[2px_2px_0_0_var(--color-ink)] ring-2 ring-ink` : 'bg-white/10 text-white/30 ring-1 ring-white/15'}`}>
      {earned ? (badge.icon ? <Icon name={badge.icon} className={icon} strokeWidth={3} /> : badge.mark) : <Icon name="lock" className={size === 'lg' ? 'size-6' : 'size-3.5'} />}
    </span>
  );
}

// The strip at the top of the Board: level, XP to the next level, streak, badges
export function GameBar({ progress, onBadges }) {
  const pct = Math.min(100, Math.round((progress.into / progress.span) * 100));
  const { streak } = progress;
  return (
    <section className="relative mt-5 overflow-hidden rounded-2xl bg-ink p-4 text-cream sm:mt-6 sm:p-6" aria-label="Your progress">
      {/* soft lime glow in the corner */}
      <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-lime/15 blur-3xl" aria-hidden="true" />
      <div className="relative grid grid-cols-[minmax(0,1fr)] gap-4 sm:gap-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.2fr)] md:items-center">
        {/* Level + XP */}
        <div>
          <div className="flex items-baseline gap-3">
            <motion.p key={progress.level} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 16 }}
              className="font-display text-4xl leading-none text-lime">LVL {progress.level}</motion.p>
            <p className="text-sm text-cream/70"><span className="font-bold text-cream tabular-nums">{progress.xp}</span> XP</p>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to the next level">
            <motion.div className="h-full rounded-full bg-lime" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
          </div>
          <p className="mt-2 text-xs text-cream/60"><span className="font-semibold text-cream">{progress.toNext} XP</span> to level {progress.level + 1}. Clear a round to earn more.</p>
        </div>

        {/* Streak */}
        <div className="flex items-center gap-4 md:border-l md:border-white/10 md:pl-6">
          <div className={`relative grid size-11 shrink-0 place-items-center rounded-2xl sm:size-14 ${streak.count ? 'bg-coral text-ink' : 'bg-white/10 text-cream/40'}`}>
            <motion.span animate={streak.count ? { scale: [1, 1.12, 1], rotate: [0, -4, 0] } : {}} transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1.2 }}>
              <Icon name="flame" className="size-7" strokeWidth={2.4} />
            </motion.span>
          </div>
          <div className="min-w-0">
            <p className="font-display text-2xl leading-none">{streak.count}<span className="ml-1.5 font-sans text-sm font-semibold text-cream/70">day streak</span></p>
            <div className="mt-2 flex gap-1" aria-label="Activity this week">
              {progress.week.map((d, i) => (
                <span key={i} title={d.active ? 'Active' : d.future ? '' : 'No activity'}
                  className={`grid size-5 place-items-center rounded-md text-[9px] font-bold ${
                    d.active ? 'bg-lime text-ink' : d.today ? 'text-cream ring-1 ring-lime/70' : 'bg-white/10 text-cream/40'}`}>{d.label}</span>
              ))}
            </div>
            <p className="mt-1.5 hidden text-xs text-cream/60 sm:block">{streak.today ? 'Done for today.' : streak.count ? 'Move a card today to keep it going.' : 'Move a card today to start one.'}</p>
          </div>
        </div>

        {/* Badges */}
        <div className="md:border-l md:border-white/10 md:pl-6">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-semibold">Badges <span className="text-cream/50">{progress.earned.size}/{BADGES.length}</span></p>
            <button onClick={onBadges} className="text-xs font-semibold text-lime underline-offset-4 hover:underline">See all</button>
          </div>
          {/* one swipeable row on phones, wrapping on wider screens */}
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
            {BADGES.map((b, i) => (
              <motion.button key={b.id} onClick={onBadges} title={`${b.name}: ${b.how}`} aria-label={`${b.name}${progress.earned.has(b.id) ? ', earned' : ', locked'}. ${b.how}`}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.04 }}
                whileHover={{ y: -3, rotate: progress.earned.has(b.id) ? -6 : 0 }} whileTap={{ scale: 0.92 }}>
                <BadgeSticker badge={b} earned={progress.earned.has(b.id)} size="sm" />
              </motion.button>
            ))}
          </div>
          <p className="mt-2 text-xs text-cream/60">{progress.clearedThisWeek ? `${progress.clearedThisWeek} round${progress.clearedThisWeek === 1 ? '' : 's'} cleared this week.` : 'No rounds cleared this week yet.'}</p>
        </div>
      </div>
    </section>
  );
}

export function BadgesModal({ open, onClose, earned }) {
  return (
    <Modal open={open} onClose={onClose} size="max-w-2xl" title="Badges" description="Earned by moving through rounds on your Board. Rejections never take XP or badges away.">
      <ul className="grid gap-3 px-6 py-5 sm:grid-cols-2">
        {BADGES.map((b) => {
          const has = earned.has(b.id);
          return (
            <li key={b.id} className={`flex items-center gap-3 rounded-xl p-3 ring-1 ${has ? 'bg-cream ring-[#e8e2cf]' : 'bg-slate-50 ring-slate-200'}`}>
              <span className={has ? '' : 'rounded-xl bg-ink p-0.5'}><BadgeSticker badge={b} earned={has} /></span>
              <div className="min-w-0">
                <p className={`text-sm font-bold ${has ? 'text-ink' : 'text-slate-500'}`}>{b.name}</p>
                <p className="text-xs text-slate-500">{b.how}</p>
              </div>
              {has && <Icon name="check" className="ml-auto size-4 shrink-0 text-emerald-600" strokeWidth={3} />}
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}

// Five small segments on each card: how many rounds past "Applied" it has cleared
export function RoundPips({ app }) {
  const furthest = furthestIndex(app);
  const rejected = app.stage === 'Rejected';
  return (
    <div className="mt-2.5 flex gap-1" aria-label={`${furthest} of 5 rounds cleared`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`h-1.5 flex-1 rounded-full ${
          i <= furthest ? (rejected ? 'bg-slate-300' : i === 5 ? 'bg-emerald-500' : 'bg-ink') : 'bg-slate-200'}`} />
      ))}
    </div>
  );
}

// Full-screen moment when you reach a new level
export function LevelUp({ level, onDone }) {
  useEffect(() => {
    if (!level) return;
    const id = setTimeout(onDone, 2200);
    return () => clearTimeout(id);
  }, [level, onDone]);
  return (
    <AnimatePresence>
      {level && (
        <motion.div className="pointer-events-none fixed inset-0 z-[65] grid place-items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="absolute inset-0 bg-ink/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div initial={{ scale: 0.4, rotate: -8, opacity: 0 }} animate={{ scale: 1, rotate: -2, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 14 }}
            className="relative rounded-3xl bg-lime px-10 py-8 text-center shadow-[8px_8px_0_0_var(--color-ink)] ring-4 ring-ink">
            <p className="font-display text-sm uppercase tracking-[0.3em] text-ink/70">Level up</p>
            <p className="font-display text-7xl leading-none text-ink">{level}</p>
            <p className="mt-2 text-sm font-semibold text-ink">Keep clearing rounds.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// "Badge unlocked" cards that slide up at the bottom
export function BadgeUnlocks({ items, onDismiss }) {
  useEffect(() => {
    if (!items.length) return;
    const id = setTimeout(() => onDismiss(items[0].id), 4200);
    return () => clearTimeout(id);
  }, [items, onDismiss]);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[62] flex flex-col items-center gap-2 px-4 lg:bottom-6" aria-live="polite">
      <AnimatePresence>
        {items.map((b) => (
          <motion.div key={b.id} layout initial={{ opacity: 0, y: 40, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-ink py-3 pl-3 pr-5 text-cream shadow-2xl ring-1 ring-white/10">
            <motion.span initial={{ rotate: -180, scale: 0 }} animate={{ rotate: -6, scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 12, delay: 0.15 }}>
              <BadgeSticker badge={b} earned />
            </motion.span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-lime">Badge unlocked</p>
              <p className="text-sm font-bold">{b.name}</p>
              <p className="text-xs text-cream/60">{b.how}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
