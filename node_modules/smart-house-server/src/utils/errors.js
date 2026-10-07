/**
 * Application error with an HTTP status code. Thrown by services and turned
 * into a consistent `{ success:false, message }` response by the error handler.
 */
class AppError extends Error {
  /**
   * @param {string} message Plain-language message safe to show to users.
   * @param {number} [status=400] HTTP status code.
   * @param {object} [details] Optional extra data (e.g. field errors).
   */
  constructor(message, status = 400, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.details = details;
  }
}

const badRequest = (message, details) => new AppError(message, 400, details);
const unauthorized = (message = 'Please log in to continue.') => new AppError(message, 401);
const forbidden = (message = 'You do not have permission to do that.') => new AppError(message, 403);
const notFound = (message = 'We could not find what you were looking for.') => new AppError(message, 404);
const conflict = (message) => new AppError(message, 409);

module.exports = { AppError, badRequest, unauthorized, forbidden, notFound, conflict };
