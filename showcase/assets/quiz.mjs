import { THANK_YOU_PATH, isThankYouPath, receiptFromSession, rememberSavedLead } from './lead-receipt.mjs';
import { steps, copy, policyVersion } from './quiz.config.mjs';
import { telegramUsername, normalizeName } from './contact.mjs';
import { createPhoneField } from './phone-field.mjs';

const key = 'spain-property-quiz-v2';
let lang = document.documentElement.lang === 'en' ? 'en' : 'ru';
let step = 0;
let answers = {};
let contact = { whatsapp: '', telegram: '' };
let messenger = 'whatsapp';
let contactName = '';
let consent = false;
let submitting = false;
let success = false;
let timer;
let autoCloseTimer;
let requestId = crypto.randomUUID();
let focusBefore;
let phoneField;
const phoneState = { country: 'ES', source: 'fallback', hasInput: false };
try {
  const saved = JSON.parse(sessionStorage.getItem(key));
  if (saved && saved.version === policyVersion) {
    for (const question of steps) {
      const valid = question.options.map(o => o[0]);
      if (question.multiple) answers[question.id] = Array.isArray(saved.answers?.[question.id]) ? saved.answers[question.id].filter(v => valid.includes(v)) : [];
      else if (valid.includes(saved.answers?.[question.id])) answers[question.id] = saved.answers[question.id];
    }
    step = Number.isInteger(saved.step) ? Math.min(steps.length, Math.max(0, saved.step)) : 0;
    if (saved.schemaVersion !== 4) { const unanswered = steps.findIndex(question => question.multiple ? !answers[question.id]?.length : !answers[question.id]); step = unanswered < 0 ? steps.length : unanswered; }
    messenger = saved.messenger === 'telegram' ? 'telegram' : 'whatsapp';
    if (/^[A-Z]{2}$/.test(saved.phoneCountry)) { phoneState.country = saved.phoneCountry; phoneState.source = 'manual'; }
    if (/^[a-f\d-]{36}$/.test(saved.requestId)) requestId = saved.requestId;
  }
} catch { /* Хранилище может быть отключено в браузере. */ }
// Контакты и согласие остаются только в памяти вкладки.
function persist() {
  try { sessionStorage.setItem(key, JSON.stringify({ version: policyVersion, schemaVersion: 4, step, answers, messenger, requestId, phoneCountry: phoneState.source !== 'fallback' ? phoneState.country : null })); } catch {}
}
const dialog = document.createElement('dialog');
dialog.className = 'quiz-dialog';
dialog.setAttribute('aria-labelledby', 'quiz-title');
document.body.append(dialog);

