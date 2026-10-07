/**
 * Central error handling. Every error becomes `{ success:false, message, data }`.
 * Technical details are logged on the server, never sent to the browser.
 */
const { AppError } = require('../utils/errors');
const { fail } = require('../utils/response');

/** 404 for unknown API routes. */
function notFoundHandler(req, res) {
  return fail(res, `No API route matches ${req.method} ${req.originalUrl}.`, 404);
}

/** Map low-level errors to friendly messages. */
function translate(err) {
  if (err instanceof AppError) return { status: err.status, message: err.message, data: err.details ?? null };

  // Body parser JSON errors
  if (err.type === 'entity.parse.failed') {
    return { status: 400, message: 'The request body is not valid JSON.', data: null };
  }
  if (err.type === 'entity.too.large') {
    return { status: 413, message: 'The request is too large.', data: null };
  }
  // PostgreSQL errors (https://www.postgresql.org/docs/current/errcodes-appendix.html)
  if (typeof err.code === 'string') {
    if (err.code === '23505') return { status: 409, message: 'That record already exists.', data: null };
    if (err.code === '23503') return { status: 409, message: 'That record is still in use and cannot be removed.', data: null };
    if (err.code === '23514' || err.code === '22P02' || err.code === '22003') {
      return { status: 400, message: 'One of the values is out of range. Please check the form and try again.', data: null };
    }
    if (err.code === 'ECONNREFUSED' || err.code === '57P01' || err.code === '08006' || err.code === '08001') {
      return { status: 503, message: 'The database is not available right now. Please try again in a moment.', data: null };
    }
  }
  return { status: 500, message: 'Something went wrong on our side. Please try again.', data: null };
}

// Express identifies error middleware by its 4-argument signature; `_next` is required.
function errorHandler(err, req, res, _next) {
  const { status, message, data } = translate(err);
  if (status >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}:`, err);
  }
  return fail(res, message, status, data);
}

module.exports = { errorHandler, notFoundHandler };
