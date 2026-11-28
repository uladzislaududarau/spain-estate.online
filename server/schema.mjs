import { z } from 'zod';
import { parsePhoneNumberFromString, isSupportedCountry, getCountryCallingCode } from 'libphonenumber-js/max';
import { steps, policyVersion } from '../showcase/assets/quiz.config.mjs';
import { normalizeContact, normalizeName } from '../showcase/assets/contact.mjs';
import { normalizePricing, pricingRegionIds, pricingCityIds, pricingDataForRegion } from './pricing-lead.mjs';
import { getMinimumPrice, selectedBudgetRanges } from '../showcase/assets/pricing.mjs';
import { showcaseProperties, showcaseLeadTypes } from './showcase-lead.mjs';
const values = id => steps.find(step => step.id === id).options.map(option => option[0]);
const propertyTypes = [...new Set([...values('propertyType'), 'both'])];
const regionIds = [...new Set([...values('regions'), ...pricingRegionIds])];
const nonNegativeEuro = z.number().finite().min(0).max(100_000_000);
const derivedMatch = z.object({ cityId: z.string().max(64), type: z.string().max(32), minimum: nonNegativeEuro, note: z.string().max(200).optional(), regionId: z.string().max(64).optional() }).strict();
export const pricingSchema = z.object({
  version: z.literal(1),
  regions: z.array(z.enum(pricingRegionIds)).min(1).max(10).transform(items => [...new Set(items)]),
  cities: z.array(z.enum(pricingCityIds)).max(21).transform(items => [...new Set(items)]),
  anyCityRegions: z.array(z.enum(pricingRegionIds)).max(10).transform(items => [...new Set(items)]).optional(),
  propertyType: z.enum(propertyTypes),
  budget: z.union([
    z.object({ ranges: z.array(z.object({ min: nonNegativeEuro, max: nonNegativeEuro.nullable() }).strict()).min(1).max(5) }).strict(),
    z.object({ min: nonNegativeEuro, max: nonNegativeEuro.nullable(), custom: z.boolean() }).strict().refine(budget => budget.custom ? budget.max === budget.min : budget.max === null || budget.max > budget.min),
    z.object({ deferred: z.literal(true) }).strict()
  ]),
  crossRegionOptIn: z.boolean().default(false),
  minimum: nonNegativeEuro.nullable().optional(),
  eligible: z.array(derivedMatch).max(42).optional(),
  alternatives: z.array(derivedMatch).max(12).optional(),
  belowMinimum: z.boolean().optional(),
  source: z.string().max(100).optional()
}).strict().refine(pricing=>pricing.budget.deferred!==true||getMinimumPrice(pricing)===null)
  .refine(pricing=>!pricing.budget.ranges||selectedBudgetRanges(pricing,pricing.budget.ranges).length===pricing.budget.ranges.length);
