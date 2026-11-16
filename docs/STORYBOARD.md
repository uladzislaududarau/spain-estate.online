# Current architecture update — 2026-11-16

AntiGravity commit `7f949d9` supersedes the original hero-only sticky track below. The Canvas is a fixed decorative page background; normalized progress spans `#main` from top/top to bottom/bottom. Hero, approach, region comparison, threshold and request content scroll in ordinary document flow. Header stays fixed. Blue/navy panels and re-encoded AVIFs are preserved. Reduced motion keeps one static fixed poster behind the same normal-flow content, with no spacer before the hero. Cache limits are now 32 MiB desktop / 16 MiB phone with at most four requests; backing caps remain 2 MP / 1.2 MP. These counters do not measure total GPU/process memory.

The original planning record follows for provenance. Its hero-track lengths and old cache settings are historical.

# Scenes and fallbacks

Hero/sequence (single progress): source AVIF 240 desktop /120 mobile. 0% best villa establishing poster and title;25% pool exterior;50% open sea;75% terrace;100% interior ending. Source has hard cuts, preserved honestly, not fake continuous 3D. Source frame index maps to round(p*(N-1)). Desktop native scroll range about 250vh; phone about170vh, stable 100svh stage. Static semantic title/support/CTA never wait for animation. Small decorative chapter label changes with progress. Hero typography moves only 20px before settling; no text swapped out of accessibility tree. Poster from villa shot remains beneath canvas, exact source sequence starts at first living-room source frame. Initial poster mismatch resolved by using first source frame or starting crop after prototype review.

Immersive threshold: after quiet geography section, rectangular terrace photograph aperture opens from inset(12% 18% 12% 18%) to full viewport, image scales 1.08→1, using same local progress for both. Copy outside clipping, native scroll release. Phone smaller inset/shorter transition. No arbitrary 3D geometry or facade warping.

Reverse: exact same normalized p reproduces same frame/mask. Fast seeks prioritize current request, cancel stale requests, retain last successful drawing. Bounded decoded cache 24MiB desktop/12MiB mobile,2 concurrent requests; mobile 640×360,desktop1280×720. Canvas max2MP desktop/1.2MP mobile,DPR≤1.5. Resources paused offscreen/hidden, explicit abort/close on dispose.

Reduced motion initially and live: no pin or tall range, no canvas requests, all sections in ordinary flow with poster; geography and quiz remain functional. JS/media failure leaves poster,title,links/actions and normal content. No-JS quiz fallback explains that interactive personal search requires JS; request backend cannot be invented. Legal links remain plain anchors.

Quiz: region→city→type→budget→purpose→visit timeline→contact. Native dialog, focus enter/return/Escape, persistent answers, back/next. Budget reset visibly after geography/type changes, manual under-min allowed, alternatives same region first, expansion only opt-in. Contact retained in memory; no fake success. Successful conversion only after success:true +leadId from server. Consent unchecked by default.

Proof plan:1440/768/390/375/320, wheel/touch reverse,0/25/50/75/100,fast seek,orientation/live reduced,offline frame fallback,keyboard/modal,local mocked success/error and actual isolated local API storage. Physical iOS/Android unavailable marked not-run.
