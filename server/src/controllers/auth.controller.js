const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendMail, isMailConfigured } = require('../services/mailer');
const { buildReminder } = require('../services/reminders');
const AppError = require('../utils/AppError');
const {
  signAccessToken,
  signRefreshToken,
  refreshCookieOptions,
} = require('../utils/tokens');

// Gives the client a new access token (in JSON) and refresh token (in a cookie)
function sendTokens(res, user, status = 200) {
  res.cookie('refreshToken', signRefreshToken(user), refreshCookieOptions());
  res.status(status).json({ user, accessToken: signAccessToken(user) });
}

// POST /api/auth/register
async function register(req, res) {
  const { name, email, password } = req.body;
  if (await User.exists({ email })) {
    throw new AppError('An account with this email already exists', 409);
  }
  const user = await User.create({ name, email, password });
  sendTokens(res, user, 201);
}

// POST /api/auth/login
async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  // Same message for "no user" and "wrong password" so attackers can't
  // find out which emails are registered.
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }
  sendTokens(res, user);
}

// POST /api/auth/refresh  (uses the httpOnly cookie, no body needed)
async function refresh(req, res) {
  const token = req.cookies?.refreshToken;
  if (!token) throw new AppError('No refresh token', 401);

  const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  const user = await User.findById(payload.sub);
  if (!user || user.tokenVersion !== payload.v) {
    throw new AppError('Refresh token is no longer valid', 401);
  }
  sendTokens(res, user); // rotate: issue a fresh refresh token too
}

// POST /api/auth/logout
async function logout(req, res) {
  const token = req.cookies?.refreshToken;
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      // Invalidate every refresh token this user has been given
      await User.updateOne({ _id: payload.sub }, { $inc: { tokenVersion: 1 } });
    } catch {
      // Token already invalid: nothing to revoke
    }
  }
  const { maxAge, ...clearOptions } = refreshCookieOptions();
  res.clearCookie('refreshToken', clearOptions);
  res.json({ message: 'Logged out' });
}

// GET /api/auth/me  (protected)
function me(req, res) {
  res.json({ user: req.user });
}

// PATCH /api/auth/me  (protected)
async function updateMe(req, res) {
  const user = await User.findById(req.user._id);
  if (req.body.name) user.name = req.body.name;
  if (req.body.reminders) user.reminders = { ...user.reminders, ...req.body.reminders };
  await user.save();
  res.json({ user });
}

// POST /api/auth/me/test-email  (protected): proves reminders reach your inbox
async function sendTestEmail(req, res) {
  if (!isMailConfigured()) return res.status(501).json({ error: 'Email is not set up on the server yet' }) // not 503: the app retries 503 as "server waking up";
  const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const sample = {
    type: 'Online assessment', start, end: new Date(+start + 90 * 60 * 1000), allDay: false, mode: 'Online',
    application: { company: 'Sample Company', role: 'Software Engineer' },
    checklist: [
      { text: 'Revise DBMS joins', done: true }, { text: 'Practise 2 DP problems', done: true },
      { text: 'Test webcam and mic', done: false }, { text: 'Keep college ID ready', done: false },
    ],
  };
  const mail = buildReminder(sample, req.user);
  await sendMail({ to: req.user.email, toName: req.user.name, ...mail, subject: `[Test] ${mail.subject}` });
  res.json({ message: `Test email sent to ${req.user.email}` });
}

module.exports = { register, login, refresh, logout, me, updateMe, sendTestEmail };
