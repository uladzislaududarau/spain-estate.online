let library;
function loadLibrary() {
  return library ||= import('./phone-library.js').then(() => globalThis.libphonenumber).catch(error => { library = undefined; throw error; });
}
export function flag(code) {
  return [...code.toUpperCase()].map(letter => String.fromCodePoint(letter.charCodeAt(0) + 127397)).join('');
}
export function countryFromLocale(locales, supported) {
  for (const locale of locales) {
    try { const region = new Intl.Locale(locale).region; if (supported.includes(region)) return region; } catch {}
  }
  return 'ES';
}
export function applyDetectedCountry(state, country, supported) {
  if (!supported.includes(country) || state.source === 'manual' || state.source === 'number' || state.hasInput) return false;
  state.country = country; state.source = 'ip'; return true;
}
export function phoneValue(value, country, tools) {
  if (!/^[+\d\s().-]+$/.test(value.trim())) return null;
  const parsed = tools.parsePhoneNumberFromString(value.trim(), { defaultCountry: country, extract: false });
  return parsed?.isPossible() ? parsed.number : null;
}
export function createPhoneField({ input, lang, text, state, onCountry, onInput, onError, staticOnly = false }) {
  const row = document.createElement('div');
  row.className = 'quiz-phone-row';
  const select = document.createElement('select');
  select.id = 'quiz-phone-country'; select.name = 'phoneCountry';
  select.setAttribute('aria-label', text.country);
  select.setAttribute('autocomplete', 'country');
  const fallback = { ES: '34', NO: '47', CY: '357', UA: '380', GB: '44', DE: '49' };
  const loadingOption = document.createElement('option');
  loadingOption.value = state.country; loadingOption.textContent = `${state.country} +${fallback[state.country] || ''}`;
  select.append(loadingOption); select.disabled = true;
  input.autocomplete = 'tel-national'; input.placeholder = text.nationalPlaceholder;
  const numberGroup = document.createElement('div');
  numberGroup.className = 'quiz-phone-number';
  numberGroup.append(input);
  row.append(select, numberGroup);
  let tools;
  let cancelled = false;
  const names = new Intl.DisplayNames([lang], { type: 'region' });
  const hint = document.createElement('p');
  hint.className = 'quiz-hint'; hint.id = 'quiz-country-status'; hint.setAttribute('aria-live', 'polite');
  hint.textContent = '';
  input.setAttribute('aria-describedby', 'quiz-country-status quiz-error');
  // Геометрия поля для скрытого измерения квиза без загрузки библиотеки и GeoIP-запроса.
  if (staticOnly) return { row, hint };
  const update = () => {
    select.value = state.country;
    for (const option of select.options) option.label = option.value === state.country ? `${state.country} +${tools?.getCountryCallingCode(state.country) || fallback[state.country] || ''}` : option.textContent;
    select.title = `${names.of(state.country)} (+${tools?.getCountryCallingCode(state.country) || fallback[state.country] || ''})`;
    hint.textContent = '';
  };
  const ready = loadLibrary().then(value => {
    tools = value;
    const supported = tools.getCountries();
    if (!supported.includes(state.country)) state.country = 'ES';
    const options = supported.map(country => ({ country, name: names.of(country) || country })).sort((a, b) => a.name.localeCompare(b.name, lang));
    select.replaceChildren(...options.map(({ country, name }) => {
      const option = document.createElement('option');
      option.value = country; option.textContent = `${name} (+${tools.getCountryCallingCode(country)})`;
      return option;
    }));
    if (state.source === 'fallback') state.country = countryFromLocale(navigator.languages || [navigator.language], supported);
    select.disabled = false;
    if (!cancelled) update();
    return tools;
  }).catch(() => {
    hint.textContent = text.countryLoadError;
    input.placeholder = '+34 612 345 678'; row.classList.add('quiz-phone-fallback');
    return null;
  });
  select.addEventListener('change', () => {
    state.country = select.value; state.source = 'manual';
    // Вставленный международный номер сохраняется при смене страны без потери цифр.
    if (input.value.trim().startsWith('+') && tools) {
      const parsed = tools.parsePhoneNumberFromString(input.value.trim());
      if (parsed) input.value = parsed.nationalNumber;
    }
    onInput(input.value); onCountry(); update(); onError(''); input.focus({ preventScroll: true });
  });
  input.addEventListener('input', () => {
    state.hasInput = Boolean(input.value.trim());
    if (tools && input.value.trim().startsWith('+')) {
      const parsed = tools.parsePhoneNumberFromString(input.value.trim());
      if (parsed?.country) {
        state.country = parsed.country; state.source = 'number';
        input.value = parsed.nationalNumber;
        onCountry(); update();
      }
    }
    onInput(input.value);
  });
  const geo = fetch('/api/country', { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(3500) })
    .then(response => response.ok ? response.json() : null).catch(() => null);
  Promise.all([ready, geo]).then(([value, location]) => {
    if (cancelled || !value) return;
    if (applyDetectedCountry(state, location?.country, value.getCountries())) { update(); onCountry(); }
  });
  input.addEventListener('blur', async () => {
    const value = await ready;
    if (cancelled || !value || !input.value.trim()) return;
    if (!phoneValue(input.value, state.country, value)) onError(text.invalidCountryPhone);
  });
  return {
    row, hint,
    cancel() { cancelled = true; },
    async value() {
      const value = await ready;
      if (value) return phoneValue(input.value, state.country, value);
      return /^\+[\d\s().-]{7,24}$/.test(input.value.trim()) ? input.value.trim() : null;
    }
  };
}
