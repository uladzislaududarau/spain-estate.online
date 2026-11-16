# Region-aware pricing

Source: the 21-row control table in the user's additional brief supplied on 2026-11-16. No original spreadsheet or separate screenshot was supplied. These are user-provided minimum thresholds, not current market research, inventory, or a guarantee that a property is available. Full names reproduce that textual table; omitted screenshot text was not independently verified.

`showcase/assets/property-prices.mjs` holds nine region definitions, 21 city records and numeric integer euro prices. Update this file to change thresholds. Barcelona and Valencia villa thresholds retain their suburb notes; the Benidorm villa threshold retains Finestrat. The immutable source metadata identifies the table used.

`showcase/assets/pricing.mjs` is a pure shared browser/server module. It does not contain UI, networking, contact data, or storage.

```js
import { pricingData, regions, generateBudgetRanges, evaluateBudget,
  recommendAlternatives, createPricingSummary, formatMoney } from './pricing.mjs';
const selection = {
  regions: ['costa-blanca'],
  cities: ['alicante', 'torrevieja'],
  propertyType: 'apartment'
};
const { minimum, byType, ranges } = generateBudgetRanges(selection, pricingData);
const result = evaluateBudget(selection, 200000); // Torrevieja reaches the threshold; Alicante does not.
```

Selection rules:

- `regions` and `cities` are arrays of stable IDs. Empty `cities` means any listed city within the selected regions. Unknown IDs cannot silently broaden the selection.
- Optional `anyCityRegions` supports selecting any city in one chosen region while retaining explicit cities in another.
- `propertyType` is `apartment`, `villa`, or `both`. Both categories are evaluated separately. Original `penthouse`, `townhouse`, and `commercial` choices intentionally return missing price data; no apartment/villa proxy price is invented.
- `getMinimumPrice` returns the smallest numeric source threshold, or `null` when unavailable.
- `generateBudgetRanges` returns `{ minimum, byType, ranges, customAllowed, missingData }`. Each range is `{ id, min, max }`; finite ranges use **[min,max)**, and the last range has `max:null`. The minimum starts at the exact source threshold; higher boundaries are relative multiples rounded upward to €25k/€50k/€100k as appropriate. This is a UI categorization, not source inventory data.
- `evaluateBudget` accepts a numeric budget ceiling. `eligible`/`ineligible` entries preserve city, region, type and applicable villa note. Threshold equality qualifies; no availability is inferred. `missing` lists combinations without data. A valid budget below the threshold keeps `canSubmit:true`.
- `recommendAlternatives` returns threshold-compatible alternatives within the selected regions by default. `{allowOtherRegions:true}` explicitly expands geography while sorting selected-region options first. The default limit is six. Each category remains separate.
- `createPricingSummary(selection, {min,max,custom}, options)` creates a JSON-serializable lead summary. A custom amount uses equal `min` and `max`; an open generated range uses `max:null`. Finite generated ranges use `max-1` to respect the exclusive upper endpoint, open ranges use the conservative lower bound, and custom budgets use the exact amount. Derived values can be recomputed on the server instead of trusting browser claims.
- `formatMoney` formats presentation only; it never changes source values.

Examples: Elda apartment starts at €120000; Palma de Mallorca villa starts at €1200000. Costa Blanca at €120000 does not imply all cities qualify. Alicante plus Torrevieja with €200000 reaches only the Torrevieja apartment threshold. Alicante with both categories at €300000 reaches the apartment threshold and not the villa threshold. Barcelona villa at €400000 remains a valid consultation request with an advisory €1000000 suburb threshold.

The UI must invalidate and ask the visitor to reconfirm a budget after region, city, or type changes. The pure functions never mutate selections or retain stale state. This module itself does not save or submit leads; backend persistence and notification tests belong to the integration layer.

Verification: `node --test tests/pricing.test.mjs`. Covers all user-requested price cases, numeric table integrity, non-overlapping ranges across all 63 city/type combinations, both-type separation, missing data, special geographic notes, below-minimum summaries, multi-region filtering, explicit cross-region opt-in, range endpoints, immutability and malformed budgets.
