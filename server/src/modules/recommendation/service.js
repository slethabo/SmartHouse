/**
 * Recommendation service: loads data, delegates to the pure engine, and
 * records the search for "remember my last search".
 */
const config = require('../../config');
const db = require('../../db/connection');
const cost = require('../cost');
const engine = require('./engine');
const { badRequest } = require('../../utils/errors');

/**
 * Load every active plan with numeric columns as JS numbers.
 */
async function loadActivePlans() {
  const { rows } = await db.query(
    `SELECT id, name, description, bedrooms, bathrooms::float8 AS bathrooms, floors,
            floor_area_m2::float8 AS floor_area_m2, footprint_m2::float8 AS footprint_m2,
            min_plot_size_m2::float8 AS min_plot_size_m2, style, image_url, is_active
       FROM house_plans
      WHERE is_active = TRUE
      ORDER BY id`
  );
  return rows;
}

/**
 * Record a search for the user's history (used to prefill the form next time).
 * @param {number} userId
 * @param {number} plotSizeM2
 * @param {number} budget
 */
async function recordSearch(userId, plotSizeM2, budget) {
  await db.query(
    'INSERT INTO user_searches (user_id, plot_size_m2, budget) VALUES ($1, $2, $3)',
    [userId, plotSizeM2, budget]
  );
}

/**
 * Run a recommendation for a user.
 * @param {number} userId
 * @param {{plotSizeM2:number,budget:number,filters?:object,limit?:number}} input
 */
async function recommendForUser(userId, input) {
  let validated;
  try {
    validated = engine.validateInput(input);
  } catch (err) {
    throw badRequest(err.message);
  }

  const [plans, rates] = await Promise.all([loadActivePlans(), cost.getRateMap()]);

  const result = engine.recommend(input, plans, rates, {
    estimateAllLevels: cost.estimateAllLevels,
    maxCoverage: config.maxPlotCoverage,
  });

  // Fire-and-forget would hide DB failures; await but never fail the request because of it.
  try {
    await recordSearch(userId, validated.plotSizeM2, validated.budget);
  } catch (err) {
    console.warn('[recommendation] Could not record search:', err.message);
  }

  return result;
}

/**
 * The user's most recent search, or null.
 * @param {number} userId
 */
async function getLastSearch(userId) {
  const { rows } = await db.query(
    `SELECT plot_size_m2::float8 AS plot_size_m2, budget::float8 AS budget, created_at
       FROM user_searches WHERE user_id = $1
      ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

module.exports = { recommendForUser, getLastSearch };