function node(tag, attrs = {}, text) {
  const el = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (name === 'class') el.className = value;
    else el.setAttribute(name, String(value));
  }
  if (text) el.textContent = text;
  return el;
}
function button(text, className, action) {
  const el = node('button', { type: 'button', class: className }, text);
  el.addEventListener('click', action);
  return el;
}
function clearAdvance() { clearTimeout(timer); timer = undefined; }
function clearAutoClose() { if (autoCloseTimer) { clearTimeout(autoCloseTimer); autoCloseTimer = undefined; } }
let pageScrollY = 0;
function close() { if (!submitting) dialog.close(); }
dialog.addEventListener('close', () => {
  clearAdvance();
  clearAutoClose();
  document.body.classList.remove('quiz-open');
  document.documentElement.classList.remove('quiz-open');
  document.body.style.removeProperty('--quiz-page-scroll-offset');
  window.scrollTo({ top: pageScrollY, behavior: 'instant' });
  focusBefore?.focus({ preventScroll: true });
  if (success && isThankYouPath(location.pathname)) { location.replace('/'); return; }
  if (success) {
    step = 0;
    answers = {};
    contact = { whatsapp: '', telegram: '' };
    messenger = 'whatsapp';
    contactName = '';
    consent = false;
    submitting = false;
    success = false;
    requestId = crypto.randomUUID();
    try { sessionStorage.removeItem(key); } catch {}
  }
});
dialog.addEventListener('cancel', event => event.preventDefault());
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const box = dialog.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close();
});
function heading(content, title) {
  const h = node('h2', { class: 'quiz-title', id: 'quiz-title', tabindex: '-1' }, title);
  content.append(h);
  return h;
}
function buildShell({ currentStep = step, currentMessenger = messenger, complete = success, measuring = false } = {}) {
  const t = copy[lang];
  const shell = node('div', { class: 'quiz-shell' });
  const top = node('div', { class: 'quiz-top' });
  const logo = (document.querySelector('.brand-svg-logo')?.cloneNode(true)) || node('div', { class: 'quiz-brand' }, 'Spain Property for Sale');
  logo.setAttribute('class', 'quiz-logo');
  logo.setAttribute('aria-label', 'Spain Property for Sale');
  top.append(logo);
  const closeBtn = button('×', 'quiz-close', close);
  closeBtn.setAttribute('aria-label', t.close);
  closeBtn.setAttribute('title', t.close);
  top.append(closeBtn);
  shell.append(top);

  // Линия подчеркивания / прогресс: видна и в процессе квиза, и в благодарности (100% заполнена)
  shell.append(node('progress', {
    class: 'quiz-progress',
    value: complete ? steps.length + 1 : currentStep + 1,
    max: steps.length + 1,
    'aria-label': lang === 'ru' ? 'Прогресс подбора' : 'Selection progress'
  }));

  const content = node('div', { class: 'quiz-content' });
  if (complete) {
    content.classList.add('quiz-success');
    heading(content, t.successTitle);
    content.append(node('p', { class: 'quiz-intro' }, t.successText));
    shell.append(content);

    // Автоматическое закрытие через 20 секунд с последующим сбросом
    if (!measuring && !isThankYouPath(location.pathname)) autoCloseTimer = setTimeout(() => {
      close();
    }, 20000);
  } else {
    if (currentStep < steps.length) renderQuestion(content, shell, t, currentStep);
    else renderContact(content, shell, t, { currentMessenger, measuring });
  }
  return shell;
}
function render() {
  clearAdvance();
  clearAutoClose();
  phoneField?.cancel(); phoneField = undefined;
  dialog.lang = lang;
  dialog.dataset.stage = success ? 'success' : step === steps.length ? 'contact' : 'question';
  const view = success ? 'success' : step === steps.length ? 'contact' : `question-${step}`;
  const animate = dialog.open && dialog.dataset.view && dialog.dataset.view !== view;
  const shell = buildShell();
  if (animate) shell.querySelector('.quiz-content').classList.add('quiz-content-enter');
  dialog.dataset.view = view;
  dialog.replaceChildren(shell);
  dialog.scrollTop = 0;
  dialog.querySelector('#quiz-title')?.focus({ preventScroll: true });
}
function hasAnswer(question) {
  return question.multiple ? answers[question.id]?.length > 0 : Boolean(answers[question.id]);
}
function renderQuestion(content, shell, t, currentStep = step) {
  const question = steps[currentStep];
  heading(content, question.title[lang]);
  content.append(node('p', { class: 'quiz-intro' }, question.multiple ? t.multiple : t.single));
  const fieldset = node('fieldset', { class: 'quiz-options', 'aria-labelledby': 'quiz-title' });
  const next = button(t.next, 'quiz-primary', () => {
    if (hasAnswer(question)) { step++; persist(); render(); }
  });
  next.disabled = !hasAnswer(question);
  for (const option of question.options) {
    const label = node('label', { class: 'quiz-choice' });
    const input = node('input', { type: question.multiple ? 'checkbox' : 'radio', name: question.id, value: option[0] });
    input.checked = question.multiple ? Boolean(answers[question.id]?.includes(option[0])) : answers[question.id] === option[0];
    input.addEventListener('change', () => {
      clearAdvance();
      if (question.multiple) {
        if (input.checked && question.exclusive) {
          for (const other of fieldset.querySelectorAll('input')) {
            if (other !== input && (input.value === question.exclusive || other.value === question.exclusive)) other.checked = false;
          }
        }
        answers[question.id] = [...fieldset.querySelectorAll('input:checked')].map(el => el.value);
      }
      else answers[question.id] = option[0];
      next.disabled = !hasAnswer(question);
      persist();
      if (!question.multiple) timer = setTimeout(() => { step++; persist(); render(); }, 1800);
    });
    label.append(input, node('span', {}, option[lang === 'en' ? 2 : 1]));
    fieldset.append(label);
  }
  content.append(fieldset);
  const actions = node('div', { class: 'quiz-actions' });
  if (currentStep > 0) actions.append(button(t.back, 'quiz-secondary', () => { step--; persist(); render(); }));
  actions.append(next);
  shell.append(content, actions);
}
function createMessengerIcon(method) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', `quiz-messenger-icon quiz-messenger-icon--${method}`);
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '24');
  svg.setAttribute('height', '24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  if (method === 'whatsapp') {
    const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p1.setAttribute('d', 'M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.63C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.04 14.69 2 12.04 2Z');
    p1.setAttribute('fill', '#25D366');
    const p2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p2.setAttribute('d', 'M17.5 14.33C17.2 14.18 15.73 13.45 15.45 13.35C15.18 13.25 14.98 13.2 14.78 13.5C14.58 13.8 14.01 14.47 13.84 14.67C13.66 14.87 13.49 14.89 13.19 14.74C12.89 14.59 11.92 14.28 10.77 13.25C9.88 12.45 9.28 11.47 9.11 11.17C8.93 10.87 9.09 10.71 9.24 10.56C9.37 10.43 9.54 10.21 9.69 10.03C9.84 9.86 9.89 9.73 9.99 9.53C10.09 9.33 10.04 9.16 9.97 9.01C9.89 8.86 9.32 7.46 9.09 6.88C8.86 6.32 8.62 6.4 8.44 6.39L7.89 6.38C7.69 6.38 7.37 6.46 7.09 6.76C6.82 7.06 6.04 7.79 6.04 9.27C6.04 10.75 7.12 12.18 7.27 12.38C7.42 12.58 9.39 15.62 12.41 16.93C13.13 17.24 13.69 17.43 14.13 17.57C14.85 17.8 15.51 17.77 16.03 17.69C16.61 17.6 17.81 16.96 18.06 16.25C18.31 15.55 18.31 14.95 18.24 14.83C18.16 14.71 17.96 14.63 17.66 14.48L17.5 14.33Z');
    p2.setAttribute('fill', '#FFFFFF');
    svg.append(p1, p2);
  } else {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '12');
    circle.setAttribute('cy', '12');
    circle.setAttribute('r', '11');
    circle.setAttribute('fill', '#24A1DE');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', 'M16.8 7.3L5.8 11.55C5.05 11.85 5.06 12.27 5.67 12.46L8.49 13.34L15.02 9.22C15.33 9.03 15.61 9.14 15.38 9.35L10.09 14.12H10.08L10.07 14.13L9.89 16.82C10.15 16.82 10.27 16.7 10.41 16.56L11.66 15.35L14.26 17.27C14.74 17.53 15.08 17.4 15.2 16.83L16.91 8.78C17.09 8.07 16.64 7.74 16.8 7.3Z');
    p.setAttribute('fill', '#FFFFFF');
    svg.append(circle, p);
  }
  return svg;
}

