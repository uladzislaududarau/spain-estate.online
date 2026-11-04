export const GOOGLE_ADS_ID = 'AW-18527353101';
export const CONSENT_VERSION = 2;
export function googleConsent(preferences) {
  return {
    ad_storage: preferences.marketing ? 'granted' : 'denied',
    ad_user_data: preferences.marketing ? 'granted' : 'denied',
    ad_personalization: preferences.marketing ? 'granted' : 'denied',
    analytics_storage: preferences.analytics ? 'granted' : 'denied'
  };
}
export function readPreferences(raw, now = Date.now()) {
  try {
    const value = JSON.parse(raw);
    if (value.version !== CONSENT_VERSION || typeof value.analytics !== 'boolean' || typeof value.marketing !== 'boolean'
      || !Number.isFinite(value.savedAt) || value.savedAt > now || now - value.savedAt > 180 * 86400000) return null;
    return value;
  } catch { return null; }
}
export function createAdsConsent(gtag, loadTag) {
  let loaded = false;
  return preferences => {
    gtag('consent', 'update', googleConsent(preferences));
    if (!preferences.marketing || loaded) return;
    loaded = true;
    gtag('js', new Date());
    gtag('config', GOOGLE_ADS_ID);
    loadTag(`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`);
  };
}
