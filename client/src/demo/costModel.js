import defaultBenchmarks from './material_price_benchmarks.json';

/** One area-rate baseline for selection, budget search and itemised estimates. */
export function constructionAllowance(area, finish, benchmarks = defaultBenchmarks) {
  const costs = benchmarks?.rates?.constructionCosts;
  const rate = costs?.finishRatesPerM2?.[String(finish || 'Basic').toLowerCase()]?.unitPrice;
  const shares = costs?.costShares;
  if (!Number.isFinite(area) || area <= 0 || !Number.isFinite(rate) || rate <= 0 || !shares) throw new Error('Valid floor area and construction rates are required.');
  const constructionBase = Math.round(area * rate);
  const professionalFees = Math.round(constructionBase * shares.professionalFees);
  const contingency = Math.round(constructionBase * shares.contingency);
  return { constructionBase, professionalFees, contingency, total: constructionBase + professionalFees + contingency,
    rate: rate * (1 + shares.professionalFees + shares.contingency), baseRate: rate };
}
