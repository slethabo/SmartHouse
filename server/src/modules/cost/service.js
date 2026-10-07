/**
 * Cost module service: combines stored rates with the pure estimator.
 */
const repository = require('./repository');
const estimator = require('./estimator');
const { badRequest, notFound } = require('../../utils/errors');

/**
 * Load the current rates as a map keyed by finish level.
 * @returns {Promise<Record<'basic'|'standard'|'premium', number>>}
 */
async function getRateMap() {
  const rows = await repository.findAll();
  const map = {};
  for (const row of rows) map[row.finish_level] = Number(row.rate_per_m2);
  for (const level of estimator.FINISH_LEVELS) {
    if (map[level] === undefined) {
      throw new Error(`Cost rate for "${level}" finish is missing from the database.`);
    }
  }
  return map;
}

/**
 * List the rate rows (for admin screens and the help drawer).
 * @returns {Promise<object[]>}
 */
async function listRates() {
  return repository.findAll();
}

/**
 * Estimate all finish levels for a plan using the current rates.
 * @param {{floor_area_m2:number}} plan
 * @param {Record<string,number>} [rates] Optional pre-loaded rate map (avoids a DB round trip).
 * @returns {Promise<ReturnType<typeof estimator.estimateAllLevels>>}
 */
async function estimateForPlan(plan, rates) {
  const rateMap = rates || (await getRateMap());
  return estimator.estimateAllLevels(plan.floor_area_m2, rateMap);
}

/**
 * Change the rate for a finish level (admin).
 * @param {string} finishLevel
 * @param {number} ratePerM2
 */
async function updateRate(finishLevel, ratePerM2) {
  if (!estimator.FINISH_LEVELS.includes(finishLevel)) {
    throw badRequest('Finish level must be basic, standard or premium.');
  }
  const rate = Number(ratePerM2);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw badRequest('Rate per m² must be a number greater than zero.');
  }
  const updated = await repository.updateRate(finishLevel, rate);
  if (!updated) throw notFound('That finish level does not exist.');
  return updated;
}

module.exports = { getRateMap, listRates, estimateForPlan, updateRate };
