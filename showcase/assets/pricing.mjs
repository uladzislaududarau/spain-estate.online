import { pricingData, priceSource } from './property-prices.mjs';
export { pricingData, regions, priceSource } from './property-prices.mjs';

const knownTypes = new Set(['apartment', 'villa']);
const typesFor = selection => selection.propertyType === 'both' ? ['apartment', 'villa'] : [selection.propertyType];
const validMinimum = value => typeof value === 'number' && Number.isFinite(value) && value > 0;
const uniqueStrings = value => [...new Set(Array.isArray(value) ? value.filter(item => typeof item === 'string') : [])];

/** Empty cities means any listed city in the selected regions. Unknown IDs never widen the search. */
export function getSelectionPrices(selection = {}, data = pricingData) {
  const regionIds = uniqueStrings(selection.regions);
  const cityIds = uniqueStrings(selection.cities);
  const anyRegionIds = uniqueStrings(selection.anyCityRegions).filter(id => regionIds.includes(id));
  return data.filter(row => regionIds.includes(row.regionId) &&
    (!cityIds.length || cityIds.includes(row.cityId) || anyRegionIds.includes(row.regionId)));
}

export function getMinimumPrice(selection = {}, data = pricingData) {
  const rows = getSelectionPrices(selection, data);
  const values = rows.flatMap(row => typesFor(selection).map(type => knownTypes.has(type) ? row[`${type}Min`] : null)).filter(validMinimum);
  return values.length ? Math.min(...values) : null;
}

function minimumsByType(selection, data) {
  const rows = getSelectionPrices(selection, data);
  return Object.fromEntries(typesFor(selection).filter(type => typeof type === 'string').map(type => {
    const prices = knownTypes.has(type) ? rows.map(row => row[`${type}Min`]).filter(validMinimum) : [];
    return [type, prices.length ? Math.min(...prices) : null];
  }));
}

/** Numeric half-open ranges [min,max), followed by an open range [min,infinity). */
export function generateBudgetRanges(selection = {}, data = pricingData) {
  const minimum = getMinimumPrice(selection, data);
  const byType = minimumsByType(selection, data);
  if (minimum === null) return { minimum, byType, ranges: [], customAllowed: true, missingData: true };
  const roundTo = minimum >= 1000000 ? 100000 : minimum >= 500000 ? 50000 : 25000;
  const boundaries = [minimum, ...[1.4, 2, 3, 4].map(factor => Math.ceil(minimum * factor / roundTo) * roundTo)];
  const distinct = [...new Set(boundaries)].sort((a, b) => a - b);
  const ranges = distinct.map((min, index) => {
    const max = distinct[index + 1] ?? null;
    return { id: `eur-${min}-${max ?? 'plus'}`, min, max };
  });
  return { minimum, byType, ranges, customAllowed: true, missingData: Object.values(byType).some(value => value === null) };
}

/** Preserve exact generated choices, including disjoint ranges, in price order. */
export function selectedBudgetRanges(selection, chosen, data = pricingData) {
  if (!Array.isArray(chosen) || !chosen.length || chosen.length > 5) return [];
  const available = generateBudgetRanges(selection, data).ranges;
  if (chosen.some(item => !item || !available.some(range => range.min === item.min && range.max === item.max))) return [];
  return available.filter(range => chosen.some(item => item.min === range.min && item.max === range.max))
    .map(({ min, max }) => ({ min, max }));
}

export function formatMoney(amount, language = 'ru') {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return '—';
  return new Intl.NumberFormat(language === 'en' ? 'en-GB' : 'ru-RU', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0
  }).format(amount);
}

function typeEntry(row, type) {
  const minimum = knownTypes.has(type) && validMinimum(row[`${type}Min`]) ? row[`${type}Min`] : null;
  return {
    cityId: row.cityId, city: row.city, regionId: row.regionId, type, minimum,
    ...(type === 'villa' && row.villaLocationNote ? { note: row.villaLocationNote, noteEn: row.villaLocationNoteEn } : {})
  };
}

/** A threshold match is a price-table observation, never a listing-availability claim. */
export function evaluateBudget(selection = {}, budget, data = pricingData) {
  const validBudget = typeof budget === 'number' && Number.isFinite(budget) && budget >= 0;
  const rows = getSelectionPrices(selection, data);
  const entries = rows.flatMap(row => typesFor(selection).filter(Boolean).map(type => {
    const entry = typeEntry(row, type);
    return { ...entry, meetsThreshold: entry.minimum === null || !validBudget ? null : budget >= entry.minimum };
  }));
  const minimum = getMinimumPrice(selection, data);
  const byType = minimumsByType(selection, data);
  return {
    minimum, byType, budget: validBudget ? budget : null,
    belowMinimum: validBudget && minimum !== null ? budget < minimum : false,
    eligible: entries.filter(entry => entry.meetsThreshold === true),
    ineligible: entries.filter(entry => entry.meetsThreshold === false),
    missing: entries.filter(entry => entry.minimum === null),
    cities: rows.map(row => ({
      cityId: row.cityId, city: row.city, regionId: row.regionId,
      types: Object.fromEntries(entries.filter(entry => entry.cityId === row.cityId).map(entry => [entry.type, {
        minimum: entry.minimum, meetsThreshold: entry.meetsThreshold,
        ...(entry.note ? { note: entry.note, noteEn: entry.noteEn } : {})
      }]))
    })),
    missingData: !rows.length || !entries.length || entries.some(entry => entry.minimum === null),
    // Being below a table threshold is explicitly NOT grounds for rejecting a lead.
    canSubmit: validBudget
  };
}

