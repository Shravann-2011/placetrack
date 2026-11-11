const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');

// Protects a route: requires "Authorization: Bearer <accessToken>".
// On success, the logged-in user is available as req.user.
async function protect(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new AppError('Not logged in', 401);
  }

  const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET); // throws if invalid/expired
  const user = await User.findById(payload.sub);
  if (!user) throw new AppError('User no longer exists', 401);

  req.user = user;
  next();
}

module.exports = protect;
