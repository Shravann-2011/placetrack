const Application = require('../models/Application');
const AppError = require('../utils/AppError');

// Escape regex special characters so a search like "C++" doesn't break the query
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Finds one application that belongs to the logged-in user, or throws 404.
// We say "not found" (not "forbidden") for other users' IDs so we don't
// reveal that the ID exists.
async function findOwned(req) {
  const app = await Application.findOne({ _id: req.params.id, user: req.user._id });
  if (!app) throw new AppError('Application not found', 404);
  return app;
}

// GET /api/applications?search=&stage=&source=&type=&dueWithinDays=&sort=&page=&limit=
async function listApplications(req, res) {
  const { page, limit, search, stage, source, type, dueWithinDays, sort } = req.validated.query;

  const filter = { user: req.user._id };
  if (stage) filter.stage = stage;
  if (source) filter.source = source;
  if (type) filter.type = type;
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ company: pattern }, { role: pattern }];
  }
  if (dueWithinDays) {
    // From the start of today, so something due earlier today still shows.
    // Note: uses the server's timezone (UTC on Render), fine at day-level accuracy.
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const until = new Date(startOfToday.getTime() + (dueWithinDays + 1) * 24 * 60 * 60 * 1000);
    filter.dueDate = { $gte: startOfToday, $lt: until };
    filter.stage = filter.stage || { $nin: ['Offer', 'Rejected'] }; // only active ones
  }

  const [data, total] = await Promise.all([
    Application.find(filter)
      .sort(dueWithinDays ? 'dueDate' : sort)
      .skip((page - 1) * limit)
      .limit(limit),
    Application.countDocuments(filter),
  ]);

  res.json({
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// POST /api/applications
async function createApplication(req, res) {
  const app = await Application.create({ ...req.body, user: req.user._id });
  res.status(201).json({ data: app });
}

// GET /api/applications/:id
async function getApplication(req, res) {
  res.json({ data: await findOwned(req) });
}

// PATCH /api/applications/:id   (only the fields that were sent are changed)
async function updateApplication(req, res) {
  const app = await findOwned(req);
  app.set(req.body);
  await app.save(); // save() (not updateOne) so the stage-history hook runs
  res.json({ data: app });
}

// PATCH /api/applications/:id/stage   (Kanban drag-and-drop)
async function updateStage(req, res) {
  const app = await findOwned(req);
  app.stage = req.body.stage;
  await app.save();
  res.json({ data: app });
}

// DELETE /api/applications/:id
async function deleteApplication(req, res) {
  const app = await findOwned(req);
  await app.deleteOne();
  res.status(204).end();
}

module.exports = {
  listApplications,
  createApplication,
  getApplication,
  updateApplication,
  updateStage,
  deleteApplication,
};
