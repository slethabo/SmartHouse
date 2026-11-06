import { roofPanels } from './architecture';
import { constructionAllowance } from './costModel';

/** Cost estimator (pure functions, no I/O). */
/** Finish levels in ascending price order. */
const FINISH_LEVELS = ['basic', 'standard', 'premium'];

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
  { id: 412, key: 'concrete', label: 'Concrete slab mix', unit: 'm³', kind: 'concrete', assumption: '100 mm slab thickness over the enclosed room area.' },
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

function triangleArea3D(a, b, c) {
  const ab = b.map((coordinate, index) => coordinate - a[index]);
  const ac = c.map((coordinate, index) => coordinate - a[index]);
  const cross = [
    ab[1] * ac[2] - ab[2] * ac[1],
    ab[2] * ac[0] - ab[0] * ac[2],
    ab[0] * ac[1] - ab[1] * ac[0],
  ];
  return Math.hypot(...cross) / 2;
}

function getRoofSurfaceArea(house) {
  return roofPanels(house).reduce((area, panel) => {
    const [a,...rest]=panel.points;
    for(let i=0;i<rest.length-1;i++)area+=triangleArea3D(a,rest[i],rest[i+1]);
    return area;
  }, 0);
}

/**
 * Estimate material quantities, then fit priced items into a conservative
 * construction-rate model so those items are not added twice.
 * @param {object} house Generated layout.
 * @param {Array<object>} products Parsed catalogue products.
 * @param {object} benchmarks Researched material and construction benchmarks.
 */
