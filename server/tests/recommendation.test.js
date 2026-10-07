const { recommend, WEIGHTS } = require('../src/modules/recommendation/engine');
const cost = require('../src/modules/cost');

const RATES = { basic: 9500, standard: 12500, premium: 17000 };
const DEPS = { estimateAllLevels: cost.estimateAllLevels, maxCoverage: 0.5 };

const plan = (overrides) => ({
  id: 1,
  name: 'Test Plan',
  bedrooms: 2,
  bathrooms: 1,
  floors: 1,
  floor_area_m2: 100,
  footprint_m2: 100,
  min_plot_size_m2: 250,
  style: 'Modern',
  is_active: true,
  ...overrides,
});

const PLANS = [
  plan({ id: 1, name: 'Studio', bedrooms: 1, floor_area_m2: 45, footprint_m2: 45, min_plot_size_m2: 120 }),
  plan({ id: 2, name: 'Cottage', bedrooms: 2, floor_area_m2: 65, footprint_m2: 65, min_plot_size_m2: 160, style: 'Cottage' }),
  plan({ id: 3, name: 'Bungalow', bedrooms: 3, floor_area_m2: 110, footprint_m2: 110, min_plot_size_m2: 280 }),
  plan({ id: 4, name: 'Loft', bedrooms: 2, floors: 2, floor_area_m2: 95, footprint_m2: 50, min_plot_size_m2: 150 }),
  plan({ id: 5, name: 'Manor', bedrooms: 5, floors: 2, floor_area_m2: 300, footprint_m2: 170, min_plot_size_m2: 500 }),
  plan({ id: 6, name: 'Hidden', floor_area_m2: 50, footprint_m2: 50, min_plot_size_m2: 100, is_active: false }),
];

