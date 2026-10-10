/**
 * Auth service: registration, login and token handling.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const repository = require('./repository');
const { conflict, unauthorized, forbidden } = require('../../utils/errors');

const SALT_ROUNDS = 10;

/** Shared identity for the login-free prototype; never uses a real account. */
async function getPrototypeUser() {
  const db = require('../../db/connection');
  const { rows } = await db.query(
    `INSERT INTO users(full_name,email,password_hash,role)
     VALUES('Prototype Workspace','prototype@smarthouse.invalid','disabled','admin')
     ON CONFLICT(email) DO UPDATE SET full_name=EXCLUDED.full_name, role='admin', is_active=TRUE
     RETURNING id, full_name, email, role, is_active`
  );
  return rows[0];
}

/**
 * Strip anything sensitive before sending a user to the client.
 * @param {object} user
 */
function toPublicUser(user) {
  if (!user) return null;
  const rest = { ...user };
  delete rest.password_hash;
  return rest;
}

/**
 * Sign a JWT for a user.
 * @param {{id:number, role:string}} user
 * @returns {string}
 */
function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
}

/**
 * Verify a JWT and return its payload, or null if invalid/expired.
 * @param {string} token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch {
    return null;
  }
}

/**
 * Register a new client account.
 * @param {{fullName:string,email:string,password:string}} data Already validated.
 * @returns {Promise<{user:object, token:string}>}
 */
async function register({ fullName, email, password }) {
  const existing = await repository.findByEmail(email);
  if (existing) {
    throw conflict('An account with that email already exists. Try logging in instead.');
  }
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await repository.create({ fullName, email, passwordHash, role: 'client' });
  return { user: toPublicUser(user), token: signToken(user) };
}

/**
 * Log a user in with email and password.
 * @param {{email:string,password:string}} data
 * @returns {Promise<{user:object, token:string}>}
 */
async function login({ email, password }) {
  const user = await repository.findByEmail(email);
  // Same message for unknown email and wrong password (no account enumeration).
  const genericError = () => unauthorized('The email or password is incorrect. Please check and try again.');
  if (!user) throw genericError();

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw genericError();
  if (!user.is_active) throw forbidden('This account has been deactivated. Please contact an administrator.');

  return { user: toPublicUser(user), token: signToken(user) };
}

/**
 * Fetch the current user by id (used to hydrate the session).
 * @param {number} id
 */
async function getUserById(id) {
  const user = await repository.findById(id);
  return toPublicUser(user);
}

module.exports = { register, login, getUserById, getPrototypeUser, signToken, verifyToken, toPublicUser };
