/**
 * Creates the schema and seeds demo data on first run.
 * Runs schema.sql every start (it is idempotent) and seed.sql only when the
 * users table is empty, so an existing database is never overwritten.
 */
const fs = require('fs');
const path = require('path');
const db = require('./connection');

/**
 * Apply schema.sql and, if the database is empty, seed.sql.
 * @returns {Promise<{seeded:boolean}>}
 */
async function initialise() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await db.query(schema);

  const { rows } = await db.query('SELECT COUNT(*)::int AS count FROM users');
  if (rows[0].count > 0) return { seeded: false };

  const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
  await db.query(seed);
  console.log('[db] Seeded demo users, house plans and cost rates.');
  return { seeded: true };
}

module.exports = { initialise };
