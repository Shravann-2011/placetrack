const jwt = require('jsonwebtoken');

// Access token: short-lived (15 min), sent in the Authorization header.
function signAccessToken(user) {
  return jwt.sign({ sub: user._id.toString() }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
  });
}

// Refresh token: long-lived (7 days), stored in an httpOnly cookie.
// tokenVersion lets us cancel all refresh tokens on logout.
function signRefreshToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), v: user.tokenVersion },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
  );
}

const isProd = () => process.env.NODE_ENV === 'production';

// httpOnly = JavaScript in the browser cannot read it (protects against XSS).
// secure = only sent over HTTPS (in production).
// sameSite 'lax': in production Vercel forwards /api to Render, so the browser
// only ever talks to ONE site. The cookie is first-party, which avoids browsers
// blocking it as a third-party cookie (Safari does this by default).
function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: isProd(),
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

module.exports = { signAccessToken, signRefreshToken, refreshCookieOptions };
