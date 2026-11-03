import catalogueUrl from '../../../smart_house_products.json?url';
import materialPriceUrl from './material_price_benchmarks.json?url';

let catalogueRequest;
let materialPriceRequest;

export function loadProductCatalogue() {
  if (!catalogueRequest) {
    catalogueRequest = fetch(catalogueUrl).then(async (response) => {
      if (!response.ok) throw new Error(`Product catalogue could not be loaded (${response.status}).`);
      const products = await response.json();
      if (!Array.isArray(products)) throw new Error('Product catalogue has an unexpected format.');
      return products;
    }).catch((error) => {
      catalogueRequest = null;
      throw error;
    });
  }
  return catalogueRequest;
}

export function loadMaterialPriceBenchmarks() {
  if (!materialPriceRequest) {
    materialPriceRequest = fetch(materialPriceUrl).then(async (response) => {
      if (!response.ok) throw new Error(`Material price benchmarks could not be loaded (${response.status}).`);
      const benchmarks = await response.json();
      if (benchmarks?.schemaVersion !== 1 || benchmarks.currency !== 'ZAR' || !benchmarks.rates) {
        throw new Error('Material price benchmarks have an unexpected format.');
      }
      const requiredRates = ['windows', 'roofSheets', 'roofTrusses', 'ceilingBoards', 'roofInsulation'];
      const invalidRate = requiredRates.some((key) => {
        const rate = benchmarks.rates[key];
        return !rate?.label
          || !rate.unit
          || !rate.averageMethod
          || !Number.isFinite(Number(rate.unitPrice))
          || Number(rate.unitPrice) <= 0
          || !Array.isArray(rate.sources)
          || rate.sources.length < 2
          || rate.sources.some((source) => !source.name || !source.priceLabel || !source.url?.startsWith('https://'));
      });
      const constructionCosts = benchmarks.rates.constructionCosts;
      const finishRates = constructionCosts?.finishRatesPerM2;
      const shares = constructionCosts?.costShares;
      const invalidConstructionRate = !finishRates || ['basic', 'standard', 'premium'].some((level) => {
        const rate = finishRates[level];
        return !rate?.label
          || !rate.averageMethod
          || !Number.isFinite(Number(rate.unitPrice))
          || Number(rate.unitPrice) <= 0
          || !Array.isArray(rate.sources)
          || rate.sources.length === 0
          || rate.sources.some((source) => !source.name || !source.priceLabel || !source.url?.startsWith('https://'));
      }) || !shares?.averageMethod
        || !Array.isArray(shares.sources)
        || shares.sources.length === 0
        || shares.sources.some((source) => !source.name || !source.priceLabel || !source.url?.startsWith('https://'))
        || ['materials', 'labour', 'servicesAndSpecialistWork', 'professionalFees', 'contingency']
          .some((key) => !Number.isFinite(Number(shares[key])) || Number(shares[key]) <= 0 || Number(shares[key]) >= 1)
        || Math.abs(Number(shares?.materials) + Number(shares?.labour) + Number(shares?.servicesAndSpecialistWork) - 1) > 0.001;
      if (invalidRate || invalidConstructionRate) throw new Error('Material and construction price benchmarks are incomplete or invalid.');
      return benchmarks;
    }).catch((error) => {
      materialPriceRequest = null;
      throw error;
    });
  }
  return materialPriceRequest;
}
