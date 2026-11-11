// Runs when no route matched the request
function notFound(req, res, next) {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
}

const AppError = require('../utils/AppError');

// Turns known library errors into the right HTTP status
function normalise(err) {
  if (err instanceof AppError) return err;
  if (err.type === 'entity.parse.failed') return { statusCode: 400, message: 'Malformed JSON body' };
  if (err.type === 'entity.too.large') return { statusCode: 413, message: 'Request body too large' };
  if (err.name === 'TokenExpiredError') return { statusCode: 401, message: 'Token expired' };
  if (err.name === 'JsonWebTokenError') return { statusCode: 401, message: 'Invalid token' };
  if (err.code === 11000) return { statusCode: 409, message: 'Duplicate value' };
  if (err.name === 'CastError') return { statusCode: 400, message: `Invalid ${err.path}` };
  if (err.name === 'ValidationError') return { statusCode: 400, message: err.message };
  return { statusCode: 500, message: 'Something went wrong on the server' };
}

// Express recognises an error handler by its 4 arguments (err, req, res, next).
// In Express 5, errors thrown inside async routes also land here automatically.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const { statusCode, message } = normalise(err);
  if (statusCode === 500) console.error(err);
  res.status(statusCode).json({ error: message });
}

module.exports = { notFound, errorHandler };