function renderContact(content, shell, t, { currentMessenger = messenger, measuring = false } = {}) {
  heading(content, t.contactTitle);
  content.append(node('p', { class: 'quiz-intro' }, t.contactIntro));
  const form = node('form', { id: 'quiz-lead-form', novalidate: '', 'aria-labelledby': 'quiz-title' });
  const fieldset = node('fieldset', { class: 'quiz-options quiz-messengers', 'aria-label': t.messenger });
  for (const method of ['whatsapp', 'telegram']) {
    const isSelected = currentMessenger === method;
    const label = node('label', { class: `quiz-choice quiz-messenger-choice${isSelected ? ' is-selected' : ''}` });
    const radio = node('input', { type: 'radio', name: 'messenger', value: method, class: 'quiz-messenger-radio' });
    radio.checked = isSelected;
    // Выбор мессенджера не открывает клавиатуру: поле активируется только по нажатию.
    radio.addEventListener('change', () => { messenger = method; persist(); render(); });
    const icon = createMessengerIcon(method);
    label.append(radio, icon, node('span', { class: 'quiz-messenger-text' }, method === 'whatsapp' ? 'WhatsApp' : 'Telegram'));
    fieldset.append(label);
  }
  const nameField = node('div', { class: 'quiz-field quiz-name-field' });
  const nameInput = node('input', { id: 'quiz-name', name: 'name', type: 'text', 'aria-label': t.name, placeholder: t.namePlaceholder, autocomplete: 'given-name', autocapitalize: 'words', maxlength: 80, required: '', 'aria-describedby': 'quiz-error' });
  nameInput.value = measuring ? '' : contactName;
  nameInput.addEventListener('input', () => { contactName = nameInput.value; nameInput.removeAttribute('aria-invalid'); error.textContent = ''; });
  nameField.append(nameInput);
  const field = node('div', { class: 'quiz-field' });
  const input = node('input', { id: 'quiz-contact', name: 'contact', type: currentMessenger === 'whatsapp' ? 'tel' : 'text', autocomplete: currentMessenger === 'whatsapp' ? 'tel' : 'off', maxlength: 64, required: '', 'aria-describedby': currentMessenger === 'whatsapp' ? 'quiz-country-status quiz-error' : 'quiz-error', placeholder: currentMessenger === 'whatsapp' ? '+34 612 345 678' : '@username' });
  input.value = measuring ? '' : contact[currentMessenger];
  input.addEventListener('input', () => { contact[messenger] = input.value; input.removeAttribute('aria-invalid'); error.textContent = ''; });
  field.append(node('label', { for: 'quiz-contact' }, currentMessenger === 'whatsapp' ? t.phone : t.telegram));
  if (currentMessenger === 'whatsapp') {
    if (!measuring) phoneState.hasInput = Boolean(input.value.trim());
    const component = createPhoneField({ input, lang, text: t, state: phoneState, staticOnly: measuring, onCountry: persist,
      onInput: value => { contact.whatsapp = value; },
      onError: message => { error.textContent = message; input.setAttribute('aria-invalid', String(Boolean(message))); }
    });
    if (!measuring) phoneField = component;
    field.append(component.row, component.hint);
  } else field.append(input);
  const consentLabel = node('label', { class: 'quiz-consent' });
  const checkbox = node('input', { id: 'quiz-consent', type: 'checkbox', name: 'consent', required: '', 'aria-describedby': 'quiz-error' });
  checkbox.checked = !measuring && consent;
  checkbox.defaultChecked = false;
  checkbox.addEventListener('change', () => { consent = checkbox.checked; error.textContent = ''; });
  const consentText = node('span');
  const policyLink = node('a', { href: lang === 'en' ? '/en/privacy' : '/privacy', target: '_blank', rel: 'noopener noreferrer' }, t.consentLink);
  consentText.append(document.createTextNode(t.consentBefore), policyLink, document.createTextNode(t.consentAfter));
  consentLabel.append(checkbox, consentText);
  const trap = node('div', { class: 'quiz-trap', 'aria-hidden': 'true' });
  trap.append(node('input', { name: 'website', type: 'text', tabindex: '-1', autocomplete: 'off' }));
  const error = node('p', { id: 'quiz-error', class: 'quiz-error', role: 'alert' });
  const actions = node('div', { class: 'quiz-actions' });
  const submit = node('button', { class: 'quiz-primary', type: 'submit' }, t.send);
  actions.append(submit, button(t.back, 'quiz-back-link', () => { step--; persist(); render(); }));
  for (const control of actions.querySelectorAll('button')) control.setAttribute('form', form.id);
  form.append(fieldset, nameField, field, consentLabel, trap, error);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting) return;
    const name = normalizeName(nameInput.value);
    if (!name) { error.textContent = t.invalidName; nameInput.setAttribute('aria-invalid', 'true'); nameInput.focus(); return; }
    const raw = messenger === 'whatsapp' ? await phoneField.value() : input.value.trim();
    if (submitting || !form.isConnected) return;
    const phoneLike = Boolean(raw) && /^\+[\d\s()-]+$/.test(raw) && raw.replace(/\D/g, '').length >= 7 && raw.replace(/\D/g, '').length <= 15;
    if (!(phoneLike || messenger === 'telegram' && telegramUsername(raw || ''))) {
      error.textContent = messenger === 'whatsapp' ? t.invalidPhone : t.invalidTelegram;
      input.setAttribute('aria-invalid', 'true'); input.focus(); return;
    }
    if (!checkbox.checked) { error.textContent = t.consentError; checkbox.focus(); return; }
    if (steps.some(question => !hasAnswer(question))) { step = steps.findIndex(question => !hasAnswer(question)); render(); return; }
    submitting = true;
    for (const control of form.elements) control.disabled = true;
    submit.setAttribute('aria-label', t.sending);
    submit.setAttribute('aria-busy', 'true');
    submit.replaceChildren(node('span', { class: 'quiz-spinner', 'aria-hidden': 'true' }));
    error.textContent = '';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('/api/lead', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ requestId, name, language: lang, answers, region: 'unspecified', messenger, contact: raw, ...(messenger === 'whatsapp' ? { phoneCountry: phoneState.country } : {}), consent: { accepted: true, policyVersion }, website: trap.querySelector('input').value })
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        error.textContent = response.status === 429 ? t.rateError : result.code === 'invalid_name' ? t.invalidName : result.code === 'invalid_contact' ? (messenger === 'whatsapp' ? t.invalidPhone : t.invalidTelegram) : t.networkError;
        return;
      }
      const result = await response.json();
      if (result.success !== true || !result.leadId) throw new Error('unconfirmed');
      success = true;
      contact = { whatsapp: '', telegram: '' }; contactName = ''; consent = false;
      try { sessionStorage.removeItem(key); } catch {}
      if (rememberSavedLead(result, lang)) { location.assign(THANK_YOU_PATH); return; }
      // При отключённом sessionStorage благодарность остаётся доступной в текущем окне.
      render();
    } catch { error.textContent = t.networkError; }
    finally {
      clearTimeout(timeout); submitting = false;
      if (!success) {
        for (const control of form.elements) control.disabled = false;
        submit.removeAttribute('aria-busy');
        submit.removeAttribute('aria-label');
        submit.textContent = t.send;
      }
    }
  });
  content.append(form);
  shell.append(content, actions);
}

