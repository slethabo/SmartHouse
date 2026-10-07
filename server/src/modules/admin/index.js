/**
 * Public interface of the Admin module.
 */
const service = require('./service');
const controller = require('./controller');
const validators = require('./validators');

module.exports = { ...service, controller, validators };
