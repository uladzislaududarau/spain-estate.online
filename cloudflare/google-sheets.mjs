import { steps } from '../showcase/assets/quiz.config.mjs';

export const sheetColumns = [
  'ID заявки', 'Дата', 'Время', 'Часовой пояс', 'Имя', 'Способ связи', 'Контакт',
  'Язык', 'Регион Испании', 'Цель покупки', 'Тип объекта', 'Бюджет', 'Срок покупки',
  'Согласие', 'Дата и время согласия (UTC)', 'Версия политики', 'Создано (UTC)', 'Источник'
];

export function sheetRow(lead, timeZone = 'Asia/Nicosia') {
  const date = new Date(lead.savedAt);
  const answer = id => {
    const question = steps.find(step => step.id === id);
    return [].concat(lead.answers[id]).map(value => question.options.find(option => option[0] === value)?.[1] || value).join('\n');
  };
  return [
    lead.leadId,
    new Intl.DateTimeFormat('ru-RU', { timeZone, day: '2-digit', month: '2-digit', year: 'numeric' }).format(date),
    new Intl.DateTimeFormat('ru-RU', { timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(date),
    timeZone, lead.name, lead.messenger === 'whatsapp' ? 'WhatsApp' : 'Telegram', lead.contact,
    lead.language === 'ru' ? 'Русский' : 'Английский', answer('regions'), answer('purpose'),
    answer('propertyType'), answer('budgets'), answer('timeline'),
    lead.consent.accepted ? 'Да' : 'Нет', lead.consent.timestamp, lead.consent.policyVersion,
    lead.savedAt, 'https://spain-estate.online'
  ].map(value => String(value ?? ''));
}

export function sheetsEnabled(env) { return env.GOOGLE_SHEETS_ENABLED === 'true'; }

export async function sendToGoogleSheets(lead, env, fetcher = fetch) {
  if (!sheetsEnabled(env)) return false;
  let url;
  try { url = new URL(env.GOOGLE_SHEETS_WEBHOOK_URL); } catch { throw new Error('sheets_not_configured'); }
  if (url.origin !== 'https://script.google.com' || !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname)
    || url.search || url.hash || url.username || url.password || !/^[a-f0-9]{64}$/i.test(env.GOOGLE_SHEETS_WEBHOOK_SECRET || '')) {
    throw new Error('sheets_not_configured');
  }
  const payload = JSON.stringify({ leadId: lead.leadId, values: sheetRow(lead, env.LEAD_NOTIFICATION_TIME_ZONE || 'Asia/Nicosia') });
  const issuedAt = Date.now();
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(env.GOOGLE_SHEETS_WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(`${issuedAt}\n${payload}`));
  const signature = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  const response = await fetcher(url.href, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version: 1, issuedAt, payload, signature }),
    redirect: 'follow', signal: AbortSignal.timeout(20000)
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.ok !== true || result.leadId !== lead.leadId) throw new Error('sheets_delivery_failed');
  return true;
}
