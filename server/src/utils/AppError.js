// An error that carries an HTTP status code, e.g. new AppError('Not found', 404).
// The error handler sends err.message to the client for these.
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = AppError;
