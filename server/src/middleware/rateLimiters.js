const { rateLimit } = require('express-rate-limit');

const skip = () => process.env.NODE_ENV === 'test'; // don't rate-limit automated tests

// General limit for the whole API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip,
  message: { error: 'Too many requests, please try again later' },
});

// Stricter limit for login/register to slow down password guessing
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip,
  message: { error: 'Too many login attempts, please try again in 15 minutes' },
});

module.exports = { apiLimiter, authLimiter };
