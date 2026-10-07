/**
 * Public interface of the Plans module (browse, detail, saved plans).
 */
const service = require('./service');
const controller = require('./controller');
const validators = require('./validators');

module.exports = {
  browse: service.browse,
  getDetail: service.getDetail,
  listSaved: service.listSaved,
  savePlan: service.savePlan,
  unsavePlan: service.unsavePlan,
  controller,
  validators,
};
