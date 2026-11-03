import { getArchitecturalStyle } from './architecturalStyles';

/** Cost estimator (pure functions, no I/O). */
/** Finish levels in ascending price order. */
const FINISH_LEVELS = ['basic', 'standard', 'premium'];

/** Existing demo rates used only for the unpriced remainder allowance. */
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

const CATALOGUE_PRODUCTS = Object.freeze([
  { id: 133, key: 'bricks', label: 'Exterior wall bricks', unit: 'each', kind: 'brick', assumption: '2.8 m wall height; openings deducted; 50 bricks/m² plus 5% waste.' },
  { id: 412, key: 'concrete', label: 'Concrete slab mix', unit: 'm³', kind: 'concrete', assumption: '100 mm slab thickness over the gross floor area.' },
  { id: 9882, key: 'gutters', label: 'Domestic gutters (6 m lengths)', unit: '6 m length', kind: 'gutter', assumption: 'One eave for mono-pitch, two for gable; flat roof excludes gutters.' },
]);

function getCatalogueUnitPrice(product) {
  const prices = product?.prices;
  if (!prices || prices.currency_code !== 'ZAR' || prices.price_range) return null;
  const minorUnit = Number(prices.currency_minor_unit);
  const amount = Number(prices.price);
  if (!Number.isInteger(minorUnit) || minorUnit < 0 || !Number.isFinite(amount) || amount <= 0) return null;
  return amount / (10 ** minorUnit);
}

/**
 * Estimate catalogue-priced and externally benchmarked materials, then disclose
 * the remaining demo-rate allowance for labour and other unpriced components.
 * @param {object} house Generated layout.
 * @param {number} ratePerM2 Existing demo construction allowance rate.
 * @param {Array<object>} products Parsed catalogue products.
 * @param {object} benchmarks Researched material price benchmarks.
 */
