const cost = require('../src/modules/cost');

const RATES = { basic: 9500, standard: 12500, premium: 17000 };

describe('Cost estimator', () => {
  test('estimated cost = floor area × rate', () => {
    expect(cost.estimateCost(100, 9500)).toBe(950000);
    expect(cost.estimateCost(45, 17000)).toBe(765000);
  });

  test('rounds to the nearest Rand', () => {
    expect(cost.estimateCost(33.33, 9500)).toBe(Math.round(33.33 * 9500));
  });

  test('rejects zero or negative floor area and rates', () => {
    expect(() => cost.estimateCost(0, 9500)).toThrow(/greater than zero/);
    expect(() => cost.estimateCost(-10, 9500)).toThrow(/greater than zero/);
    expect(() => cost.estimateCost(100, 0)).toThrow(/greater than zero/);
    expect(() => cost.estimateCost('abc', 9500)).toThrow();
  });

  test('returns low / mid / high for basic / standard / premium', () => {
    const est = cost.estimateAllLevels(100, RATES);
    expect(est.low).toBe(950000);
    expect(est.mid).toBe(1250000);
    expect(est.high).toBe(1700000);
    expect(est.levels.basic.finish_level).toBe('basic');
    expect(est.levels.premium.rate_per_m2).toBe(17000);
  });

  test('breakdown lines sum exactly to the total and contingency is 10%', () => {
    const total = 1234567;
    const b = cost.buildBreakdown(total);
    const sum = Object.values(b).reduce((a, n) => a + n, 0);
    expect(sum).toBe(total);
    expect(b.contingency).toBe(Math.round(total * 0.1));
    expect(b.structure).toBeGreaterThan(b.finishes);
  });

  test('breakdown is included for every finish level', () => {
    const est = cost.estimateAllLevels(80, RATES);
    for (const level of cost.FINISH_LEVELS) {
      const { total, breakdown } = est.levels[level];
      expect(Object.keys(breakdown)).toEqual(['structure', 'finishes', 'services', 'professional_fees', 'contingency']);
      expect(Object.values(breakdown).reduce((a, n) => a + n, 0)).toBe(total);
    }
  });

  test('fails clearly when a rate is missing', () => {
    expect(() => cost.estimateAllLevels(80, { basic: 9500 })).toThrow(/standard/);
    expect(() => cost.estimateAllLevels(80, null)).toThrow(/required/);
  });
});
