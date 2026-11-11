// Runs when no route matched the request
function notFound(req, res, next) {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
}

// Express recognises an error handler by its 4 arguments (err, req, res, next).
// Every error thrown in a route ends up here and is returned as clean JSON.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.statusCode || 500;
  if (status === 500) console.error(err);
  res.status(status).json({
    error: status === 500 ? 'Something went wrong on the server' : err.message,
  });
}

module.exports = { notFound, errorHandler };
