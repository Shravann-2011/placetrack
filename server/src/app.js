// The Express app lives here (separate from server.js) so tests can
// import it later with Supertest without starting a real server.
const express = require('express');
const cookieParser = require('cookie-parser');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiters');
const authRoutes = require('./routes/auth.routes');
const applicationRoutes = require('./routes/application.routes');

const app = express();

// Render/Vercel sit behind a proxy; this lets rate limiting see the real client IP
app.set('trust proxy', 1);

app.use(express.json({ limit: '100kb' })); // read JSON bodies
app.use(cookieParser()); // read cookies (for the refresh token)
app.use('/api', apiLimiter);

// Health check: proves the API is alive
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'PlaceTrack API is running',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);

// These two must stay LAST: unknown routes -> 404, any error -> JSON error
app.use(notFound);
app.use(errorHandler);

module.exports = app;
