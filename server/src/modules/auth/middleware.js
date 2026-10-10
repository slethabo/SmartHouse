/**
 * Express middleware for authentication and role-based access.
 */
const config = require('../../config');
const service = require('./service');
const { unauthorized, forbidden } = require('../../utils/errors');

/**
 * Read the JWT from the httpOnly cookie (preferred) or Authorization header.
 * @param {import('express').Request} req
 */
function extractToken(req) {
  const fromCookie = req.cookies?.[config.jwt.cookieName];
  if (fromCookie) return fromCookie;
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

/**
 * Attach `req.user` when a valid token is present; never rejects.
 */
async function attachUser(req, _res, next) {
  try {
    if (config.prototypeMode) {
      req.user = await service.getPrototypeUser();
      return next();
    }
    const token = extractToken(req);
    const payload = token ? service.verifyToken(token) : null;
    if (payload) {
      const user = await service.getUserById(payload.sub);
      if (user && user.is_active) req.user = user;
    }
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Require a logged-in user.
 */
function requireAuth(req, _res, next) {
  if (!req.user) return next(unauthorized('Please log in to continue.'));
  next();
}

/**
 * Require one of the given roles.
 * @param {...string} roles
 */
function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized('Please log in to continue.'));
    if (!roles.includes(req.user.role)) {
      return next(forbidden('Only administrators can access this area.'));
    }
    next();
  };
}

module.exports = { attachUser, requireAuth, requireRole };
