// The game on the Board: XP for every round you clear, levels, a daily streak and badges.
// Everything is worked out from data PlaceTrack already keeps (each application's stage
// history), so nothing extra is stored and the numbers can never drift out of sync.

// XP for reaching each round. Later rounds are harder, so they're worth more.
export const STAGE_XP = { Applied: 10, 'Aptitude/OA': 20, GD: 30, Technical: 40, HR: 50, Offer: 100 };
const PATH = ['Applied', 'Aptitude/OA', 'GD', 'Technical', 'HR', 'Offer'];
const FOLLOW_UP_XP = 5;

// Each level needs a bit more XP than the last
export const LEVELS = [0, 50, 150, 300, 500, 800, 1200, 1700, 2300, 3000, 4000];

const DAY = 864e5;
const dayKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth() + 1}-${x.getDate()}`; };

// How far along the path an application has got (rejected ones keep what they reached)
export function furthestIndex(app) {
  const reached = [...(app.stageHistory || []).map((h) => h.stage), app.stage];
  return Math.max(0, ...reached.map((s) => PATH.indexOf(s)));
}

export function appXp(app) {
  const furthest = furthestIndex(app);
  let xp = 0;
  for (let i = 0; i <= furthest; i++) xp += STAGE_XP[PATH[i]];
  return xp + (app.followedUpAt ? FOLLOW_UP_XP : 0);
}

// XP you'd gain by moving this card to `stage` (0 for moving back or sideways)
export function xpForMove(app, stage) {
  const target = PATH.indexOf(stage);
  const furthest = furthestIndex(app);
  if (target <= furthest) return 0;
  let xp = 0;
  for (let i = furthest + 1; i <= target; i++) xp += STAGE_XP[PATH[i]];
  return xp;
}

export function levelFor(xp) {
  let level = 1;
  while (level < LEVELS.length && xp >= LEVELS[level]) level++;
  const floor = LEVELS[level - 1];
  const next = LEVELS[level] ?? floor + 1000;
  return { level, floor, next, into: xp - floor, span: next - floor, toNext: next - xp };
}

// Every "forward move": an application entering a later round than any before it
function forwardMoves(apps) {
  const moves = [];
  for (const app of apps) {
    let best = -1;
    const history = [...(app.stageHistory || [])].sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt));
    for (const h of history) {
      const i = PATH.indexOf(h.stage);
      if (i > best) {
        if (best >= 0) moves.push({ app, stage: h.stage, at: new Date(h.changedAt) });
        best = i;
      }
    }
  }
  return moves;
}

// Days on which you did something: added an application, moved one, or followed up
function activeDays(apps) {
  const days = new Set();
  for (const app of apps) {
    for (const h of app.stageHistory || []) days.add(dayKey(h.changedAt));
    if (app.followedUpAt) days.add(dayKey(app.followedUpAt));
  }
  return days;
}

// Consecutive active days ending today (or yesterday, if today hasn't started yet)
function streakOf(days, now) {
  let d = new Date(now);
  const today = days.has(dayKey(d));
  if (!today) d = new Date(+d - DAY);
  let count = 0;
  while (days.has(dayKey(d))) { count++; d = new Date(+d - DAY); }
  return { count, today };
}

export const BADGES = [
  { id: 'first', name: 'First in', how: 'Add your first application', mark: '01', tone: 'bg-lime' },
  { id: 'ten', name: 'Ten deep', how: 'Track 10 applications', mark: '10', tone: 'bg-pink' },
  { id: 'test', name: 'Test cleared', how: 'Get past an online test or aptitude round', icon: 'check', tone: 'bg-sky-200' },
  { id: 'interview', name: 'In the room', how: 'Reach a technical interview', mark: 'T', tone: 'bg-amber-200' },
  { id: 'final', name: 'Final round', how: 'Reach an HR round', mark: 'HR', tone: 'bg-coral' },
  { id: 'offer', name: 'Offer in hand', how: 'Get an offer', icon: 'star', tone: 'bg-lime' },
  { id: 'options', name: 'Options', how: 'Hold two offers at once', mark: '×2', tone: 'bg-emerald-300' },
  { id: 'comeback', name: 'Bounced back', how: 'Clear a round within a week of a rejection', icon: 'arrowUp', tone: 'bg-violet-200' },
  { id: 'streak3', name: 'Three-day run', how: 'Make progress three days in a row', icon: 'flame', tone: 'bg-orange-200' },
  { id: 'week5', name: 'Big week', how: 'Clear five rounds in one week', mark: '5', tone: 'bg-pink' },
];

export function computeProgress(apps, now = new Date()) {
  const xp = apps.reduce((sum, a) => sum + appXp(a), 0);
  const days = activeDays(apps);
  const streak = streakOf(days, now);
  const moves = forwardMoves(apps);
  const weekAgo = +now - 7 * DAY;
  const clearedThisWeek = moves.filter((m) => +m.at >= weekAgo).length;
  const reached = (stage) => apps.some((a) => furthestIndex(a) >= PATH.indexOf(stage));
  const offers = apps.filter((a) => a.stage === 'Offer').length;

  // Rejections, and whether a round was cleared within 7 days after one
  const rejections = apps.flatMap((a) => (a.stageHistory || []).filter((h) => h.stage === 'Rejected').map((h) => +new Date(h.changedAt)));
  const comeback = rejections.some((r) => moves.some((m) => +m.at > r && +m.at - r <= 7 * DAY));
  // Best week ever: the most forward moves in any 7-day window
  const times = moves.map((m) => +m.at).sort((a, b) => a - b);
  let bestWeek = 0;
  for (let i = 0, j = 0; i < times.length; i++) { while (times[i] - times[j] > 7 * DAY) j++; bestWeek = Math.max(bestWeek, i - j + 1); }
  // Longest streak ever, for the three-day badge (a broken streak keeps the badge)
  const sortedDays = [...days].map((k) => { const [y, m, d] = k.split('-').map(Number); return +new Date(y, m - 1, d); }).sort((a, b) => a - b);
  let longest = 0;
  for (let i = 0, run = 0; i < sortedDays.length; i++) { run = i && Math.round((sortedDays[i] - sortedDays[i - 1]) / DAY) === 1 ? run + 1 : 1; longest = Math.max(longest, run); }

  const earned = new Set(Object.entries({
    first: apps.length >= 1,
    ten: apps.length >= 10,
    test: reached('GD') || apps.some((a) => (a.stageHistory || []).some((h) => h.stage === 'Aptitude/OA') && furthestIndex(a) > 1),
    interview: reached('Technical'),
    final: reached('HR'),
    offer: offers >= 1 || reached('Offer'),
    options: offers >= 2,
    comeback,
    streak3: longest >= 3,
    week5: bestWeek >= 5,
  }).filter(([, ok]) => ok).map(([id]) => id));

  // Which days of the current week (Mon–Sun) had activity, for the little week strip
  const monday = new Date(now); monday.setHours(0, 0, 0, 0); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(+monday + i * DAY);
    return { label: 'MTWTFSS'[i], active: days.has(dayKey(d)), today: dayKey(d) === dayKey(now), future: +d > +now };
  });

  return { xp, ...levelFor(xp), streak, clearedThisWeek, earned, week };
}
