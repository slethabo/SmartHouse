/**
 * Cost estimator (pure functions, no I/O).
 *
 *   estimated_cost = floor_area_m2 × rate_per_m2(finish_level)
 *
 * The estimate is then split into a breakdown using fixed industry-style
 * shares that sum to 100%, including a 10% contingency.
 */

/** Finish levels in ascending price order. */
const FINISH_LEVELS = ['basic', 'standard', 'premium'];

/** Share of the total estimate attributed to each cost category. */
const BREAKDOWN_SHARES = Object.freeze({
  structure: 0.45,
  finishes: 0.25,
  services: 0.15,
  professional_fees: 0.05,
  contingency: 0.1,
});

/**
 * Validate and coerce a positive number.
 * @param {*} value
 * @param {string} label
 * @returns {number}
 */
function positiveNumber(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`${label} must be a number greater than zero.`);
  }
  return n;
}

/**
 * Estimate the construction cost for a given floor area and rate.
 * @param {number} floorAreaM2 Total floor area in m².
 * @param {number} ratePerM2 Rate in Rand per m².
 * @returns {number} Estimated cost in Rand, rounded to the nearest Rand.
 */
function estimateCost(floorAreaM2, ratePerM2) {
  const area = positiveNumber(floorAreaM2, 'Floor area');
  const rate = positiveNumber(ratePerM2, 'Rate per m²');
  return Math.round(area * rate);
}

/**
 * Split a total into the standard cost categories.
 * Rounding differences are absorbed by the structure line so lines sum exactly.
 * @param {number} total
 * @returns {{structure:number,finishes:number,services:number,professional_fees:number,contingency:number}}
 */
function buildBreakdown(total) {
  const t = Math.max(0, Number(total) || 0);
  const breakdown = {};
  let allocated = 0;
  for (const [key, share] of Object.entries(BREAKDOWN_SHARES)) {
    if (key === 'structure') continue;
    breakdown[key] = Math.round(t * share);
    allocated += breakdown[key];
  }
  breakdown.structure = Math.round(t) - allocated;
  // Return keys in the conventional display order.
  return {
    structure: breakdown.structure,
    finishes: breakdown.finishes,
    services: breakdown.services,
    professional_fees: breakdown.professional_fees,
    contingency: breakdown.contingency,
  };
}

/**
 * Produce low / mid / high estimates (basic / standard / premium) for a plan.
 * @param {number} floorAreaM2
 * @param {Record<'basic'|'standard'|'premium', number>} rates Rate per m² by finish level.
 * @returns {{
 *   levels: Record<'basic'|'standard'|'premium', {finish_level:string, rate_per_m2:number, total:number, breakdown:object}>,
 *   low:number, mid:number, high:number
 * }}
 */
function estimateAllLevels(floorAreaM2, rates) {
  if (!rates) throw new Error('Cost rates are required.');
  const levels = {};
  for (const level of FINISH_LEVELS) {
    if (rates[level] === undefined) throw new Error(`Missing cost rate for "${level}" finish.`);
    const total = estimateCost(floorAreaM2, rates[level]);
    levels[level] = {
      finish_level: level,
      rate_per_m2: Number(rates[level]),
      total,
      breakdown: buildBreakdown(total),
    };
  }
  return {
    levels,
    low: levels.basic.total,
    mid: levels.standard.total,
    high: levels.premium.total,
  };
}

module.exports = { FINISH_LEVELS, BREAKDOWN_SHARES, estimateCost, buildBreakdown, estimateAllLevels };
