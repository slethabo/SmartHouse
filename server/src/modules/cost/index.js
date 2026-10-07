/**
 * Public interface of the Cost module.
 * Other modules must import from here and never from the inner files.
 */
const estimator = require('./estimator');
const service = require('./service');

module.exports = {
  // Pure, synchronous (safe to use in the recommendation engine and tests)
  FINISH_LEVELS: estimator.FINISH_LEVELS,
  BREAKDOWN_SHARES: estimator.BREAKDOWN_SHARES,
  estimateCost: estimator.estimateCost,
  buildBreakdown: estimator.buildBreakdown,
  estimateAllLevels: estimator.estimateAllLevels,
  // Database-backed
  getRateMap: service.getRateMap,
  listRates: service.listRates,
  estimateForPlan: service.estimateForPlan,
  updateRate: service.updateRate,
};
