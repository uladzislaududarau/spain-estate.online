import { isThankYouPath, receiptFromSession } from './lead-receipt.mjs';
import { CONSENT_VERSION, readPreferences, createAdsConsent } from './ads-consent-state.mjs';

const storageKey = 'spain-property-cookie-consent';
const english = document.documentElement.lang === 'en';
const text = english ? {
  title: 'Cookies', description: 'Cookies — to run this site and for advertising.',
  accept: 'Accept', close: 'Reject optional cookies', gear: 'Cookie settings', save: 'Save preferences', privacy: 'Privacy policy',
  necessary: 'Necessary — always enabled', analytics: 'Allow visit analytics', marketing: 'Allow advertising measurement and personalisation', change: 'Cookie settings'
} : {
  title: 'Cookie', description: 'Используем cookie для работы сайта и рекламы.',
  accept: 'Принять', close: 'Отказаться от необязательных cookie', gear: 'Настройки cookie', save: 'Сохранить выбор', privacy: 'Политика обработки данных',
  necessary: 'Необходимые — включены всегда', analytics: 'Разрешить статистику посещений', marketing: 'Разрешить измерение и персонализацию рекламы', change: 'Настройки cookie'
};
window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
// До выбора посетителя библиотека Google не загружается и запросы к ней не отправляются.
window.gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' });
window.gtag('set', 'ads_data_redaction', true);
const updateConsent = createAdsConsent(window.gtag, src => {
  const script = document.createElement('script'); script.async = true; script.src = src;
  document.head.append(script);
});
// Прямое открытие страницы без подтверждения не запускает рекламный тег.
const apply = preferences => {
  if (isThankYouPath(location.pathname) && !receiptFromSession()) return;
  updateConsent(preferences);
};
let preferences;
try { preferences = readPreferences(localStorage.getItem(storageKey)); } catch {}
if (preferences) apply(preferences);

function element(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content) node.textContent = content;
  return node;
}
const panel = element('section', 'cookie-panel');
panel.setAttribute('role', 'region');
const description = element('p', 'cookie-description', text.description);
const details = element('div', 'cookie-details'); details.id = 'cookie-details'; details.hidden = true;
const policy = element('a', 'cookie-policy', text.privacy); policy.href = english ? '/en/privacy' : '/privacy';
policy.target = '_blank'; policy.rel = 'noopener';
const choices = element('div', 'cookie-choices');
details.append(policy, choices);
function choice(label, disabled = false) {
  const row = element('label'); const input = document.createElement('input');
  input.type = 'checkbox'; input.disabled = disabled; input.checked = disabled;
  row.append(input, document.createTextNode(label)); choices.append(row);
  return input;
}
choice(text.necessary, true);
const analytics = choice(text.analytics); const marketing = choice(text.marketing);
let focusBefore;
function save(analytics, marketing) {
  const revoke = Boolean(preferences?.marketing && !marketing);
  preferences = { version: CONSENT_VERSION, analytics, marketing, savedAt: Date.now() };
  try { localStorage.setItem(storageKey, JSON.stringify(preferences)); } catch {}
  apply(preferences); panel.hidden = true;
  focusBefore?.focus();
  // После отзыва загруженная ранее библиотека убирается при перезагрузке страницы.
  if (revoke) location.reload();
}
const saveButton = element('button', 'cookie-button-save', text.save); saveButton.type = 'button';
saveButton.hidden = true; saveButton.addEventListener('click', () => save(analytics.checked, marketing.checked));
details.append(saveButton);
const bar = element('div', 'cookie-bar');
bar.append(description);
const actions = element('div', 'cookie-actions');
const accept = element('button', 'cookie-button-accept', text.accept); accept.type = 'button';
accept.addEventListener('click', () => save(true, true));
const closeBtn = element('button', 'cookie-icon cookie-close'); closeBtn.type = 'button';
closeBtn.setAttribute('aria-label', text.close);
closeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
closeBtn.addEventListener('click', () => save(false, false));
const gear = element('button', 'cookie-icon cookie-gear'); gear.type = 'button';
gear.setAttribute('aria-label', text.gear); gear.setAttribute('aria-expanded', 'false');
gear.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
gear.addEventListener('click', () => {
  details.hidden = !details.hidden; saveButton.hidden = details.hidden;
  gear.setAttribute('aria-expanded', String(!details.hidden));
  analytics.checked = preferences?.analytics === true; marketing.checked = preferences?.marketing === true;
  if (!details.hidden) analytics.focus();
});
actions.append(accept, element('span', 'cookie-divider'), closeBtn, gear);
bar.append(actions);
panel.append(details, bar); panel.hidden = Boolean(preferences);
document.body.append(panel);const openSettings = () => {
  focusBefore = document.activeElement;
  panel.hidden = false; details.hidden = false; saveButton.hidden = false;
  gear.setAttribute('aria-expanded', 'true');
  analytics.checked = preferences?.analytics === true; marketing.checked = preferences?.marketing === true;
  analytics.focus();
};
// Вход в настройки cookie — строка «Управлять настройками куки можно здесь» в футере.
document.querySelector('#footer-cookie-settings')?.addEventListener('click', event => { event.preventDefault(); openSettings(); });
