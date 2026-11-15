// One reminder email per round, about a day before it.
// runDueReminders() is safe to call as often as you like (every few minutes):
// each event is "claimed" by setting remindedAt BEFORE the email goes out,
// so two overlapping runs can never send the same reminder twice.
const Event = require('../models/Event');
const User = require('../models/User');
const { sendMail, isMailConfigured } = require('./mailer');
const { buildReminder } = require('./reminderEmail');

const HOUR = 60 * 60 * 1000;
const WINDOW = 24 * HOUR;

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
