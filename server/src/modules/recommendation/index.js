/**
 * Public interface of the Recommendation module.
 */
const engine = require('./engine');
const service = require('./service');

module.exports = {
  recommend: engine.recommend, // pure
  WEIGHTS: engine.WEIGHTS,
  recommendForUser: service.recommendForUser,
  getLastSearch: service.getLastSearch,
};
