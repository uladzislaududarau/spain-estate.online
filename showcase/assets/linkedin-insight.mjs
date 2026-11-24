export const LINKEDIN_PARTNER_ID = '10166378';
export const LINKEDIN_INSIGHT_URL = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';

// The Insight Tag sends its page-load signal itself. Configure /thank-you as
// the conversion URL in Campaign Manager; no event-specific conversion ID is needed.
export function createLinkedInConsent(scope, loadTag) {
  let loaded = false;
  return preferences => {
    if (preferences.marketing !== true || loaded) return;
    loaded = true;
    scope._linkedin_partner_id = LINKEDIN_PARTNER_ID;
    scope._linkedin_data_partner_ids = scope._linkedin_data_partner_ids || [];
    if (!scope._linkedin_data_partner_ids.includes(LINKEDIN_PARTNER_ID)) {
      scope._linkedin_data_partner_ids.push(LINKEDIN_PARTNER_ID);
    }
    if (!scope.lintrk) {
      scope.lintrk = function (action, data) { scope.lintrk.q.push([action, data]); };
      scope.lintrk.q = [];
    }
    loadTag(LINKEDIN_INSIGHT_URL);
  };
}