const attributionSchema = z.object({
  source: z.string().max(100).optional(),
  utm_source: z.string().max(200).optional(), utm_medium: z.string().max(200).optional(),
  utm_campaign: z.string().max(200).optional(), utm_term: z.string().max(200).optional(), utm_content: z.string().max(200).optional(),
  referrer: z.string().max(1024).optional(), landing: z.string().max(1024).optional()
}).strict();
export const leadSchema = z.object({
  requestId: z.string().uuid(),
  name: z.string().max(80).transform(normalizeName).refine(value => value !== null),
  language: z.enum(['ru', 'en']),
  answers: z.object({
    purpose: z.enum(values('purpose')),
    propertyType: z.enum(propertyTypes),
    regions: z.array(z.enum(regionIds)).min(1).max(regionIds.length).transform(items => [...new Set(items)].sort()).refine(items => !items.includes('undecided') || items.length === 1),
    budgets: z.array(z.enum([...values('budgets'), 'dynamic'])).min(1).max(6).transform(items => [...new Set(items)].sort()),
    timeline: z.enum(values('timeline')),
    onlineViewings: z.boolean().optional(),
    checklist: z.boolean().optional()
  }).strict(),
  region: z.enum(['costa-blanca', 'marbella', 'mallorca', 'barcelona', 'unspecified']),
  messenger: z.enum(['whatsapp', 'telegram', 'viber', 'phone']),
  phoneCountry: z.string().length(2).refine(isSupportedCountry).optional(),
  contact: z.string().trim().min(5).max(64),
  consent: z.object({ accepted: z.literal(true), policyVersion: z.literal(policyVersion) }).strict(),
  website: z.string().max(200).default(''),
  pricing: pricingSchema.optional(),
  attribution: attributionSchema.optional()
}).strict();
// Короткая форма витрины: объект (или «все объекты»), мессенджер и контакт.
export const showcaseLeadSchema = z.object({
  kind: z.literal('showcase'),
  requestId: z.string().uuid(),
  name: z.string().max(80).transform(normalizeName).refine(value => value !== null),
  language: z.literal('ru'),
  leadType: z.enum(showcaseLeadTypes),
  property: z.enum(Object.keys(showcaseProperties)).optional(),
  messenger: z.enum(['whatsapp', 'telegram']),
  phoneCountry: z.string().length(2).refine(isSupportedCountry).optional(),
  contact: z.string().trim().min(5).max(64),
  consent: z.object({ accepted: z.literal(true), policyVersion: z.literal(policyVersion) }).strict(),
  website: z.string().max(200).default(''),
  attribution: attributionSchema.optional()
}).strict().refine(lead => (lead.leadType === 'property_presentation') === Boolean(lead.property));
function validateShowcaseLead(body) {
  const result = showcaseLeadSchema.safeParse(body);
  if (!result.success) return { error: result.error.issues.some(issue => issue.path[0] === 'name') ? 'invalid_name' : 'invalid_request' };
  const contact = normalizeContact(result.data.messenger, result.data.contact, parsePhoneNumberFromString);
  if (!contact) return { error: 'invalid_contact' };
  if (result.data.messenger === 'whatsapp' && result.data.phoneCountry) {
    const phone = parsePhoneNumberFromString(contact);
    if (phone.countryCallingCode !== getCountryCallingCode(result.data.phoneCountry)) return { error: 'invalid_contact' };
  }
  return { data: { ...result.data, contact } };
}
export function validateLead(body) {
  if (body?.kind === 'showcase') return validateShowcaseLead(body);
  const result = leadSchema.safeParse(body);
  if (!result.success) return { error: result.error.issues.some(issue => issue.path[0] === 'name') ? 'invalid_name' : 'invalid_request' };
  if (result.data.answers.budgets.includes('dynamic') && !result.data.pricing) return { error: 'invalid_request' };
  if (result.data.pricing) {
    const pricing = result.data.pricing;
    if (pricing.propertyType !== result.data.answers.propertyType) return { error: 'invalid_request' };
    const expected = [...pricing.regions].sort();
    if (JSON.stringify([...result.data.answers.regions].sort()) !== JSON.stringify(expected)) return { error: 'invalid_request' };
    // Reject stale city selections instead of silently pricing another region.
    if ((pricing.anyCityRegions || []).some(id => !pricing.regions.includes(id)) || pricing.cities.some(id => !pricingDataForRegion(id, pricing.regions))) return { error: 'invalid_request' };
    result.data.pricing = normalizePricing(pricing);
  }
  const contact = normalizeContact(result.data.messenger, result.data.contact, parsePhoneNumberFromString);
  if (!contact) return { error: 'invalid_contact' };
  if (result.data.messenger !== 'telegram' && result.data.phoneCountry) {
    const phone = parsePhoneNumberFromString(contact);
    if (phone.countryCallingCode !== getCountryCallingCode(result.data.phoneCountry) || (phone.country && phone.country !== result.data.phoneCountry)) return { error: 'invalid_contact' };
  }
  return { data: { ...result.data, contact } };
}
