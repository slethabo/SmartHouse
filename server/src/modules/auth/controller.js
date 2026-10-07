/**
 * Auth HTTP handlers: thin wrappers that map requests to the service and
 * set/clear the session cookie.
 */
const config = require('../../config');
const service = require('./service');
const { ok } = require('../../utils/response');

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: config.isProduction,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

function setSession(res, token) {
  res.cookie(config.jwt.cookieName, token, COOKIE_OPTIONS);
}

async function register(req, res) {
  const { user, token } = await service.register(req.validated);
  setSession(res, token);
  return ok(res, { user }, 'Welcome! Your account has been created.', 201);
}

async function login(req, res) {
  const { user, token } = await service.login(req.validated);
  setSession(res, token);
  return ok(res, { user }, `Welcome back, ${user.full_name.split(' ')[0]}!`);
}

async function logout(_req, res) {
  res.clearCookie(config.jwt.cookieName, { ...COOKIE_OPTIONS, maxAge: undefined });
  return ok(res, null, 'You have been logged out.');
}

async function me(req, res) {
  return ok(res, { user: req.user || null });
}

module.exports = { register, login, logout, me };
