// GET/HEAD /api/cron/reminders?key=CRON_SECRET
// Pinged every few minutes by an uptime monitor (UptimeRobot). That ping also
// keeps the free Render server awake, so one URL does both jobs.
const crypto = require('crypto');
const express = require('express');
const { runDueReminders } = require('../services/reminders');

const router = express.Router();

// Constant-time comparison so the secret can't be guessed one character at a time
function keyMatches(given) {
  const secret = process.env.CRON_SECRET;
  if (!secret || typeof given !== 'string') return false;
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(secret).digest();
  return crypto.timingSafeEqual(a, b);
}

router.get('/reminders', async (req, res) => {
  if (!keyMatches(req.get('x-cron-key') || req.query.key)) return res.status(401).json({ error: 'Invalid cron key' });
  const result = await runDueReminders();
  res.json({ data: result });
});

module.exports = router;
