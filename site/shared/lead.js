// Короткая заявка: мессенджер → контакт → имя → согласие.
// Телефон проверяется библиотекой из действующего проекта. Заявка уходит в /api/lead (D1 → email + Google Таблица).
import { createPhoneField } from './lib/phone-field.mjs';
import { normalizeName, telegramUsername } from './lib/contact.mjs';
import { messengerIcon } from './lib/messenger-icons.mjs';
import { rememberSavedLead } from './lib/lead-receipt.mjs';

// First-touch: параметры рекламного входа сохраняются на сессию и не теряются при переключении объектов.
const TOUCH_KEY = 'spfs-first-touch';
(function captureFirstTouch() {
  try {
    if (sessionStorage.getItem(TOUCH_KEY)) return;
    const q = new URLSearchParams(location.search);
    const keep = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'gbraid', 'wbraid'];
    const params = Object.fromEntries(keep.filter(k => q.get(k)).map(k => [k, q.get(k).slice(0, 200)]));
    sessionStorage.setItem(TOUCH_KEY, JSON.stringify({ path: location.pathname, params, at: new Date().toISOString() }));
  } catch {}
})();
export function firstTouch() {
  try { return JSON.parse(sessionStorage.getItem(TOUCH_KEY)) || null; } catch { return null; }
}
// Формат атрибуции совпадает с квизом: только UTM, адрес входа без параметров и источник перехода.
function attribution() {
  const touch = firstTouch();
  const result = { source: 'showcase' };
  for (const [key, value] of Object.entries(touch?.params || {})) if (key.startsWith('utm_')) result[key] = value;
  result.landing = `${location.origin}${touch?.path || location.pathname}`.slice(0, 1024);
  try { if (document.referrer) { const r = new URL(document.referrer); if (r.origin !== location.origin) result.referrer = `${r.origin}${r.pathname}`.slice(0, 1024); } } catch {}
  return result;
}

const tgPhone = v => /^\+\d[\d\s()-]{6,20}$/.test(v.trim()) ? v.trim().replace(/[\s()-]/g, '') : null;

