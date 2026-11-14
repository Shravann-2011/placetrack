const Event = require('../models/Event');
const Application = require('../models/Application');
const AppError = require('../utils/AppError');

const WITH_APP = { path: 'application', select: 'company role stage' };

// Other timed events of the same user that overlap [start, end].
// Deadlines (end === start) and all-day events never clash: they don't take up time.
async function findClashes(userId, start, end, excludeId, allDay = false) {
  if (allDay || !(end > start)) return [];
  const filter = {
    user: userId, done: false, allDay: { $ne: true },
    start: { $lt: end }, end: { $gt: start },
    $expr: { $gt: ['$end', '$start'] },
  };
  if (excludeId) filter._id = { $ne: excludeId };
  return Event.find(filter).populate(WITH_APP).sort('start').limit(5);
}

async function ownApplication(req, id) {
  const app = await Application.exists({ _id: id, user: req.user._id });
  if (!app) throw new AppError('Application not found', 404);
}

async function findOwnedEvent(req) {
  const ev = await Event.findOne({ _id: req.params.id, user: req.user._id });
  if (!ev) throw new AppError('Event not found', 404);
  return ev;
}

// GET /api/events?from=&to=[&application=]
async function listEvents(req, res) {
  const { from, to, application } = req.validated.query;
  const filter = { user: req.user._id, start: { $lt: to }, end: { $gte: from } };
  if (application) filter.application = application;
  const data = await Event.find(filter).populate(WITH_APP).sort('start');
  res.json({ data });
}

// POST /api/events
async function createEvent(req, res) {
  const body = { ...req.body };
  await ownApplication(req, body.application);
  body.end ??= body.start;
  const event = await Event.create({ ...body, user: req.user._id });
  await event.populate(WITH_APP);
  const clashes = await findClashes(req.user._id, event.start, event.end, event._id, event.allDay);
  res.status(201).json({ data: event, clashes });
}

// PATCH /api/events/:id
async function updateEvent(req, res) {
  const event = await findOwnedEvent(req);
  event.set(req.body);
  if (req.body.start && !req.body.end && event.end < event.start) event.end = event.start;
  await event.save();
  await event.populate(WITH_APP);
  const clashes = await findClashes(req.user._id, event.start, event.end, event._id, event.allDay);
  res.json({ data: event, clashes });
}

// DELETE /api/events/:id
async function deleteEvent(req, res) {
  const event = await findOwnedEvent(req);
  await event.deleteOne();
  res.status(204).end();
}

module.exports = { listEvents, createEvent, updateEvent, deleteEvent, findClashes };
