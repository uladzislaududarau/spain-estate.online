// A scheduled display date, not evidence that source prices were refreshed.
export const priceTimeZone='Europe/Madrid';
const madrid=new Intl.DateTimeFormat('en-GB',{timeZone:priceTimeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'});
export function dailyPriceStamp(now=new Date()){
 const p=Object.fromEntries(madrid.formatToParts(now).filter(part=>part.type!=='literal').map(part=>[part.type,Number(part.value)]));
 const date=new Date(Date.UTC(p.year,p.month-1,p.day));
 if(p.hour<9)date.setUTCDate(date.getUTCDate()-1);
 const iso=date.toISOString().slice(0,10);
 return {date:iso,label:iso.split('-').reverse().join('.')+' · 09:00',timeZone:priceTimeZone};
}
export function nextPriceStampChange(now=new Date()){
 const date=dailyPriceStamp(now).date;let low=now.getTime(),high=low+27*3600000;
 while(high-low>1){const mid=Math.floor((low+high)/2);if(dailyPriceStamp(new Date(mid)).date===date)low=mid;else high=mid;}
 return high;
}
