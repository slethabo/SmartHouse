/**
 * Zero-config local database: downloads nothing at runtime, but starts the
 * PostgreSQL binaries shipped by the `embedded-postgres` npm package.
 * Used only when DATABASE_URL is not set (local development / demos).
 */
const fs = require('fs');
const path = require('path');

/** @type {import('embedded-postgres').default|null} */
let instance = null;

/**
 * Start (and on first run initialise) the embedded PostgreSQL cluster.
 * @param {{port:number,dataDir:string,database:string,user:string,password:string}} opts
 * @returns {Promise<string>} A connection string for the created database.
 */
async function start(opts) {
  if (instance) return buildUrl(opts);

  // embedded-postgres is an ES module; load it dynamically from CommonJS.
  const { default: EmbeddedPostgres } = await import('embedded-postgres');

  fs.mkdirSync(opts.dataDir, { recursive: true });
  const alreadyInitialised = fs.existsSync(path.join(opts.dataDir, 'PG_VERSION'));

  instance = new EmbeddedPostgres({
    databaseDir: opts.dataDir,
    user: opts.user,
    password: opts.password,
    port: opts.port,
    persistent: true,
    onLog: () => {}, // keep the console quiet; errors still surface via onError
    onError: (msg) => console.error('[embedded-pg]', String(msg).trim()),
  });

  if (!alreadyInitialised) {
    console.log('[db] First run: initialising embedded PostgreSQL cluster...');
    await instance.initialise();
  }

  await instance.start();

  try {
    await instance.createDatabase(opts.database);
  } catch (err) {
    // Database already exists on subsequent runs; anything else is fatal.
    if (!/already exists/i.test(String(err.message || err))) throw err;
  }

  console.log(`[db] Embedded PostgreSQL running on port ${opts.port}`);
  return buildUrl(opts);
}

/** Stop the embedded server if it is running. */
async function stop() {
  if (!instance) return;
  try {
    await instance.stop();
  } finally {
    instance = null;
  }
}

function buildUrl(o) {
  return `postgresql://${encodeURIComponent(o.user)}:${encodeURIComponent(o.password)}@localhost:${o.port}/${o.database}`;
}

module.exports = { start, stop };
