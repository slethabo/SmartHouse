/**
 * Admin service: user management, house plan CRUD and cost-rate edits.
 * Cost-rate changes are delegated to the Cost module's public interface.
 */
const repository = require('./repository');
const cost = require('../cost');
const { notFound, badRequest } = require('../../utils/errors');

async function getStats() {
  return repository.stats();
}

async function listUsers() {
  return repository.listUsers();
}

/**
 * Activate or deactivate a user. Guards against locking out the last admin
 * or the admin performing the action.
 */
async function setUserActive(actingUser, id, isActive) {
  if (id === actingUser.id && !isActive) {
    throw badRequest('You cannot deactivate your own account while logged in.');
  }
  if (!isActive) {
    const users = await repository.listUsers();
    const target = users.find((u) => u.id === id);
    if (!target) throw notFound('That user does not exist.');
    if (target.role === 'admin' && target.is_active && (await repository.countActiveAdmins()) <= 1) {
      throw badRequest('There must always be at least one active administrator.');
    }
  }
  const user = await repository.setUserActive(id, isActive);
  if (!user) throw notFound('That user does not exist.');
  return user;
}

async function createPlan(data, createdBy) {
  return repository.createPlan(data, createdBy);
}

async function updatePlan(id, data) {
  const plan = await repository.updatePlan(id, data);
  if (!plan) throw notFound('That house plan does not exist.');
  return plan;
}

async function setPlanActive(id, isActive) {
  const plan = await repository.setPlanActive(id, isActive);
  if (!plan) throw notFound('That house plan does not exist.');
  return plan;
}

async function deletePlan(id) {
  const deleted = await repository.deletePlan(id);
  if (!deleted) throw notFound('That house plan does not exist.');
  return { id };
}

async function listRates() {
  return cost.listRates();
}

async function updateRate(level, ratePerM2) {
  return cost.updateRate(level, ratePerM2);
}

module.exports = {
  getStats, listUsers, setUserActive,
  createPlan, updatePlan, setPlanActive, deletePlan,
  listRates, updateRate,
};
