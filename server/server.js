// Entry point: connect to the database first, then start the server.
const app = require('./src/app');
const connectDB = require('./src/config/db');
const { runDueReminders } = require('./src/services/reminders');

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
    // While the server is awake, check for reminders every 10 minutes.
    // (When it's asleep, the UptimeRobot ping to /api/cron/reminders wakes it and runs the same check.)
    const tick = () => runDueReminders().then((r) => r.sent && console.log('Reminders sent:', r.sent)).catch((e) => console.error('Reminder run failed:', e.message));
    setInterval(tick, 10 * 60 * 1000).unref();
    tick();
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