describe('Recommendation engine', () => {
  test('rejects a zero budget', () => {
    expect(() => recommend({ plotSizeM2: 400, budget: 0 }, PLANS, RATES, DEPS)).toThrow(/Budget must be/);
  });

  test('rejects a zero or negative plot size', () => {
    expect(() => recommend({ plotSizeM2: 0, budget: 1e6 }, PLANS, RATES, DEPS)).toThrow(/Plot size must be/);
    expect(() => recommend({ plotSizeM2: -5, budget: 1e6 }, PLANS, RATES, DEPS)).toThrow(/Plot size must be/);
  });

  test('demo input (400 m², R1,500,000) returns affordable, plot-eligible plans sorted by score', () => {
    const result = recommend({ plotSizeM2: 400, budget: 1500000 }, PLANS, RATES, DEPS);
    const names = result.matches.map((m) => m.plan.name);
    expect(names).toEqual(expect.arrayContaining(['Studio', 'Cottage', 'Bungalow', 'Loft']));
    expect(names).not.toContain('Manor'); // needs a 500 m² plot
    expect(names).not.toContain('Hidden'); // inactive
    for (let i = 1; i < result.matches.length; i++) {
      expect(result.matches[i - 1].score).toBeGreaterThanOrEqual(result.matches[i].score);
    }
    expect(result.noMatch).toBeNull();
  });

  test('tiny plot: nothing fits, suggests the smallest plot needed', () => {
    const result = recommend({ plotSizeM2: 50, budget: 5000000 }, PLANS, RATES, DEPS);
    expect(result.matches).toHaveLength(0);
    expect(result.noMatch).not.toBeNull();
    expect(result.noMatch.details.min_plot_size_needed_m2).toBe(120);
    expect(result.noMatch.suggestions.join(' ')).toMatch(/too small/);
  });

  test('budget too low: suggests how much to increase it by', () => {
    // Cheapest eligible plan is the Studio: 45 × 9,500 = 427,500
    const result = recommend({ plotSizeM2: 400, budget: 300000 }, PLANS, RATES, DEPS);
    expect(result.matches).toHaveLength(0);
    expect(result.noMatch.details.increase_budget_by).toBe(127500);
    expect(result.noMatch.details.cheapest_plan.name).toBe('Studio');
    expect(result.noMatch.suggestions[0]).toMatch(/Increase your budget by about R127,500/);
  });

  test('exact budget boundary: a plan costing exactly the budget is included', () => {
    const budget = 45 * 9500; // Studio at basic finish
    const result = recommend({ plotSizeM2: 150, budget }, PLANS, RATES, DEPS);
    const studio = result.matches.find((m) => m.plan.name === 'Studio');
    expect(studio).toBeDefined();
    expect(studio.best_finish_level).toBe('basic');
    expect(studio.budget_remaining).toBe(0);
    expect(studio.scores.budget_fit).toBe(1);
    expect(studio.reason).toMatch(/right on budget/);

    const justUnder = recommend({ plotSizeM2: 150, budget: budget - 1 }, PLANS, RATES, DEPS);
    expect(justUnder.matches.find((m) => m.plan.name === 'Studio')).toBeUndefined();
  });

  test('plot coverage rule: footprint must be ≤ 50% of the plot', () => {
    // Bungalow footprint 110 needs a plot of ≥ 220 for coverage and ≥ 280 for min plot.
    const small = recommend({ plotSizeM2: 279, budget: 5e6 }, PLANS, RATES, DEPS);
    expect(small.matches.map((m) => m.plan.name)).not.toContain('Bungalow');
    const ok = recommend({ plotSizeM2: 280, budget: 5e6 }, PLANS, RATES, DEPS);
    expect(ok.matches.map((m) => m.plan.name)).toContain('Bungalow');
  });

  test('picks the highest affordable finish level and explains it', () => {
    // Studio: basic 427,500 / standard 562,500 / premium 765,000
    const result = recommend({ plotSizeM2: 150, budget: 600000 }, PLANS, RATES, DEPS);
    const studio = result.matches.find((m) => m.plan.name === 'Studio');
    expect(studio.best_finish_level).toBe('standard');
    expect(studio.affordable_finish_levels).toEqual(['basic', 'standard']);
    expect(studio.reason).toMatch(/about R37,500 under budget at standard finish/);
  });

  test('score uses the 0.5 / 0.3 / 0.2 weighting and match % is 0-100', () => {
    const result = recommend({ plotSizeM2: 400, budget: 1500000 }, PLANS, RATES, DEPS);
    for (const m of result.matches) {
      const expected =
        WEIGHTS.budget_fit * m.scores.budget_fit +
        WEIGHTS.plot_fit * m.scores.plot_fit +
        WEIGHTS.area_utilisation * m.scores.area_utilisation;
      expect(Math.abs(m.score - expected)).toBeLessThan(0.002);
      expect(m.match_percent).toBeGreaterThanOrEqual(0);
      expect(m.match_percent).toBeLessThanOrEqual(100);
    }
  });

  test('filters narrow results and the no-match message mentions them', () => {
    const filtered = recommend({ plotSizeM2: 400, budget: 1500000, filters: { bedrooms: 3 } }, PLANS, RATES, DEPS);
    expect(filtered.matches.map((m) => m.plan.name)).toEqual(['Bungalow']);

    const none = recommend({ plotSizeM2: 400, budget: 1500000, filters: { style: 'Igloo' } }, PLANS, RATES, DEPS);
    expect(none.matches).toHaveLength(0);
    expect(none.noMatch.details.plans_hidden_by_filters).toBeGreaterThan(0);
    expect(none.noMatch.suggestions.join(' ')).toMatch(/Remove your filters/);
  });

  test('respects the result limit', () => {
    const result = recommend({ plotSizeM2: 400, budget: 1500000, limit: 2 }, PLANS, RATES, DEPS);
    expect(result.matches).toHaveLength(2);
    expect(result.meta.affordable).toBe(4);
  });

  test('requires the cost module interface', () => {
    expect(() => recommend({ plotSizeM2: 400, budget: 1e6 }, PLANS, RATES, {})).toThrow(/cost module/);
  });
});
