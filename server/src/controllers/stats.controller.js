const Application = require('../models/Application');
const { SOURCES } = require('../constants');

// The "forward" journey. Rejected is an exit, not a step, so it's not in the funnel.
const FUNNEL = ['Applied', 'Aptitude/OA', 'GD', 'Technical', 'HR', 'Offer'];
const WEEKS = 8;
const DAY = 24 * 60 * 60 * 1000;
const IST_OFFSET = 330 * 60 * 1000; // weeks are counted in Indian time (Mon–Sun)

// Monday 00:00 IST of the week containing `date`, returned as a UTC timestamp
function weekStartIST(date) {
  const ist = new Date(date.getTime() + IST_OFFSET);
  const daysSinceMonday = (ist.getUTCDay() + 6) % 7;
  ist.setUTCHours(0, 0, 0, 0);
  return ist.getTime() - daysSinceMonday * DAY - IST_OFFSET;
}

// GET /api/applications/stats
// Computed in JavaScript (not a big aggregation pipeline) to keep it readable;
// one student has at most a few hundred applications, so this is fast.
async function getStats(req, res) {
  const apps = await Application.find({ user: req.user._id })
    .select('stage source appliedDate dueDate stageHistory.stage')
    .lean();

  const now = new Date();
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
  const weekAhead = new Date(startOfToday.getTime() + 7 * DAY);

  let responded = 0;
  let dueThisWeek = 0;
  const funnelCounts = FUNNEL.map(() => 0);
  const byStage = {};
  const bySource = Object.fromEntries(SOURCES.map((s) => [s, { total: 0, responded: 0, offers: 0 }]));

  for (const app of apps) {
    byStage[app.stage] = (byStage[app.stage] || 0) + 1;

    // Every stage this application has been in (history + current)
    const reached = new Set([...(app.stageHistory || []).map((h) => h.stage), app.stage]);
    // Furthest forward stage reached. Skipping a round (e.g. no GD) still counts as passing it.
    const furthest = Math.max(0, ...[...reached].map((s) => FUNNEL.indexOf(s))); // every app at least "Applied"
    for (let i = 0; i <= furthest; i++) funnelCounts[i]++;

    // "Response" = the company replied at all: any stage beyond Applied, including a rejection
    const gotResponse = [...reached].some((s) => s !== 'Applied');
    if (gotResponse) responded++;

    const src = bySource[app.source];
    if (src) {
      src.total++;
      if (gotResponse) src.responded++;
      if (reached.has('Offer')) src.offers++;
    }

    const active = !['Offer', 'Rejected'].includes(app.stage);
    if (active && app.dueDate && app.dueDate >= startOfToday && app.dueDate < weekAhead) dueThisWeek++;
  }

  // Applications per week for the last 8 weeks, including empty weeks
  const thisWeek = weekStartIST(now);
  const weekly = Array.from({ length: WEEKS }, (_, i) => ({
    weekStart: new Date(thisWeek - (WEEKS - 1 - i) * 7 * DAY),
    count: 0,
  }));
  for (const app of apps) {
    const idx = WEEKS - 1 - Math.round((thisWeek - weekStartIST(new Date(app.appliedDate))) / (7 * DAY));
    if (idx >= 0 && idx < WEEKS) weekly[idx].count++;
  }

  const total = apps.length;
  res.json({
    data: {
      totals: {
        total,
        active: total - (byStage.Offer || 0) - (byStage.Rejected || 0),
        offers: byStage.Offer || 0,
        rejected: byStage.Rejected || 0,
        responseRate: total ? responded / total : 0,
        dueThisWeek,
      },
      byStage,
      funnel: FUNNEL.map((stage, i) => ({ stage, count: funnelCounts[i] })),
      weekly,
      bySource: Object.entries(bySource)
        .filter(([, v]) => v.total > 0)
        .map(([source, v]) => ({ source, ...v, rate: v.responded / v.total }))
        .sort((a, b) => b.rate - a.rate || b.total - a.total),
    },
  });
}

module.exports = { getStats };
