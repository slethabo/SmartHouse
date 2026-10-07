/**
 * Server entry point: connect to the database, create/seed the schema, then listen.
 */
const config = require('./config');
const db = require('./db/connection');
const { initialise } = require('./db/init');
const createApp = require('./app');

async function main() {
  try {
    await db.connect();
    await initialise();
  } catch (err) {
    console.error('[startup] Could not prepare the database:', err.message);
    console.error('  - If you use an external PostgreSQL, check DATABASE_URL in .env');
    console.error('  - Otherwise make sure port', config.embeddedDb.port, 'is free');
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`[server] Smart House API listening on http://localhost:${config.port} (${config.env})`);
  });

  const shutdown = async (signal) => {
    console.log(`\n[server] ${signal} received, shutting down...`);
    server.close();
    await db.close();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main();
