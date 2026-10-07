/**
 * Public interface of the Auth module.
 */
const service = require('./service');
const middleware = require('./middleware');
const controller = require('./controller');
const validators = require('./validators');

module.exports = {
  register: service.register,
  login: service.login,
  getUserById: service.getUserById,
  attachUser: middleware.attachUser,
  requireAuth: middleware.requireAuth,
  requireRole: middleware.requireRole,
  controller,
  validators,
};
