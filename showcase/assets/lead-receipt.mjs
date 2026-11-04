export const THANK_YOU_PATH = '/thank-you';
export const RECEIPT_KEY = 'spain-property-saved-lead';
export function isThankYouPath(pathname) { return pathname === THANK_YOU_PATH || pathname === THANK_YOU_PATH + '/'; }
export function readReceipt(raw, now = Date.now()) {
  try {
    const value = JSON.parse(raw);
    if (!/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(value.leadId)
      || !['ru', 'en'].includes(value.language) || !Number.isFinite(value.savedAt)
      || value.savedAt > now || now - value.savedAt > 30 * 60000) return null;
    return value;
  } catch { return null; }
}
export function receiptFromSession() {
  try { return readReceipt(sessionStorage.getItem(RECEIPT_KEY)); } catch { return null; }
}
export function rememberSavedLead(result, language) {
  if (result?.success !== true || !readReceipt(JSON.stringify({ leadId: result.leadId, language, savedAt: Date.now() }))) return false;
  try {
    sessionStorage.setItem(RECEIPT_KEY, JSON.stringify({ leadId: result.leadId, language, savedAt: Date.now() }));
    return true;
  } catch { return false; }
}