function estimateHouseFromCatalogue(house, ratePerM2, products, benchmarks) {
  if (!Array.isArray(products)) throw new Error('The product catalogue could not be read.');
  if (!benchmarks?.rates || benchmarks.currency !== 'ZAR') throw new Error('Material price benchmarks could not be read.');
  const area = positiveNumber(house.footprintArea, 'Floor area');
  const rate = positiveNumber(ratePerM2, 'Allowance rate per m²');
  const exteriorPerimeter = 2 * (house.width + house.length);
  const windowArea = (house.windows || []).reduce((sum, window) => sum + window.length * window.height, 0);
  const entrance = (house.doors || []).find((door) => door.entrance);
  const wallArea = Math.max(0, exteriorPerimeter * 2.8 - windowArea - (entrance ? entrance.length * 2.03 : 0));
  const gutterRuns = house.roofType === 'gable' ? 2 : house.roofType === 'monoPitch' ? 1 : 0;
  const style = getArchitecturalStyle(house.style);
  const roofWidth = house.width + style.overhang * 2;
  const roofLength = house.length + style.overhang * 2;
  const roofProjection = roofWidth * roofLength;
  const roofRun = house.roofType === 'gable' ? house.width / 2 : house.width;
  const roofArea = house.roofType === 'flat'
    ? roofProjection
    : roofProjection * Math.sqrt(1 + (style.roofRise / roofRun) ** 2);
  const quantities = {
    brick: Math.ceil(wallArea * 50 * 1.05),
    concrete: +(area * 0.1).toFixed(2),
    gutter: Math.ceil((gutterRuns * house.length) / 6),
  };
  const lines = CATALOGUE_PRODUCTS.map((item) => {
    const product = products.find((candidate) => Number(candidate.id) === item.id);
    const unitPrice = getCatalogueUnitPrice(product);
    const quantity = quantities[item.kind];
    const available = Boolean(product?.is_in_stock);
    return {
      ...item,
      productId: item.id,
      sourceType: 'catalogue',
      sku: product?.sku || null,
      productName: product?.name || null,
      quantity,
      unitPrice,
      total: unitPrice !== null && available ? Math.round(quantity * unitPrice) : null,
      priced: unitPrice !== null && available,
      note: !product
        ? 'Product not found in the catalogue.'
        : !available
          ? 'Currently out of stock; left in the unpriced allowance.'
          : unitPrice === null
            ? 'Catalogue price is variable or unavailable; left in the unpriced allowance.'
            : null,
    };
  });
  const makeBenchmarkLine = (key, quantity, assumption) => {
    const benchmark = benchmarks.rates[key];
    if (!benchmark?.label || !benchmark.unit || !benchmark.averageMethod || !Array.isArray(benchmark.sources) || benchmark.sources.length < 2) {
      throw new Error(`A valid ${key} material benchmark is required.`);
    }
    const unitPrice = positiveNumber(benchmark.unitPrice, `${key} unit price`);
    return {
      key,
      label: benchmark.label,
      unit: benchmark.unit,
      quantity,
      unitPrice,
      total: Math.round(quantity * unitPrice),
      priced: true,
      sourceType: 'research',
      sourceSummary: benchmark.averageMethod,
      sources: benchmark.sources,
      assumption,
    };
  };
  const ceilingCoverage = positiveNumber(benchmarks.rates.ceilingBoards?.coverageM2, 'Ceiling board coverage');
  const insulationCoverage = positiveNumber(benchmarks.rates.roofInsulation?.coverageM2, 'Roof insulation coverage');
  const researchLines = [
    makeBenchmarkLine('windows', +windowArea.toFixed(2), `Total generated window area; rate is normalized from standard 1200 x 1200 mm aluminium windows.`),
    makeBenchmarkLine('ceilingBoards', Math.ceil(area / ceilingCoverage), `Gross floor area divided by ${ceilingCoverage} m² sheet coverage; rounded up.`),
    makeBenchmarkLine('roofInsulation', Math.ceil(area / insulationCoverage), `Gross floor area divided by ${insulationCoverage} m² roll coverage; rounded up.`),
  ];
  if (house.roofType !== 'flat') {
    const sheetCoverage = positiveNumber(benchmarks.rates.roofSheets.coverageM2, 'Roof sheet coverage');
    researchLines.push(
      makeBenchmarkLine('roofSheets', Math.ceil(roofArea * 1.1 / sheetCoverage), `Sloped roof area ${roofArea.toFixed(2)} m² plus 10% cutting and overlap allowance; ${sheetCoverage} m² effective cover per sheet.`),
      makeBenchmarkLine('roofTrusses', +roofArea.toFixed(2), `Generated sloped roof area ${roofArea.toFixed(2)} m²; flat roofs are excluded. The rate is a broad published structural benchmark.`),
    );
  }
  const catalogueSubtotal = lines.reduce((sum, line) => sum + (line.total || 0), 0);
  const researchedMaterialsSubtotal = researchLines.reduce((sum, line) => sum + line.total, 0);
  const pricedMaterialsSubtotal = catalogueSubtotal + researchedMaterialsSubtotal;
  const areaAllowance = Math.round(area * rate);
  const total = Math.max(areaAllowance, pricedMaterialsSubtotal);
  const allowance = total - pricedMaterialsSubtotal;
  return {
    total,
    ratePerM2: rate,
    areaAllowance,
    catalogueSubtotal,
    researchedMaterialsSubtotal,
    pricedMaterialsSubtotal,
    allowance,
    lines: [...lines, ...researchLines],
    allowanceLabel: 'Other unpriced materials, finishes, labour, services and contingency',
    pricingNote: `Catalogue lines use fixed, in-stock ZAR prices from smart_house_products.json. Additional materials use South African retail benchmarks averaged on ${benchmarks.researchedOn}; store prices and availability vary. The total is the greater of the existing area-rate baseline and the sum of priced materials; the remaining difference is a disclosed allowance for unpriced work and labour. Quantities are schematic and use the assumptions on each line. This is not a supplier quote.`,
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

export {
  FINISH_LEVELS,
  BREAKDOWN_SHARES,
  estimateCost,
  buildBreakdown,
  getCatalogueUnitPrice,
  estimateHouseFromCatalogue,
  estimateAllLevels,
};
