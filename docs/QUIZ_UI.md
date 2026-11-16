# Cinematic quiz UI

Implemented 2026-11-16 in `showcase/assets/quiz.mjs` and `quiz.css`. This replaces the original visual interface while retaining native phone/contact validation, the saved-lead receipt, API endpoint and consent-gated Ads module.

Seven stages: regions → cities (multiple or any city per region) → property type → dynamic/manual budget → original purpose → original planned visit → contact. Existing penthouse, townhouse and commercial paths remain; no pricing thresholds are invented for those types. There is no timed auto advance. Next/Back controls preserve answers; changing location or property type clears the stale budget and cross-region opt-in but retains contact details in memory.

Budget data comes from shared `pricing.mjs`/`property-prices.mjs`. Numeric amounts only enter logic. Ranges are half-open with an open upper category; manual amounts, including zero/below threshold, can proceed. The interface distinguishes city/type thresholds and special villa geography notes. Matching a threshold is explicitly not listing availability. Same-region alternatives are shown first; other regions require a checkbox opt-in.

Submission retains original answers/envelope plus minimal `pricing` request, and bounded UTM/source/landing/referrer attribution. The server independently validates/recomputes pricing. Contacts and consent are not saved in sessionStorage. Processing consent starts unchecked. A failed or unconfirmed response leaves contact inputs/answers in place. Only an HTTP success with `success:true` and a lead ID creates a receipt, dispatches `lead_saved`, pushes a generic `lead_saved` dataLayer event, and opens the thank-you route. No Google conversion label is invented.

Native modal dialog provides focus containment, Escape dismissal and focus return. Input labels remain native radios/checkboxes with visible checked/focus states. Phone layout uses full viewport height, internal content scrolling and a stable action footer; visualViewport updates adapt it to the software keyboard. Live reduced-motion removes transitions. All `[data-open-quiz]` buttons open the same stateful dialog.

Verification: `node --check showcase/assets/quiz.mjs` passed. Browser launch attempted with installed Playwright; its default headless-shell binary was absent. Browser QA is being performed by the dedicated quiz pricing/QA agent using the available full Chromium executable; final results belong in `docs/qa/`. No real production lead, email, Sheets request or advertising conversion was sent by this implementation work.
