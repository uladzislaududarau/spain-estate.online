import { pricingData, regions } from '../showcase/assets/property-prices.mjs';
import { createPricingSummary } from '../showcase/assets/pricing.mjs';

export const pricingRegionIds = regions.map(region => region.id);
export const pricingCityIds = pricingData.map(city => city.cityId);

// Only visitor inputs are trusted. Thresholds, eligibility and notes come from the
// shared, versioned table, for both the Node service and the Cloudflare Worker.
export function normalizePricing(input) {
  if (!input) return undefined;
  const selection = { regions: input.regions, cities: input.cities, anyCityRegions: input.anyCityRegions, propertyType: input.propertyType };
  return { ...createPricingSummary(selection, input.budget, { allowOtherRegions: input.crossRegionOptIn }), crossRegionOptIn: input.crossRegionOptIn }; 
}

export function pricingDataForRegion(cityId, selectedRegions) {
  return pricingData.some(city => city.cityId === cityId && selectedRegions.includes(city.regionId));
}
