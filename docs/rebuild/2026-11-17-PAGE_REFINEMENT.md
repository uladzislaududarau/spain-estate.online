# Sales-content and panel refinement

Source: user feedback, 2026-11-17. Preserve the approved hero, fixed architectural background, header and native scroll ownership. No deployment.

Visitor task: understand the service, compare coast/type thresholds and request a relevant property selection. Exact original source was read from commit97b8a62: new/resale property, personal matching, mortgage assistance, individual property tours. Do not add approval guarantees, yields, new exclusivity claims or fabricated listings. The3000+ quantity and closed-catalogue wording were explicitly supplied by the user earlier. Dennis Estate is the requested footer project name; existing legal operator details are not replaced.

Composition alternatives: keep the light glass card with a nested dark price card, or use one continuous dark-blue service surface. Choose the latter because the user specifically prefers the price panel's navy and wants less box-within-box nesting. The benefits use a two-column editorial introduction plus a definition list, not repeated feature tiles. The region section contains one dark surface: coast choices left, transparent price comparison right. Phone stacks controls and comparison; coast buttons remain a native horizontal list. A semantic table preserves clear city/price comparison.

Copy structure: “Большой выбор. Точный подбор.” explains inventory categories and the four inherited services. The retained mask scene changes to “От подбора до просмотра.” with a concrete viewing process. The last request section explains what the selection contains and permits a custom budget. Footer describes project purpose, verification of property terms and request status without the removed image disclaimer.

Interaction correction: region/type selection must prefill the quiz when the regional CTA is used. Open on city refinement, preserve contact memory, invalidate dependent budget when coast/type changes. No request is sent by selection or CTA clicks.

Typography and media: retain Onest/Manrope and existing cleared-for-local-preview assets; navy rgba(11,19,32,.94), white headings and readable pale body text. Original source font/media licences remain untouched. Motion and reduced-motion ownership stay with existing scene modules. Verify desktop1440,tablet768,phone390/320; keyboard, presets, reverse scroll, masks and live reduced motion.

Implemented:one navy background per service/region/request panel,with a transparent right-hand comparison instead of a second card. City prices now use a semantic table. The regional CTA opens the quiz at city refinement with the selected region/type; dependent budget is invalidated on preset changes. Header anchor offset accounts for the fixed header and its feathered gradient. A contrast defect on the existing light-button hover was corrected to a darker blue.

Browser evidence:docs/qa/navy-refinement/. Four widths confirmed no document overflow and functional region/type handoff. Existing quiz suite8/8 and Node suite92/92 passed. Axe found zero violations across nine settled section/viewport samples after refinement. Physical devices/real notification delivery remain outside these local checks.

Dynamic scene bounds: the shorter region table changes the page height on phones. The motion owner now observes actual main-content size changes and refreshes its sequence/mask bounds once per layout update, skipping modal scroll lock and cleaning up on reduced-motion changes. Five-width browser regression checks include switching to Barcelona and back, then opening/closing the regional quiz. All passed alongside forward/reverse motion and live reduced motion; report `docs/qa/motion/results.json`.
