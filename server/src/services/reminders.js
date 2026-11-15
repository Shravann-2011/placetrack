// One reminder email per round, about a day before it.
// runDueReminders() is safe to call as often as you like (every few minutes):
// each event is "claimed" by setting remindedAt BEFORE the email goes out,
// so two overlapping runs can never send the same reminder twice.
const Event = require('../models/Event');
const User = require('../models/User');
const { sendMail, isMailConfigured } = require('./mailer');

const HOUR = 60 * 60 * 1000;
const WINDOW = 24 * HOUR;
const TIME_ZONE = 'Asia/Kolkata'; // campus placements in India: show times in IST
const DEADLINES = ['Registration deadline', 'Offer deadline'];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function whenText(event, now) {
  const fmt = (opts) => new Intl.DateTimeFormat('en-IN', { timeZone: TIME_ZONE, ...opts }).format(event.start);
  const dayOf = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(d);
  const day = dayOf(event.start) === dayOf(now) ? 'today'
    : dayOf(event.start) === dayOf(new Date(now.getTime() + WINDOW)) ? 'tomorrow'
      : `on ${fmt({ weekday: 'long', day: 'numeric', month: 'short' })}`;
  if (event.allDay) return day;
  const time = fmt({ hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
  return `${day} at ${time}`;
}

function buildReminder(event, user, now = new Date()) {
  const company = event.application?.company || 'Your application';
  const what = event.title || event.type;
  const isDeadline = DEADLINES.includes(event.type);
  const when = whenText(event, now);
  const subject = isDeadline ? `⏰ ${company}: ${what} closes ${when}` : `⏰ Reminder: ${company} ${what} ${when}`;

  const total = event.checklist?.length || 0;
  const left = (event.checklist || []).filter((c) => !c.done);
  const link = `${process.env.CLIENT_URL || 'https://placetrack-five.vercel.app'}/calendar`;
  const firstName = (user.name || '').split(' ')[0] || 'there';

  const rows = [
    ['Round', what],
    ['When', when.replace(/^on /, '')],
    event.application?.role && ['Role', event.application.role],
    !isDeadline && event.mode && ['Mode', event.mode],
    event.location && ['Where', event.location],
  ].filter(Boolean);

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#fbf8ee;padding:24px;color:#10231a">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e8e2cf">
      <div style="background:#10231a;padding:18px 24px;color:#d4f04c;font-weight:900;font-size:18px">PlaceTrack</div>
      <div style="padding:24px">
        <p style="margin:0 0 6px">Hi ${esc(firstName)},</p>
        <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3">${esc(company)}: ${esc(what)} ${isDeadline ? 'closes' : 'is'} ${esc(when)}</h1>
        <table style="border-collapse:collapse;width:100%;font-size:14px">
          ${rows.map(([k, v]) => `<tr><td style="padding:6px 0;color:#64748b;width:80px">${esc(k)}</td><td style="padding:6px 0;font-weight:bold">${esc(v)}</td></tr>`).join('')}
        </table>
        ${total ? `<div style="margin-top:18px;padding:14px;background:#f1ecdc;border-radius:12px;font-size:14px">
          <b>Prep checklist: ${total - left.length}/${total} done</b>
          ${left.length ? `<ul style="margin:8px 0 0;padding-left:18px">${left.slice(0, 8).map((c) => `<li>${esc(c.text)}</li>`).join('')}</ul>` : '<p style="margin:6px 0 0">All done. You\'re ready 💪</p>'}
        </div>` : ''}
        <a href="${esc(link)}" style="display:inline-block;margin-top:20px;background:#10231a;color:#d4f04c;padding:12px 18px;border-radius:12px;text-decoration:none;font-weight:bold">Open my calendar</a>
        <p style="margin-top:24px;font-size:12px;color:#64748b">You get one email per round, about a day before. Turn these off any time in PlaceTrack → Settings.</p>
      </div>
    </div>
  </div>`;

  const text = [
    `Hi ${firstName},`, '', `${company}: ${what} ${isDeadline ? 'closes' : 'is'} ${when}.`,
    ...rows.map(([k, v]) => `${k}: ${v}`),
    total ? `\nPrep checklist: ${total - left.length}/${total} done${left.length ? '\n' + left.map((c) => `- ${c.text}`).join('\n') : ''}` : '',
    '', `Open your calendar: ${link}`, '', 'Turn these emails off in PlaceTrack → Settings.',
  ].join('\n');

  return { subject, html, text };
}

async function runDueReminders(now = new Date()) {
  const summary = { checked: 0, sent: 0, failed: 0, skipped: 0 };
  if (!isMailConfigured()) return { ...summary, disabled: true };

  const due = await Event.find({
    done: false,
    remindedAt: null,
    start: { $gt: now, $lte: new Date(now.getTime() + WINDOW) },
  }).populate('application', 'company role stage').limit(200).lean();
  summary.checked = due.length;
  if (!due.length) return summary;

  const users = new Map((await User.find({ _id: { $in: [...new Set(due.map((e) => String(e.user)))] } })
    .select('name email reminders').lean()).map((u) => [String(u._id), u]));

  for (const event of due) {
    const user = users.get(String(event.user));
    // Opted out, or the application is already finished: nothing to remind about
    if (!user || user.reminders?.email === false || ['Offer', 'Rejected'].includes(event.application?.stage)) {
      await Event.updateOne({ _id: event._id }, { remindedAt: now });
      summary.skipped++;
      continue;
    }
    // Claim it first, so a parallel run skips it
    const claimed = await Event.updateOne({ _id: event._id, remindedAt: null }, { remindedAt: now });
    if (!claimed.modifiedCount) continue;
    try {
      await sendMail({ to: user.email, toName: user.name, ...buildReminder(event, user, now) });
      summary.sent++;
    } catch (err) {
      // Give it back so the next run can try again
      await Event.updateOne({ _id: event._id }, { remindedAt: null });
      summary.failed++;
      console.error(`Reminder for event ${event._id} failed:`, err.message);
    }
  }
  return summary;
}

module.exports = { runDueReminders, buildReminder, WINDOW };
