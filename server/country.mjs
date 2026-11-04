import geoip from 'geoip-country';
import { isSupportedCountry } from 'libphonenumber-js';

const valid = value => typeof value === 'string' && /^[A-Z]{2}$/.test(value) && isSupportedCountry(value) ? value : null;
export function resolveCountry(request, { provider = '', lookup = geoip.lookup } = {}) {
  // Заголовки геолокации доверяются только явно выбранному прокси.
  const header = provider === 'vercel' ? 'x-vercel-ip-country' : provider === 'cloudflare' ? 'cf-ipcountry' : null;
  const fromEdge = header ? valid(request.headers[header]) : null;
  if (fromEdge) return { country: fromEdge, source: 'ip' };
  // Без доверенного прокси используем адрес TCP-соединения, а не подменяемый X-Forwarded-For.
  const ip = request.socket.remoteAddress?.replace(/^::ffff:/, '');
  let country = null;
  try { country = valid(ip && lookup(ip)?.country); } catch {}
  return { country, source: country ? 'ip' : 'unknown' };
}
