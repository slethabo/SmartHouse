const service = require('./service');
const plansModule = require('../plans');
const { ok } = require('../../utils/response');

/** Route params are validated upstream; coerce to a number for services. */
const idOf = (req) => Number(req.params.id);

async function stats(_req, res) {
  return ok(res, await service.getStats());
}

async function listUsers(_req, res) {
  return ok(res, { items: await service.listUsers() });
}

async function setUserActive(req, res) {
  const user = await service.setUserActive(req.user, idOf(req), req.validated.is_active);
  return ok(res, user, user.is_active ? 'User reactivated.' : 'User deactivated.');
}

async function listPlans(_req, res) {
  // Admins see inactive plans too.
  const { items } = await plansModule.browse({ activeOnly: false });
  return ok(res, { items });
}

async function createPlan(req, res) {
  const plan = await service.createPlan(req.validated, req.user.id);
  return ok(res, plan, `"${plan.name}" has been added.`, 201);
}

async function updatePlan(req, res) {
  const plan = await service.updatePlan(idOf(req), req.validated);
  return ok(res, plan, `"${plan.name}" has been updated.`);
}

async function setPlanActive(req, res) {
  const plan = await service.setPlanActive(idOf(req), req.validated.is_active);
  return ok(res, plan, plan.is_active ? `"${plan.name}" is now visible to clients.` : `"${plan.name}" has been hidden.`);
}

async function deletePlan(req, res) {
  const result = await service.deletePlan(idOf(req));
  return ok(res, result, 'House plan deleted.');
}

async function listRates(_req, res) {
  return ok(res, { items: await service.listRates() });
}

async function updateRate(req, res) {
  const rate = await service.updateRate(req.params.level, req.validated.rate_per_m2);
  return ok(res, rate, `The ${rate.finish_level} rate is now R${Math.round(rate.rate_per_m2).toLocaleString('en-US')} per m².`);
}

module.exports = {
  stats, listUsers, setUserActive,
  listPlans, createPlan, updatePlan, setPlanActive, deletePlan,
  listRates, updateRate,
};
