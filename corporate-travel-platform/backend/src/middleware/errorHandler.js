const logger = require('../utils/logger');

// Wraps an async Express handler so rejected promises reach next(err)
// instead of crashing the process or hanging the request.
function catchAsync(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

// Centralized error formatter. Keeps upstream API error details out of the
// response in production while still logging them server-side for debugging.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode && err.statusCode >= 400 && err.statusCode < 600
    ? err.statusCode
    : 500;

  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} ->`, err);
  } else {
    logger.warn(`${req.method} ${req.originalUrl} ->`, err.message);
  }

  res.status(statusCode).json({
    error: statusCode >= 500 ? 'Something went wrong while fetching live travel data. Please try again.' : err.message,
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: `No route matches ${req.method} ${req.originalUrl}` });
}

module.exports = { catchAsync, errorHandler, notFoundHandler };
