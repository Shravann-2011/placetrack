const express = require('express');
const { z } = require('zod');
const protect = require('../middleware/auth');
const validate = require('../middleware/validate');
const Application = require('../models/Application');
const Event = require('../models/Event');
const { parsePlacementMessage, MAX_LENGTH } = require('../parser/placementParser');

const parseSchema = z.object({
  text: z.string().trim().min(10, 'Paste the message (at least a sentence)').max(MAX_LENGTH, `Keep it under ${MAX_LENGTH} characters`),
  timezoneOffset: z.number().int().min(-720).max(840).optional(), // minutes ahead of UTC; India = 330
});

const router = express.Router();
router.use(protect);

// POST /api/parse  — read a pasted placement message; nothing is saved here,
// the student reviews the result and then creates the application/events.
router.post('/', validate(parseSchema), async (req, res) => {
  const apps = await Application.find({ user: req.user._id }).select('company role stage').lean();
  const result = parsePlacementMessage(req.body.text, {
    timezoneOffset: req.body.timezoneOffset ?? 330,
    knownCompanies: apps.map((a) => a.company),
  });
  // Already tracking this company? Offer to add the rounds to that application instead.
  const name = result.application.company.toLowerCase();
  const existing = name && apps.filter((a) => a.company.toLowerCase() === name && !['Rejected'].includes(a.stage));
  // ...and say which of its rounds are already on the calendar, so pasting the same message
  // twice doesn't add every round again
  const ids = existing?.length ? existing.map((a) => a._id) : [];
  const booked = ids.length ? await Event.find({ user: req.user._id, application: { $in: ids } }).select('application type start').lean() : [];
  res.json({ data: { ...result, existing: (existing || []).map(({ _id, company, role, stage }) => ({
    _id, company, role, stage,
    events: booked.filter((e) => String(e.application) === String(_id)).map((e) => ({ type: e.type, start: e.start })),
  })) } });
});

module.exports = router;