function estimateHouseFromCatalogue(house, products, benchmarks) {
  if (!Array.isArray(products)) throw new Error('The product catalogue could not be read.');
  if (!benchmarks?.rates || benchmarks.currency !== 'ZAR') throw new Error('Material price benchmarks could not be read.');
  const constructionCosts = benchmarks.rates.constructionCosts;
  const finishLevel = String(house.finish || 'basic').toLowerCase();
  const finishRate = constructionCosts?.finishRatesPerM2?.[finishLevel];
  const shares = constructionCosts?.costShares;
  if (!finishRate || !shares || !finishRate.label || !finishRate.averageMethod
    || !Array.isArray(finishRate.sources) || finishRate.sources.length === 0) {
    throw new Error(`A valid ${finishLevel} construction cost benchmark is required.`);
  }
  const materialsShare = positiveNumber(shares.materials, 'Materials cost share');
  const labourShare = positiveNumber(shares.labour, 'Labour cost share');
  const servicesShare = positiveNumber(shares.servicesAndSpecialistWork, 'Services cost share');
  const professionalFeesShare = positiveNumber(shares.professionalFees, 'Professional fees share');
  const contingencyShare = positiveNumber(shares.contingency, 'Contingency cost share');
  if (Math.abs(materialsShare + labourShare + servicesShare - 1) > 0.001) {
    throw new Error('Materials, labour and services shares must sum to 100% of the base construction rate.');
  }
  const finishRatePerM2 = positiveNumber(finishRate.unitPrice, `${finishLevel} construction rate`);
  const area = positiveNumber(house.totalFloorArea || house.footprintArea, 'Floor area');
  const upperArea = house.additionalStoreyAllowance?.upperFloorArea || 0;
  const insulationArea = house.floors ? house.floors[house.floors.length - 1].area : area;
  const exteriorPerimeter = (house.walls || []).filter((wall) => wall.exterior).reduce((sum, wall) => sum + wall.length, 0)
    || 2 * (house.width + house.length);
  const windows = house.windows || [];
  const windowArea = windows.reduce((sum, window) => sum + window.length * (window.height || 1.15), 0);
  const externalDoors = (house.doors || []).filter((door) => door.entrance || door.garage || door.terrace);
  const externalDoorArea = externalDoors.reduce((sum, door) => sum + door.length * (door.garage ? 2.4 : 2.15), 0);
  const wallArea = Math.max(0, exteriorPerimeter * 3 - windowArea - externalDoorArea);
  const roofDesign = house.roofDesign || (house.roofType === 'flat' ? 'stepped-flat' : house.roofType === 'gable' ? 'gable' : 'mono-pitch');
  const flatRoof = roofDesign === 'stepped-flat' || roofDesign === 'flat';
  const gutterLength = roofDesign === 'Multi-hip'
    ? 2 * (house.width + house.length)
    : roofDesign === 'Intersecting gables'
      ? 2 * Math.max(house.width, house.length)
      : (['gable', 'butterfly', 'stepped-pavilions'].includes(roofDesign) ? 2 : roofDesign === 'mono-pitch' ? 1 : 0) * house.length;
  const roofArea = getRoofSurfaceArea(house);
  const quantities = {
    brick: Math.ceil(wallArea * 50 * 1.05),
    concrete: +((area-upperArea)*.1+upperArea*.2).toFixed(2),
    gutter: Math.ceil(gutterLength / 6),
  };
  const lines = CATALOGUE_PRODUCTS.map((item) => {
    const product = products.find((candidate) => Number(candidate.id) === item.id);
    const unitPrice = getCatalogueUnitPrice(product);
    const quantity = quantities[item.kind];
    const available = Boolean(product?.is_in_stock);
    return {
      ...item,
      assumption:item.kind==='concrete'&&house.storeys>1?'100 mm ground slab plus a 200 mm equivalent upper-floor slab allowance, with stair openings deducted. Reinforcement and member sizing require engineering.':item.assumption,
      productId: item.id,
      sourceType: 'catalogue',
      sku: product?.sku || null,
      productName: product?.name || null,
      quantity,
      unitPrice,
      total: unitPrice !== null && available ? Math.round(quantity * unitPrice) : null,
      priced: unitPrice !== null && available,
      note: !product
        ? 'Not individually priced; covered by the other materials and finishes allowance.'
        : !available
          ? 'Currently out of stock; covered by the other materials and finishes allowance.'
          : unitPrice === null
            ? 'Catalogue price is variable or unavailable; covered by the other materials and finishes allowance.'
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
    makeBenchmarkLine('ceilingBoards', Math.ceil(area / ceilingCoverage), `Enclosed room area divided by ${ceilingCoverage} m² sheet coverage; rounded up.`),
    makeBenchmarkLine('roofInsulation', Math.ceil(insulationArea / insulationCoverage), `Top-floor enclosed area divided by ${insulationCoverage} m² roll coverage; rounded up.`),
  ];
  if (!flatRoof && roofArea > 0) {
    const sheetCoverage = positiveNumber(benchmarks.rates.roofSheets.coverageM2, 'Roof sheet coverage');
    researchLines.push(
      makeBenchmarkLine('roofSheets', Math.ceil(roofArea * 1.1 / sheetCoverage), `Sloped roof area ${roofArea.toFixed(2)} m² plus 10% cutting and overlap allowance; ${sheetCoverage} m² effective cover per sheet.`),
      makeBenchmarkLine('roofTrusses', +roofArea.toFixed(2), `Generated sloped roof area ${roofArea.toFixed(2)} m²; flat roofs are excluded. The rate is a broad published structural benchmark.`),
    );
  }
  const catalogueSubtotal = lines.reduce((sum, line) => sum + (line.total || 0), 0);
  const researchedMaterialsSubtotal = researchLines.reduce((sum, line) => sum + line.total, 0);
  const pricedMaterialsSubtotal = catalogueSubtotal + researchedMaterialsSubtotal;
  const structuralLines=house.storeys>1?[
    {key:'upperStructure',label:'Upper-level structural allowance',quantity:upperArea,unit:'m²',unitPrice:house.additionalStoreyAllowance.upperStructurePerM2,
      total:Math.round(upperArea*house.additionalStoreyAllowance.upperStructurePerM2),priced:true,sourceType:'allowance',sourceSummary:'Authored prototype allowance, not a supplier price',
      assumption:'Additional framing, reinforcement and load-path complexity. Engineering and detailed quantities are not calculated.'},
    {key:'stairs',label:'Stair construction allowance',quantity:house.stairs.length,unit:'floor connection',unitPrice:house.additionalStoreyAllowance.stairPerConnection,
      total:house.stairs.length*house.additionalStoreyAllowance.stairPerConnection,priced:true,sourceType:'allowance',sourceSummary:'Authored prototype allowance, not a supplier price',
      assumption:'One switchback stair per floor connection; indicative structure and guarding allowance, not a quotation.'},
  ]:[];
  const structuralAllowanceSubtotal=structuralLines.reduce((sum,line)=>sum+line.total,0);
  const baseline = constructionAllowance(area, house.finish, benchmarks);
  const constructionBase = baseline.constructionBase;
  const materialsAllocation = Math.round(constructionBase * materialsShare);
  const labour = Math.round(constructionBase * labourShare);
  const servicesAndSpecialistWork = constructionBase - materialsAllocation - labour;
  const otherMaterialsAndFinishes = Math.max(0, materialsAllocation - pricedMaterialsSubtotal);
  const professionalFees = baseline.professionalFees;
  const contingency = baseline.contingency;
  const materialOverrun = Math.max(0, pricedMaterialsSubtotal - materialsAllocation);
  const categories = [
    { key: 'materials', label: 'Materials and finishes', total: Math.max(pricedMaterialsSubtotal, materialsAllocation) },
    { key: 'labour', label: 'Construction labour', total: labour },
    { key: 'services', label: 'Services and specialist work', total: servicesAndSpecialistWork },
    { key: 'professionalFees', label: 'Professional fees and compliance', total: professionalFees },
    { key: 'contingency', label: 'Contingency', total: contingency },
  ];
  if (materialOverrun > 0) {
    categories[0].label += ' (priced materials exceed allocation)';
  }
  const total = categories.reduce((sum, category) => sum + category.total, 0) + structuralAllowanceSubtotal;
  const constructionSources = [...finishRate.sources, ...shares.sources];
  return {
    total,
    catalogueSubtotal,
    researchedMaterialsSubtotal,
    pricedMaterialsSubtotal,
    structuralAllowanceSubtotal,
    constructionBase,
    constructionRatePerM2: finishRatePerM2,
    constructionRateLabel: finishRate.label,
    constructionRateMethod: finishRate.averageMethod,
    constructionSources,
    materialsAllocation,
    otherMaterialsAndFinishes,
    materialOverrun,
    categories,
    lines: [...lines, ...researchLines, ...structuralLines],
    pricingNote: `${finishRate.label} uses a conservative base rate of ${finishRatePerM2.toLocaleString('en-ZA')} ZAR/m² (${finishRate.averageMethod}). The base rate includes a materials allocation of ${Math.round(materialsShare * 100)}%, labour of ${Math.round(labourShare * 100)}%, and services/specialist work of ${Math.round(servicesShare * 100)}%; professional fees and contingency are each added at ${Math.round(professionalFeesShare * 100)}% and ${Math.round(contingencyShare * 100)}% of the base rate. Catalogue and researched material lines are included within—not added on top of—the materials allocation. Any remaining allocation covers unpriced materials and finishes; if priced materials exceed it, only the excess is added. Multi-storey projects also include separately disclosed stair and upper-structure prototype allowances, not supplier prices. ${shares.averageMethod} Rates researched ${benchmarks.researchedOn}; quantities are schematic and store prices vary. This is an early planning estimate, not a quote or quantity-surveyor estimate.`,
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
