/**
 * Central configuration. All values come from environment variables so that
 * no secrets live in source code. A local `.env` file is loaded in development.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const isProduction = process.env.NODE_ENV === 'production';

const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction,
  // Authentication is intentionally disabled throughout this prototype.
  prototypeMode: true,
  port: Number(process.env.PORT) || 3001,
  /** Full connection string for an external PostgreSQL server (optional). */
  databaseUrl: process.env.DATABASE_URL || '',
  /** When no DATABASE_URL is set, an embedded PostgreSQL is started on this port. */
  embeddedDb: {
    port: Number(process.env.EMBEDDED_PG_PORT) || 5433,
    dataDir: process.env.EMBEDDED_PG_DIR || path.join(__dirname, '..', 'data', 'pg'),
    database: 'smarthouse',
    user: 'smarthouse',
    password: process.env.EMBEDDED_PG_PASSWORD || 'smarthouse-local',
  },
  jwt: {
    secret: process.env.JWT_SECRET || (isProduction ? '' : 'dev-only-secret-change-me'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    cookieName: 'sh_token',
  },
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  /** Maximum share of the plot a house footprint may cover (municipal-style rule). */
  maxPlotCoverage: Number(process.env.MAX_PLOT_COVERAGE) || 0.5,
};

if (isProduction && !config.prototypeMode && !config.jwt.secret) {
  throw new Error('JWT_SECRET must be set in production.');
}

module.exports = config;
