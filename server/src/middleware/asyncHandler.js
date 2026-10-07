/**
 * Wrap an async route handler so rejected promises reach the error handler.
 * @param {(req, res, next) => Promise<any>} fn
 */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
