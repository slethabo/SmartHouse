/**
 * Data access for users (auth concerns only).
 */
const db = require('../../db/connection');

const PUBLIC_COLUMNS = 'id, full_name, email, role, is_active, created_at';

/**
 * @param {string} email
 * @returns {Promise<object|null>} Full row including password_hash.
 */
async function findByEmail(email) {
  const { rows } = await db.query(
    `SELECT id, full_name, email, password_hash, role, is_active, created_at
       FROM users WHERE LOWER(email) = LOWER($1)`,
    [email]
  );
  return rows[0] || null;
}

/**
 * @param {number} id
 * @returns {Promise<object|null>} Public columns only.
 */
async function findById(id) {
  const { rows } = await db.query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}

/**
 * @param {{fullName:string,email:string,passwordHash:string,role?:string}} user
 * @returns {Promise<object>} Public columns of the created user.
 */
async function create({ fullName, email, passwordHash, role = 'client' }) {
  const { rows } = await db.query(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES ($1, LOWER($2), $3, $4)
     RETURNING ${PUBLIC_COLUMNS}`,
    [fullName, email, passwordHash, role]
  );
  return rows[0];
}

module.exports = { findByEmail, findById, create };
