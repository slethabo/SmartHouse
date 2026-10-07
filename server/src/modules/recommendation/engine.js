/**
 * Recommendation engine (pure function, no I/O).
 *
 * Talks to the Cost module only through its public interface
 * (`estimateAllLevels`), which is injected so the engine can be unit-tested
 * without a database.
 *
 * PSEUDOCODE
 * ----------
 * FUNCTION recommend(input, plans, rates):
 *   1. VALIDATE input
 *        IF plot_size <= 0 OR budget <= 0 THEN THROW "must be greater than zero"
 *   2. CANDIDATES = plans WHERE is_active
 *        AND footprint_m2      <= plot_size × MAX_COVERAGE (0.5)
 *        AND min_plot_size_m2  <= plot_size
 *        AND (optional filters: bedrooms >= wanted, floors = wanted, style = wanted)
 *   3. FOR EACH candidate:
 *        cost = estimateAllLevels(floor_area_m2, rates)   // basic / standard / premium
 *   4. AFFORDABLE = candidates WHERE cost.basic <= budget
 *   5. FOR EACH affordable plan:
 *        best_level     = highest finish level whose cost <= budget
 *        budget_fit     = cost[best_level] / budget                  (0..1, higher = budget well used)
 *        plot_fit       = footprint / (plot_size × MAX_COVERAGE)      (0..1, higher = plot well used)
 *        area_util      = floor_area / MAX(floor_area of affordable)  (0..1, bigger home = higher)
 *        score          = 0.5×budget_fit + 0.3×plot_fit + 0.2×area_util
 *      SORT affordable BY score DESC
 *   6. RETURN top N with match% = ROUND(score × 100) and a plain-language reason
 *        e.g. "Fits your plot with room for a garden; about R120,000 under budget at standard finish."
 *   7. IF affordable is empty:
 *        IF candidates is empty  -> suggest a larger plot (smallest plot our plans need) or removing filters
 *        ELSE                    -> suggest increasing the budget by (cheapest basic cost − budget)
 */

const WEIGHTS = Object.freeze({ budget_fit: 0.5, plot_fit: 0.3, area_utilisation: 0.2 });

/** Format Rand for messages (en-ZA style: R1,500,000). */
const rand = (n) => `R${Math.round(n).toLocaleString('en-US')}`;

const clamp01 = (n) => Math.max(0, Math.min(1, n));

/**
 * Validate the user inputs.
 * @param {{plotSizeM2:number,budget:number}} input
 * @returns {{plotSizeM2:number,budget:number}}
 */
function validateInput(input) {
  const plotSizeM2 = Number(input?.plotSizeM2);
  const budget = Number(input?.budget);
  if (!Number.isFinite(plotSizeM2) || plotSizeM2 <= 0) {
    throw new Error('Plot size must be a number greater than zero (in m²).');
  }
  if (!Number.isFinite(budget) || budget <= 0) {
    throw new Error('Budget must be a number greater than zero (in Rand).');
  }
  return { plotSizeM2, budget };
}

/**
 * Apply the optional user filters.
 * @param {object} plan
 * @param {{bedrooms?:number,floors?:number,style?:string}} [filters]
 */
function matchesFilters(plan, filters = {}) {
  if (filters.bedrooms && Number(plan.bedrooms) < Number(filters.bedrooms)) return false;
  if (filters.floors && Number(plan.floors) !== Number(filters.floors)) return false;
  if (filters.style && String(plan.style).toLowerCase() !== String(filters.style).toLowerCase()) return false;
  return true;
}

/**
 * Build the "why this was recommended" sentence.
 */
function buildReason(plan, plotSizeM2, budget, bestLevel) {
  const coverage = Number(plan.footprint_m2) / plotSizeM2;
  let plotPart;
  if (coverage <= 0.25) plotPart = 'Fits your plot with plenty of room for a garden';
  else if (coverage <= 0.4) plotPart = 'Fits your plot with room for a garden';
  else plotPart = 'Makes good use of your plot';

  const diff = budget - bestLevel.total;
  let budgetPart;
  if (diff < 1000) budgetPart = `right on budget at ${bestLevel.finish_level} finish`;
  else budgetPart = `about ${rand(diff)} under budget at ${bestLevel.finish_level} finish`;

  return `${plotPart}; ${budgetPart}.`;
}

/**
 * Build suggestions when nothing matched.
 */
