import { isThankYouPath, receiptFromSession } from './lead-receipt.mjs';
import { CONSENT_VERSION, readPreferences, createAdsConsent } from './ads-consent-state.mjs';

const storageKey = 'spain-property-cookie-consent';
const english = document.documentElement.lang === 'en';
const text = english ? {
  title: 'Cookies', description: 'We use cookies to run this website and measure advertising.',
  accept: 'Accept all', reject: 'Reject optional', settings: 'Details and settings', save: 'Save preferences', privacy: 'Privacy policy',
  necessary: 'Necessary — always enabled', analytics: 'Allow visit analytics', marketing: 'Allow advertising measurement and personalisation', change: 'Cookie settings'
} : {
  title: 'Cookie', description: 'Используем cookie для работы сайта и измерения рекламы.',
  accept: 'Принять все', reject: 'Отказаться', settings: 'Подробнее и настройки', save: 'Сохранить выбор', privacy: 'Политика обработки данных',
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
panel.setAttribute('aria-labelledby', 'cookie-title');
panel.setAttribute('role', 'region');
const title = element('h2', 'cookie-title', text.title); title.id = 'cookie-title';
const description = element('p', 'cookie-description', text.description);
const policy = element('a', '', text.privacy); policy.href = english ? '/en/privacy' : '/privacy';
policy.target = '_blank'; policy.rel = 'noopener';
const details = element('div', 'cookie-details'); details.id = 'cookie-details'; details.hidden = true;
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
const actions = element('div', 'cookie-actions');
function button(label, action) {
  const node = element('button', 'cookie-button', label); node.type = 'button';
  node.addEventListener('click', action); return node;
}
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
const saveButton = button(text.save, () => save(analytics.checked, marketing.checked)); saveButton.hidden = true;
const accept = button(text.accept, () => save(true, true));
const reject = button(text.reject, () => save(false, false));
reject.classList.add('cookie-button-reject');
const settings = button(text.settings, () => {
  details.hidden = !details.hidden; saveButton.hidden = details.hidden;
  settings.setAttribute('aria-expanded', String(!details.hidden));
  analytics.checked = preferences?.analytics === true; marketing.checked = preferences?.marketing === true;
  if (!details.hidden) analytics.focus();
});
settings.className = 'cookie-details-link';
settings.setAttribute('aria-expanded', 'false');
settings.setAttribute('aria-controls', 'cookie-details');
actions.append(accept, reject, saveButton);
panel.append(title, description, settings, details, actions); panel.hidden = Boolean(preferences);
document.body.append(panel);
const change = button(text.change, () => {
  focusBefore = document.activeElement;
  panel.hidden = false; details.hidden = false; saveButton.hidden = false;
  settings.setAttribute('aria-expanded', 'true');
  analytics.checked = preferences?.analytics === true; marketing.checked = preferences?.marketing === true;
  analytics.focus();
});
change.className = 'cookie-settings-link';
document.querySelector('.footer-links')?.append(change);
