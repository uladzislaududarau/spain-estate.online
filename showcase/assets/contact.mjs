export function telegramUsername(value) {
  const username = value.trim().replace(/^@/, '');
  return /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(username) ? `@${username}` : null;
}
export function normalizeContact(messenger, value, parsePhone) {
  if (messenger === 'telegram') {
    const username = telegramUsername(value);
    if (username) return username;
  }
  if (!/^\+[\d\s()-]+$/.test(value.trim())) return null;
  const phone = parsePhone(value.trim());
  return phone?.isValid() ? phone.number : null;
}

export function normalizeName(value) {
  if (typeof value !== 'string') return null;
  const name = value.trim().replace(/\s+/g, ' ');
  return name.length >= 1 && name.length <= 80 && /^[\p{L}\p{M}][\p{L}\p{M} .’ʼ'\-]*$/u.test(name) ? name : null;
}
