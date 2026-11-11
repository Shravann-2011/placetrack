// The Express app lives here (separate from server.js) so tests can
// import it later with Supertest without starting a real server.
const express = require('express');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Let the app read JSON request bodies
app.use(express.json());

// Health check: proves the API is alive
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'PlaceTrack API is running',
    timestamp: new Date().toISOString(),
  });
});

// These two must stay LAST: unknown routes -> 404, any error -> JSON error
app.use(notFound);
app.use(errorHandler);

module.exports = app;
