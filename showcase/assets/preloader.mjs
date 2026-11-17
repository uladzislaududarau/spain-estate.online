// Real first-frame readiness, with a bounded, skippable wait; no whole-set gate.
export function initPreloader(){
 const overlay=document.getElementById('site-preloader');if(!overlay)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let done=false;const start=performance.now();
 let repeat=false;try{repeat=sessionStorage.getItem('sp_preloaded_v1')==='1';}catch{}
 const dismiss=()=>{if(done)return;done=true;clearTimeout(safety);clearTimeout(minimum);window.removeEventListener('sp:cinema-progress',progress);window.removeEventListener('sp:cinema-unavailable',dismiss);reduced.removeEventListener('change',dismiss);overlay.classList.add('is-exiting');try{sessionStorage.setItem('sp_preloaded_v1','1');}catch{}setTimeout(()=>overlay.remove(),450);window.dispatchEvent(new CustomEvent('sp:preloader-done'));};
 const progress=()=>{const boot=window.__cinemaBoot;if(boot?.ready&&performance.now()-start>=1800)dismiss();};
 const safety=setTimeout(dismiss,5500);const minimum=setTimeout(progress,1800);
 window.addEventListener('sp:cinema-progress',progress);window.addEventListener('sp:cinema-unavailable',dismiss);reduced.addEventListener('change',dismiss);
 if(reduced.matches||repeat||location.pathname.startsWith('/thank-you')){dismiss();overlay.remove();}else progress();
}
initPreloader();
