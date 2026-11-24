# LinkedIn: lead conversion

Partner ID: `10166378`. The site loads the Insight Tag through the existing marketing-cookie consent in `ads-consent.mjs`. The built-in page-load signal is used; no event-specific conversion ID or extra pixel is required.

In LinkedIn Campaign Manager:

1. Create an **Insight Tag** conversion named **Spain Estate — Lead — Thank you**.
2. Choose the **Lead** category and manual setup with **Page load** tracking.
3. Set the URL rule to **contains** `spain-estate.online/thank-you`.
4. Associate the conversion with the relevant ad sets.

LinkedIn instructions: https://www.linkedin.com/help/lms/answer/a1464397

The quiz navigates to `/thank-you` only after a successful saved enquiry. A direct visit without a valid session receipt redirects home; the tag does not load on that thank-you visit. The homepage may still load the tag if marketing consent already exists. Refusing marketing cookies prevents LinkedIn tracking. The static noscript pixel is intentionally omitted because it would bypass the consent mechanism.

For verification, accept marketing cookies, submit an enquiry successfully, and check that the Insight Tag loads on `/thank-you`. Do not send test enquiries solely to check script loading in production: local browser checks can intercept the LinkedIn request and supply a session receipt without creating a real lead or advertising signal. LinkedIn's active/verified status must be checked separately in Campaign Manager after deployment and consented traffic.
