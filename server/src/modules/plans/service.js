/**
 * Plans service: browsing, detail (with cost estimates) and saved plans.
 */
const repository = require('./repository');
const cost = require('../cost');
const { notFound, badRequest } = require('../../utils/errors');

/**
 * Attach low/mid/high estimates to each plan using one rate lookup.
 * @param {object[]} plans
 */
async function withEstimates(plans) {
  const rates = await cost.getRateMap();
  return plans.map((plan) => {
    const est = cost.estimateAllLevels(plan.floor_area_m2, rates);
    return { ...plan, cost: { low: est.low, mid: est.mid, high: est.high } };
  });
}

/**
 * Browse/search active plans.
 * @param {object} filters Validated query.
 * @param {number} [userId] If given, marks which plans are saved.
 */
async function browse(filters, userId) {
  const [plans, savedIds, styles] = await Promise.all([
    repository.search({ ...filters, activeOnly: filters.activeOnly !== false }),
    userId ? repository.savedIdsForUser(userId) : [],
    repository.listStyles(),
  ]);
  const saved = new Set(savedIds);
  const items = (await withEstimates(plans)).map((p) => ({ ...p, is_saved: saved.has(p.id) }));
  return { items, styles };
}

/**
 * Full detail for one plan including the per-level cost breakdown.
 * @param {number} id
 * @param {number} [userId]
 */
async function getDetail(id, userId) {
  const plan = await repository.findById(id);
  if (!plan || !plan.is_active) throw notFound('That house plan is no longer available.');
  const [estimate, savedIds] = await Promise.all([
    cost.estimateForPlan(plan),
    userId ? repository.savedIdsForUser(userId) : [],
  ]);
  return { ...plan, is_saved: savedIds.includes(plan.id), estimate };
}

/** @param {number} userId */
async function listSaved(userId) {
  const plans = await repository.listSaved(userId);
  return withEstimates(plans.map((p) => ({ ...p, is_saved: true })));
}

/** @param {number} userId @param {number} planId */
async function savePlan(userId, planId) {
  const plan = await repository.findById(planId);
  if (!plan || !plan.is_active) throw badRequest('That house plan is no longer available to save.');
  await repository.save(userId, planId);
  return { plan_id: planId, is_saved: true };
}

/** @param {number} userId @param {number} planId */
async function unsavePlan(userId, planId) {
  await repository.unsave(userId, planId);
  return { plan_id: planId, is_saved: false };
}

module.exports = { browse, getDetail, listSaved, savePlan, unsavePlan };
