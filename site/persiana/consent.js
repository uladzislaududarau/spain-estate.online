// Cookie-согласие: логика и формулировки из spain-estate.online (assets/ads-consent.mjs), оформление — Persiana.
// На локальном превью рекламные библиотеки не загружаются: loadTag срабатывает только на боевом домене.
import { CONSENT_VERSION, readPreferences, createAdsConsent } from '/shared/lib/ads-consent-state.mjs';
import { createLinkedInConsent } from '/shared/lib/linkedin-insight.mjs';
import { isThankYouPath, receiptFromSession } from '/shared/lib/lead-receipt.mjs';

const storageKey = 'spain-property-cookie-consent';
const text = {
  description: 'Используем cookie для работы сайта и рекламы.',
  accept: 'Принять', reject: 'Отказаться', settings: 'Настройки', save: 'Сохранить выбор', privacy: 'Политика обработки данных',
  necessary: 'Необходимые — включены всегда', analytics: 'Разрешить статистику посещений', marketing: 'Разрешить измерение и персонализацию рекламы'
};
const PRODUCTION = /(^|\.)spain-estate\.online$/.test(location.hostname);

window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
// До выбора посетителя библиотека Google не загружается и запросы к ней не отправляются.
window.gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' });
window.gtag('set', 'ads_data_redaction', true);
const loadTag = src => {
  if (!PRODUCTION) return;
  const script = document.createElement('script'); script.async = true; script.src = src;
  document.head.append(script);
};
const updateAds = createAdsConsent(window.gtag, loadTag);
const updateLinkedIn = createLinkedInConsent(window, loadTag);
// Прямое открытие /thank-you без подтверждённой заявки не запускает рекламные теги.
const apply = p => {
  if (isThankYouPath(location.pathname) && !receiptFromSession()) return;
  updateAds(p); updateLinkedIn(p);
};

let preferences;
try { preferences = readPreferences(localStorage.getItem(storageKey)); } catch {}
if (preferences) apply(preferences);

const panel = document.createElement('section');
panel.className = 'cookie';
panel.setAttribute('aria-label', 'Cookie');
panel.innerHTML = `
  <div class="cookie-details" id="cookie-details" hidden>
    <label><input type="checkbox" checked disabled> ${text.necessary}</label>
    <label><input type="checkbox" data-k="analytics"> ${text.analytics}</label>
    <label><input type="checkbox" data-k="marketing"> ${text.marketing}</label>
    <a href="/privacy" target="_blank" rel="noopener">${text.privacy}</a>
    <button type="button" class="cookie-save">${text.save}</button>
  </div>
  <div class="cookie-bar">
    <p>${text.description}</p>
    <div class="cookie-actions">
      <button type="button" class="cookie-accept">${text.accept}</button>
      <button type="button" class="cookie-reject">${text.reject}</button>
      <button type="button" class="cookie-gear" aria-expanded="false" aria-controls="cookie-details">${text.settings}</button>
    </div>
  </div>`;
panel.hidden = Boolean(preferences);
document.body.append(panel);
document.documentElement.classList.toggle('has-cookie', !panel.hidden);

const details = panel.querySelector('.cookie-details');
const gear = panel.querySelector('.cookie-gear');
const box = k => panel.querySelector(`[data-k=${k}]`);
let focusBefore;
function save(analytics, marketing) {
  const revoke = Boolean(preferences?.marketing && !marketing);
  preferences = { version: CONSENT_VERSION, analytics, marketing, savedAt: Date.now() };
  try { localStorage.setItem(storageKey, JSON.stringify(preferences)); } catch {}
  apply(preferences);
  panel.hidden = true; details.hidden = true; gear.setAttribute('aria-expanded', 'false');
  document.documentElement.classList.remove('has-cookie');
  focusBefore?.focus?.();
  // После отзыва загруженная ранее библиотека убирается при перезагрузке страницы.
  if (revoke) location.reload();
}
function showDetails(open) {
  details.hidden = !open; gear.setAttribute('aria-expanded', String(open));
  box('analytics').checked = preferences?.analytics === true;
  box('marketing').checked = preferences?.marketing === true;
  if (open) box('analytics').focus();
}
panel.querySelector('.cookie-accept').addEventListener('click', () => save(true, true));
panel.querySelector('.cookie-reject').addEventListener('click', () => save(false, false));
panel.querySelector('.cookie-save').addEventListener('click', () => save(box('analytics').checked, box('marketing').checked));
gear.addEventListener('click', () => showDetails(details.hidden));

// «Управлять настройками cookie можно здесь» и ссылка «Настройки cookie» в футере.
document.addEventListener('click', e => {
  const link = e.target.closest('[data-cookie-settings]');
  if (!link) return;
  e.preventDefault();
  focusBefore = link;
  panel.hidden = false;
  document.documentElement.classList.add('has-cookie');
  showDetails(true);
});