function buildSuggestions({ plotSizeM2, budget, filters, activePlans, candidates, costed, filteredOut }) {
  const suggestions = [];
  const details = {};

  if (candidates.length === 0) {
    const smallest = activePlans
      .map((p) => Math.max(Number(p.min_plot_size_m2), Number(p.footprint_m2) * 2))
      .sort((a, b) => a - b)[0];
    if (smallest !== undefined) {
      details.min_plot_size_needed_m2 = Math.ceil(smallest);
      suggestions.push(`Your plot is too small for our designs. The smallest design needs a plot of about ${Math.ceil(smallest)} m².`);
    } else {
      suggestions.push('There are no active house plans yet. Please check back later.');
    }
  } else {
    const cheapest = costed.slice().sort((a, b) => a.cost.low - b.cost.low)[0];
    const shortfall = cheapest.cost.low - budget;
    details.increase_budget_by = Math.ceil(shortfall);
    details.cheapest_plan = { id: cheapest.plan.id, name: cheapest.plan.name, cost: cheapest.cost.low };
    suggestions.push(`Increase your budget by about ${rand(shortfall)} to afford the ${cheapest.plan.name} at basic finish.`);
  }

  if (filteredOut > 0) {
    details.plans_hidden_by_filters = filteredOut;
    suggestions.push(`Remove your filters (bedrooms, floors or style) to see ${filteredOut} more design${filteredOut === 1 ? '' : 's'}.`);
  }
  if (!filters || Object.keys(filters).length === 0) {
    suggestions.push('Try a different plot size or budget and search again.');
  }

  return {
    message: 'No designs match your plot and budget yet.',
    suggestions,
    details,
    inputs: { plotSizeM2, budget },
  };
}

/**
 * Recommend house plans for a plot size and budget.
 *
 * @param {{plotSizeM2:number,budget:number,filters?:{bedrooms?:number,floors?:number,style?:string},limit?:number}} input
 * @param {object[]} plans All house plans (active and inactive; inactive are ignored).
 * @param {Record<'basic'|'standard'|'premium',number>} rates Rate per m² by finish level.
 * @param {{maxCoverage?:number, estimateAllLevels:Function}} deps Cost module interface and tuning.
 * @returns {{matches:object[], noMatch:object|null, meta:object}}
 */
function recommend(input, plans, rates, deps) {
  if (!deps || typeof deps.estimateAllLevels !== 'function') {
    throw new Error('recommend() requires the cost module interface (estimateAllLevels).');
  }
  const maxCoverage = deps.maxCoverage ?? 0.5;
  const limit = Number(input?.limit) > 0 ? Number(input.limit) : 10;

  // 1. Validate
  const { plotSizeM2, budget } = validateInput(input);
  const filters = input.filters || {};

  // 2. Candidates
  const activePlans = (plans || []).filter((p) => p.is_active !== false);
  const maxFootprint = plotSizeM2 * maxCoverage;
  const plotEligible = activePlans.filter(
    (p) => Number(p.footprint_m2) <= maxFootprint && Number(p.min_plot_size_m2) <= plotSizeM2
  );
  const candidates = plotEligible.filter((p) => matchesFilters(p, filters));
  const filteredOut = plotEligible.length - candidates.length;

  // 3. Cost each candidate
  const costed = candidates.map((plan) => ({
    plan,
    cost: deps.estimateAllLevels(Number(plan.floor_area_m2), rates),
  }));

  // 4. Affordable at the lowest finish level
  const affordable = costed.filter((c) => c.cost.low <= budget);

  if (affordable.length === 0) {
    return {
      matches: [],
      noMatch: buildSuggestions({ plotSizeM2, budget, filters, activePlans, candidates, costed, filteredOut }),
      meta: { plotSizeM2, budget, maxCoverage, candidates: candidates.length, affordable: 0 },
    };
  }

  // 5. Score
  const maxFloorArea = Math.max(...affordable.map((c) => Number(c.plan.floor_area_m2)));
  const scored = affordable.map(({ plan, cost }) => {
    const levelsAsc = Object.values(cost.levels).sort((a, b) => a.total - b.total);
    const affordableLevels = levelsAsc.filter((l) => l.total <= budget);
    const bestLevel = affordableLevels[affordableLevels.length - 1];

    const budget_fit = clamp01(bestLevel.total / budget);
    const plot_fit = clamp01(Number(plan.footprint_m2) / maxFootprint);
    const area_utilisation = clamp01(Number(plan.floor_area_m2) / maxFloorArea);
    const score =
      WEIGHTS.budget_fit * budget_fit + WEIGHTS.plot_fit * plot_fit + WEIGHTS.area_utilisation * area_utilisation;

    return {
      plan,
      cost,
      score: Number(score.toFixed(4)),
      match_percent: Math.round(score * 100),
      scores: {
        budget_fit: Number(budget_fit.toFixed(3)),
        plot_fit: Number(plot_fit.toFixed(3)),
        area_utilisation: Number(area_utilisation.toFixed(3)),
      },
      best_finish_level: bestLevel.finish_level,
      affordable_finish_levels: affordableLevels.map((l) => l.finish_level),
      budget_remaining: Math.round(budget - bestLevel.total),
      plot_coverage_percent: Math.round((Number(plan.footprint_m2) / plotSizeM2) * 100),
      reason: buildReason(plan, plotSizeM2, budget, bestLevel),
    };
  });

  scored.sort((a, b) => b.score - a.score || a.cost.low - b.cost.low);

  // 6. Top results
  return {
    matches: scored.slice(0, limit),
    noMatch: null,
    meta: {
      plotSizeM2,
      budget,
      maxCoverage,
      candidates: candidates.length,
      affordable: affordable.length,
      returned: Math.min(limit, scored.length),
      weights: WEIGHTS,
    },
  };
}

module.exports = { recommend, validateInput, matchesFilters, WEIGHTS };