export function mountLead(form, { context, onSuccess, onReset, policyVersion } = {}) {
  const $ = sel => form.querySelector(sel);
  const err = key => form.querySelector(`[data-error="${key}"]`);
  const submit = $('[type=submit]');
  const submitLabel = submit.textContent;
  const phone = $('input[name=phone]');
  const telegram = $('input[name=telegram]');
  const name = $('input[name=name]');
  const consent = $('input[name=consent]');
  const wa = $('[data-channel=whatsapp]');
  const tg = $('[data-channel=telegram]');
  let busy = false;
  let requestId = crypto.randomUUID();
  const phoneState = { country: 'ES', source: 'fallback', hasInput: false };

  form.querySelectorAll('[data-icon]').forEach(slot => slot.replaceChildren(messengerIcon(slot.dataset.icon)));

  const field = createPhoneField({
    input: phone, lang: 'ru', state: phoneState,
    text: {
      country: 'Код страны', nationalPlaceholder: 'Номер WhatsApp',
      phoneHint: 'Можно вставить номер с кодом страны, например +44',
      invalidCountryPhone: 'Проверьте код страны и номер',
      countryLoadError: 'Введите номер с кодом страны'
    },
    onCountry() {}, onInput() { setError(phone, 'contact', ''); }, onError(m) { setError(phone, 'contact', m); }
  });
  $('[data-phone-slot]').replaceChildren(field.row, field.hint);

  function setError(input, key, message) {
    const node = err(key);
    if (node) node.textContent = message;
    if (!input) return;
    if (message) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  }
  const channel = () => form.elements.namedItem('messenger').value || 'whatsapp';
  function sync() {
    const isTg = channel() === 'telegram';
    wa.hidden = isTg; tg.hidden = !isTg;
    phone.disabled = isTg; telegram.disabled = !isTg;
    setError(phone, 'contact', ''); setError(telegram, 'contact', '');
    form.dataset.channel = channel();
  }
  form.querySelectorAll('input[name=messenger]').forEach(r => r.addEventListener('change', sync));
  name.addEventListener('input', () => setError(name, 'name', ''));
  telegram.addEventListener('input', () => setError(telegram, 'contact', ''));
  consent.addEventListener('change', () => setError(consent, 'consent', ''));
  sync();

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    busy = true; submit.disabled = true; submit.textContent = 'Отправляем…';
    setError(null, 'form', '');
    try {
      const isTg = channel() === 'telegram';
      const contact = isTg ? (telegramUsername(telegram.value) || tgPhone(telegram.value)) : await field.value();
      const cleanName = normalizeName(name.value);
      const checks = [
        [isTg ? telegram : phone, 'contact', contact, isTg ? 'Введите @username или номер с кодом страны' : 'Проверьте код страны и номер'],
        [name, 'name', cleanName, 'Введите имя'],
        [consent, 'consent', consent.checked, 'Нужно согласие на обработку данных']
      ];
      checks.forEach(([input, key, ok, m]) => setError(input, key, ok ? '' : m));
      const bad = checks.find(([, , ok]) => !ok);
      if (bad) { bad[0].focus(); return; }
      const ctx = context();
      const all = ctx.kind === 'all';
      const body = {
        kind: 'showcase', requestId, name: cleanName, language: 'ru',
        leadType: all ? 'catalog_access' : 'property_presentation',
        ...(all ? {} : { property: ctx.slug }),
        messenger: isTg ? 'telegram' : 'whatsapp', contact,
        ...(isTg ? {} : { phoneCountry: phoneState.country }),
        consent: { accepted: true, policyVersion },
        website: form.querySelector('input[name=website]')?.value || '',
        attribution: attribution()
      };
      const res = await fetch('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === 'invalid_contact') { setError(isTg ? telegram : phone, 'contact', isTg ? 'Проверьте @username или номер с кодом страны' : 'Проверьте код страны и номер'); (isTg ? telegram : phone).focus(); return; }
        if (data.code === 'invalid_name') { setError(name, 'name', 'Введите имя буквами'); name.focus(); return; }
        setError(null, 'form', res.status === 429 ? 'Слишком много попыток. Попробуйте через минуту.' : 'Не получилось отправить. Данные сохранены в форме — попробуйте ещё раз.');
        return;
      }
      if (data.success !== true || !data.leadId) throw new Error('unconfirmed');
      requestId = crypto.randomUUID();
      rememberSavedLead(data, 'ru');
      try { sessionStorage.setItem('spfs-thanks', JSON.stringify({ kind: all ? 'all' : 'property', slug: all ? null : ctx.slug, channel: isTg ? 'Telegram' : 'WhatsApp' })); } catch {}
      window.dataLayer?.push({ event: 'lead_saved', lead_source: 'showcase', lead_type: body.leadType });
      onSuccess?.({ ...body, leadId: data.leadId, channelLabel: isTg ? 'Telegram' : 'WhatsApp' });
    } catch {
      setError(null, 'form', 'Не получилось отправить. Данные сохранены в форме — попробуйте ещё раз.');
    } finally {
      busy = false; submit.disabled = false; submit.textContent = submitLabel;
    }
  });

  return {
    reset() {
      form.reset(); sync();
      ['contact', 'name', 'consent', 'form'].forEach(k => setError(null, k, ''));
      form.querySelectorAll('[aria-invalid]').forEach(n => n.removeAttribute('aria-invalid'));
      onReset?.();
    },
    focusFirst() { form.querySelector('input[name=messenger]:checked')?.focus({ preventScroll: true }); }
  };
}

// Разметка полей одинакова для обоих сайтов, оформление — у каждого своё.
export const LEAD_FIELDS = `
  <fieldset class="lf-channels">
    <legend class="lf-label">Куда прислать</legend>
    <label class="lf-channel"><input type="radio" name="messenger" value="whatsapp" checked><span><i data-icon="whatsapp"></i>WhatsApp</span></label>
    <label class="lf-channel"><input type="radio" name="messenger" value="telegram"><span><i data-icon="telegram"></i>Telegram</span></label>
  </fieldset>
  <div class="lf-field" data-channel="whatsapp">
    <label class="lf-label" for="lf-phone">Номер WhatsApp</label>
    <input id="lf-phone" name="phone" type="tel" inputmode="tel" required>
    <div data-phone-slot></div>
  </div>
  <div class="lf-field" data-channel="telegram" hidden>
    <label class="lf-label" for="lf-tg">Telegram</label>
    <input id="lf-tg" name="telegram" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="@username или +34 612 345 678" disabled>
    <p class="quiz-hint">Можно вставить номер с кодом страны или аккаунт</p>
  </div>
  <p class="lf-error" id="quiz-error" data-error="contact" aria-live="polite"></p>
  <div class="lf-field">
    <label class="lf-label" for="lf-name">Имя</label>
    <input id="lf-name" name="name" type="text" autocomplete="given-name" maxlength="80" required>
    <p class="lf-error" data-error="name" aria-live="polite"></p>
  </div>
  <label class="lf-consent"><input type="checkbox" name="consent" checked><span>Согласен на обработку данных по <a href="/privacy" target="_blank" rel="noopener">политике конфиденциальности</a></span></label>
  <p class="lf-error" data-error="consent" aria-live="polite"></p>
  <p class="lf-error" data-error="form" aria-live="assertive"></p>
  <div class="lf-trap" aria-hidden="true"><label>Website <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>`;
