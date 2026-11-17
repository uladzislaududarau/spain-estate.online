// Typography/layout are mandatory; a slow video can finish behind a usable Hero.
export function initPreloader(){
 const overlay=document.getElementById('site-preloader');if(!overlay){document.documentElement.classList.remove('boot-pending');return;}
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');const start=performance.now();
 const navigation=performance.getEntriesByType('navigation')[0];
 const previousRestoration=history.scrollRestoration;
 const openAtTop=location.pathname==='/'&&!location.hash&&navigation?.type!=='back_forward';
 if(openAtTop){history.scrollRestoration='manual';window.scrollTo({top:0,behavior:'instant'});}
 let done=false,typeReady=false,mediaExpired=false;
 const cleanup=()=>{clearTimeout(minimum);clearTimeout(mediaWait);clearTimeout(window.__heroBootDeadline);window.removeEventListener('sp:cinema-progress',check);window.removeEventListener('sp:cinema-loader',waitForType);};
 const dismiss=()=>{
  if(done||!typeReady)return;done=true;cleanup();
  document.documentElement.classList.remove('boot-pending');
  if(openAtTop)window.scrollTo({top:0,behavior:'instant'});
  // Unlock/layout/refresh while the opaque overlay still covers the page.
  requestAnimationFrame(()=>{window.ScrollTrigger?.refresh();requestAnimationFrame(()=>{
   if(openAtTop)window.scrollTo({top:0,behavior:'instant'});
   if(openAtTop)history.scrollRestoration=previousRestoration;
   let removed=false;
   const finish=()=>{if(removed)return;removed=true;overlay.removeEventListener('wheel',preventScroll);overlay.removeEventListener('touchmove',preventScroll);overlay.remove();window.dispatchEvent(new Event('sp:preloader-done'));};
   overlay.addEventListener('transitionend',event=>{if(event.target===overlay&&event.propertyName==='opacity')finish();});
   overlay.classList.add('is-exiting');setTimeout(finish,reduced.matches?180:1450);
  });});
 };
 const check=()=>{if(typeReady&&(reduced.matches||location.pathname.startsWith('/thank-you')||performance.now()-start>=2600)&&(window.__cinemaBoot?.ready||mediaExpired||reduced.matches||location.pathname.startsWith('/thank-you')))dismiss();};
 const preventScroll=event=>event.preventDefault();overlay.addEventListener('wheel',preventScroll,{passive:false});overlay.addEventListener('touchmove',preventScroll,{passive:false});
 const minimum=setTimeout(check,2600);const mediaWait=setTimeout(()=>{mediaExpired=true;check();},5500);
 const waitForType=()=>{if(window.__heroTypeReady)window.__heroTypeReady.then(()=>{typeReady=true;check();});};
 window.addEventListener('sp:cinema-progress',check);
 if(window.__heroTypeReady)waitForType();else window.addEventListener('sp:cinema-loader',waitForType,{once:true});
}
initPreloader();
