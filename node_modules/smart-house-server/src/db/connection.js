/**
 * Database connection module.
 *
 * Exposes a single `query` function (parameterised SQL only) plus lifecycle
 * helpers. Every other module talks to PostgreSQL only through this file, so
 * swapping the driver or the host never touches business logic.
 */
const { Pool } = require('pg');
const config = require('../config');
const embedded = require('./embedded');

/** @type {Pool|null} */
let pool = null;

/**
 * Create the connection pool, starting an embedded PostgreSQL first if no
 * external DATABASE_URL has been configured.
 * @returns {Promise<Pool>}
 */
async function connect() {
  if (pool) return pool;

  let connectionString = config.databaseUrl;
  if (!connectionString) {
    connectionString = await embedded.start(config.embeddedDb);
  }

  pool = new Pool({ connectionString, max: 10 });
  pool.on('error', (err) => {
    console.error('[db] Unexpected pool error:', err.message);
  });

  // Fail fast if the database cannot be reached.
  await pool.query('SELECT 1');
  return pool;
}

/**
 * Run a parameterised SQL query.
 * @param {string} text SQL with $1, $2... placeholders.
 * @param {any[]} [params]
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params = []) {
  if (!pool) throw new Error('Database not connected. Call connect() first.');
  return pool.query(text, params);
}

/**
 * Run several statements inside one transaction.
 * @template T
 * @param {(client: import('pg').PoolClient) => Promise<T>} work
 * @returns {Promise<T>}
 */
async function transaction(work) {
  if (!pool) throw new Error('Database not connected. Call connect() first.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Quick liveness probe used by /health.
 * @returns {Promise<boolean>}
 */
async function ping() {
  try {
    if (!pool) return false;
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

/** Close the pool and stop the embedded server (if any). */
async function close() {
  if (pool) {
    await pool.end();
    pool = null;
  }
  await embedded.stop();
}

module.exports = { connect, query, transaction, ping, close };
