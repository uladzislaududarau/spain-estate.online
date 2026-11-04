import { z } from 'zod';
import { parsePhoneNumberFromString, isSupportedCountry, getCountryCallingCode } from 'libphonenumber-js/max';
import { steps, policyVersion } from '../showcase/assets/quiz.config.mjs';
import { normalizeContact, normalizeName } from '../showcase/assets/contact.mjs';
const values = id => steps.find(step => step.id === id).options.map(option => option[0]);
export const leadSchema = z.object({
  requestId: z.string().uuid(),
  name: z.string().max(80).transform(normalizeName).refine(value => value !== null),
  language: z.enum(['ru', 'en']),
  answers: z.object({
    purpose: z.enum(values('purpose')),
    propertyType: z.enum(values('propertyType')),
    regions: z.array(z.enum(values('regions'))).min(1).max(values('regions').length).transform(items => [...new Set(items)].sort()).refine(items => !items.includes('undecided') || items.length === 1),
    budgets: z.array(z.enum(values('budgets'))).min(1).max(6).transform(items => [...new Set(items)].sort()),
    timeline: z.enum(values('timeline'))
  }).strict(),
  region: z.enum(['costa-blanca', 'marbella', 'mallorca', 'barcelona', 'unspecified']),
  messenger: z.enum(['whatsapp', 'telegram']),
  phoneCountry: z.string().length(2).refine(isSupportedCountry).optional(),
  contact: z.string().trim().min(5).max(64),
  consent: z.object({ accepted: z.literal(true), policyVersion: z.literal(policyVersion) }).strict(),
  website: z.string().max(200).default('')
}).strict();
export function validateLead(body) {
  const result = leadSchema.safeParse(body);
  if (!result.success) return { error: result.error.issues.some(issue => issue.path[0] === 'name') ? 'invalid_name' : 'invalid_request' };
  const contact = normalizeContact(result.data.messenger, result.data.contact, parsePhoneNumberFromString);
  if (!contact) return { error: 'invalid_contact' };
  if (result.data.messenger === 'whatsapp' && result.data.phoneCountry) {
    const phone = parsePhoneNumberFromString(contact);
    if (phone.countryCallingCode !== getCountryCallingCode(result.data.phoneCountry) || (phone.country && phone.country !== result.data.phoneCountry)) return { error: 'invalid_contact' };
  }
  return { data: { ...result.data, contact } };
}