/** Other regions are only included after explicit opt-in, with same-region options first. */
export function recommendAlternatives(selection = {}, budget, options = {}, data = pricingData) {
  if (!Number.isFinite(budget) || budget < 0) return [];
  const selectedRegions = uniqueStrings(selection.regions);
  const selectedCities = uniqueStrings(selection.cities);
  const { allowOtherRegions = false, limit = 6 } = options;
  const choices = data.filter(row => !selectedCities.includes(row.cityId) &&
    (selectedRegions.includes(row.regionId) || allowOtherRegions))
    .flatMap(row => typesFor(selection).filter(type => knownTypes.has(type)).map(type => typeEntry(row, type)))
    .filter(entry => entry.minimum !== null && entry.minimum <= budget)
    .sort((a, b) => Number(!selectedRegions.includes(a.regionId)) - Number(!selectedRegions.includes(b.regionId)) ||
      a.minimum - b.minimum || a.cityId.localeCompare(b.cityId) || a.type.localeCompare(b.type));
  return choices.slice(0, Math.max(0, Math.min(100, Math.floor(limit))));
}

/**
 * budget.max is exclusive for a generated range; custom budgets use min=max.
 * For an open range, eligibility at its lower bound is conservative and honest.
 */
export function createPricingSummary(selection = {}, budget = {}, options = {}, data = pricingData) {
  if(budget.deferred===true){
    const result=evaluateBudget(selection,NaN,data);
    return {
      version:1,regions:uniqueStrings(selection.regions),cities:uniqueStrings(selection.cities),
      ...(selection.anyCityRegions?{anyCityRegions:uniqueStrings(selection.anyCityRegions)}:{}),
      propertyType:selection.propertyType,budget:{deferred:true},minimum:result.minimum,byType:result.byType,
      eligible:[],ineligible:[],missing:result.missing,alternatives:[],belowMinimum:false,missingData:result.missingData,
      source:priceSource.id,canSubmit:result.minimum===null&&result.missingData&&getSelectionPrices(selection,data).length>0,
      allowOtherRegions:options.allowOtherRegions===true
    };
  }
  if (Array.isArray(budget.ranges)) {
    const ranges = selectedBudgetRanges(selection, budget.ranges, data);
    // Threshold affordability can use any selected range. Preferences retain every
    // exact interval; the gaps between nonadjacent choices are never filled in.
    const ceiling = ranges.length ? Math.max(...ranges.map(range => range.max === null ? range.min : range.max - 1)) : NaN;
    const result = evaluateBudget(selection, ceiling, data);
    return {
      version: 1, regions: uniqueStrings(selection.regions), cities: uniqueStrings(selection.cities),
      ...(selection.anyCityRegions ? { anyCityRegions: uniqueStrings(selection.anyCityRegions) } : {}),
      propertyType: selection.propertyType, budget: { ranges }, minimum: result.minimum, byType: result.byType,
      eligible: result.eligible, ineligible: result.ineligible, missing: result.missing,
      alternatives: result.ineligible.length ? recommendAlternatives(selection, ceiling, options, data) : [],
      belowMinimum: result.belowMinimum, missingData: result.missingData, source: priceSource.id,
      canSubmit: result.canSubmit, allowOtherRegions: options.allowOtherRegions === true
    };
  }
  const min = typeof budget.min === 'number' && Number.isFinite(budget.min) && budget.min >= 0 ? budget.min : null;
  const maxValid = budget.max === null || (typeof budget.max === 'number' && Number.isFinite(budget.max) && budget.max >= 0);
  const max = budget.max === null ? null : maxValid ? budget.max : null;
  const custom = budget.custom === true;
  const invalidRange = min === null || !maxValid || (max !== null && (custom ? max !== min : max <= min));
  const ceiling = invalidRange ? NaN : max === null ? min : custom ? max : Math.max(min, max - 1);
  const result = evaluateBudget(selection, ceiling, data);
  const alternatives = result.ineligible.length ? recommendAlternatives(selection, ceiling, options, data) : [];
  return {
    version: 1,
    regions: uniqueStrings(selection.regions), cities: uniqueStrings(selection.cities),
    ...(selection.anyCityRegions ? { anyCityRegions: uniqueStrings(selection.anyCityRegions) } : {}),
    propertyType: selection.propertyType,
    budget: { min, max, custom },
    minimum: result.minimum, byType: result.byType,
    eligible: result.eligible, ineligible: result.ineligible, missing: result.missing,
    alternatives, belowMinimum: result.belowMinimum, missingData: result.missingData,
    source: priceSource.id, canSubmit: result.canSubmit,
    allowOtherRegions: options.allowOtherRegions === true
  };
}
