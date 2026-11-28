// /thank-you открывается только после сохранённой заявки (квитанция в sessionStorage на 30 минут).
import { receiptFromSession } from '/shared/lib/lead-receipt.mjs';

if (!receiptFromSession()) location.replace('/');
else {
  let info = null;
  try { info = JSON.parse(sessionStorage.getItem('spfs-thanks')); } catch {}
  const names = { 'nature-resort': 'Nature Resort', 'horizon-ii': 'Horizon II Resort', 'coronella-living': 'Coronella Living', 'villas-de-la-sal': 'Villas de la Sal', 'tm-tower': 'TM Tower' };
  const channel = info?.channel || 'WhatsApp или Telegram';
  if (info?.kind === 'property' && names[info.slug]) {
    document.getElementById('ty-text').textContent = `Вышлем вам презентацию ${names[info.slug]} в ${channel}.`;
    document.getElementById('ty-back').href = `/${info.slug}`;
  } else {
    document.getElementById('ty-text').textContent = `Вышлем вам все топовые предложения в ${channel}.`;
  }
  await import('/persiana/consent.js');
}