let measuredWidth = 0;
let sizingFrame;
function sizeQuiz() {
  if (!dialog.open) return;
  const width = dialog.getBoundingClientRect().width;
  const probe = node('div', { class: 'quiz-dialog quiz-measure', 'aria-hidden': 'true' });
  probe.inert = true;
  probe.lang = lang;
  probe.style.width = `${width}px`;
  const variants = [
    ...steps.map((question, currentStep) => ({ id: question.id, stage: 'question', currentStep })),
    { id: 'contact-whatsapp', stage: 'contact', currentStep: steps.length, currentMessenger: 'whatsapp' },
    { id: 'contact-telegram', stage: 'contact', currentStep: steps.length, currentMessenger: 'telegram' },
    { id: 'success', stage: 'success', complete: true }
  ];
  // Измерительные копии не получают контакты и не запускают GeoIP, таймеры или отправку.
  const shells = variants.map(variant => {
    const surface = probe.cloneNode(false);
    surface.dataset.stage = variant.stage;
    surface.append(buildShell({ ...variant, complete: variant.complete === true, measuring: true }));
    for (const element of surface.querySelectorAll('[id], [name], [for], [form]')) {
      for (const attr of ['id', 'name', 'for', 'form']) element.removeAttribute(attr);
    }
    for (const input of surface.querySelectorAll('input')) if (!['checkbox', 'radio'].includes(input.type)) input.value = '';
    return surface;
  });
  document.body.append(...shells);
  try {
    const heights = shells.map(surface => Math.ceil(surface.getBoundingClientRect().height));
    const largest = Math.max(...heights);
    dialog.style.setProperty('--quiz-fixed-height', `${largest}px`);
    dialog.dataset.heightReference = variants[heights.indexOf(largest)].id;
    dialog.dataset.sized = '';
    measuredWidth = width;
  } finally { for (const surface of shells) surface.remove(); }
}
function updateAvailableHeight() {
  const viewport = window.visualViewport;
  dialog.style.setProperty('--quiz-available-height', `${Math.floor(viewport?.height || window.innerHeight)}px`);
  dialog.style.setProperty('--quiz-viewport-offset', `${Math.max(0, viewport?.offsetTop || 0)}px`);
  if (!dialog.open) return;
  // Прокручивается только содержимое квиза, без переноса окна браузером к полю.
  const input = document.activeElement;
  const content = input?.closest('.quiz-content');
  if (!content || !input.matches('input:not([type=radio]):not([type=checkbox]), select')) return;
  const field = input.getBoundingClientRect();
  const area = content.getBoundingClientRect();
  if (field.bottom > area.bottom - 12) content.scrollTop += field.bottom - area.bottom + 12;
  else if (field.top < area.top + 12) content.scrollTop -= area.top + 12 - field.top;
}
function queueSizing() {
  cancelAnimationFrame(sizingFrame);
  sizingFrame = requestAnimationFrame(sizeQuiz);
}
new ResizeObserver(() => {
  if (dialog.open && Math.abs(dialog.getBoundingClientRect().width - measuredWidth) > 0.5) queueSizing();
}).observe(dialog);
window.addEventListener('resize', () => { updateAvailableHeight(); queueSizing(); });
window.visualViewport?.addEventListener('resize', updateAvailableHeight);
window.visualViewport?.addEventListener('scroll', updateAvailableHeight);
dialog.addEventListener('focusin', () => requestAnimationFrame(updateAvailableHeight));
document.fonts.ready.then(queueSizing);
document.fonts.addEventListener('loadingdone', queueSizing);
function openQuiz() {
  if (dialog.open) return;
  focusBefore = document.activeElement;
  pageScrollY = window.scrollY;
  document.body.style.setProperty('--quiz-page-scroll-offset', `${-pageScrollY}px`);
  document.documentElement.classList.add('quiz-open');
  document.body.classList.add('quiz-open');
  dialog.showModal();
  render();
  updateAvailableHeight();
  sizeQuiz();
}
document.querySelector('[data-open-quiz]').addEventListener('click', openQuiz);

// Благодарность доступна только после подтверждённого сервером сохранения заявки.
if (isThankYouPath(location.pathname)) {
  const receipt = receiptFromSession();
  if (!receipt) location.replace('/');
  else { lang = receipt.language; success = true; openQuiz(); }
}
