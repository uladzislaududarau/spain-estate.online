/* One compressed clip in memory, before scroll starts seeking it. No frame fetches. */
(()=>{
 const style=document.querySelector('link[href="/assets/estate.css"]');
 const stylesReady=style?.sheet?Promise.resolve():new Promise((resolve,reject)=>{style?.addEventListener('load',resolve,{once:true});style?.addEventListener('error',reject,{once:true});});
 let typeTimer;
 window.__heroTypeReady=Promise.race([
  stylesReady.then(()=>Promise.all([
   document.fonts.load('700 32px Onest','Недвижимость Spain 123'),
   document.fonts.load('400 15px Manrope','Мы собрали Spain 123'),
   document.fonts.load('600 14px Manrope','ВЫБРАТЬ РЕГИОН Spain 123')
  ])).then(()=>document.fonts.ready),
  new Promise((_,reject)=>{typeTimer=setTimeout(()=>reject(Error('critical_fonts_timeout')),8000);})
 ]).then(()=>{if(window.__heroTypeFrozen)return false;window.__heroTypeLoaded=true;document.documentElement.dataset.heroFonts='ready';return true;})
  .catch(()=>{document.documentElement.dataset.heroFonts='fallback';return false;})
  .finally(()=>{clearTimeout(typeTimer);window.dispatchEvent(new Event('sp:hero-type-ready'));});
 const clips=new Map(),controllers=new Map();
 matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',event=>{if(event.matches)for(const controller of controllers.values())controller.abort();});
 window.__loadCinemaVideo=phone=>{
  const key=phone?'mobile':'desktop';
  if(!clips.has(key)){const controller=new AbortController();controllers.set(key,controller);clips.set(key,window.__heroTypeReady.then(()=>fetch(`/assets/cinema-main/scroll-${key}.mp4`,{signal:controller.signal,priority:'low'})).then(r=>{if(!r.ok)throw Error('cinema_video');return r.blob();}).then(blob=>({url:URL.createObjectURL(blob),bytes:blob.size})).catch(error=>{clips.delete(key);throw error;}).finally(()=>controllers.delete(key)));}
  return clips.get(key);
 };
 window.dispatchEvent(new Event('sp:cinema-loader'));
 if(matchMedia('(prefers-reduced-motion: reduce)').matches||location.pathname.startsWith('/thank-you'))return;
 const phone=matchMedia('(max-width:799px)').matches;
 const boot=window.__cinemaBoot={phone,kind:'video',ready:false,finished:false};
 boot.promise=window.__loadCinemaVideo(phone);
 boot.promise.then(async clip=>{
  let video=document.querySelector('#cinema video');
  if(!video)video=await new Promise(resolve=>{const observer=new MutationObserver(()=>{const v=document.querySelector('#cinema video');if(v){observer.disconnect();resolve(v);}});observer.observe(document.documentElement,{childList:true,subtree:true});});
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const ready=()=>{boot.ready=true;boot.finished=true;boot.bytes=clip.bytes;if(scrollY<2)video.dataset.painted='true';window.dispatchEvent(new Event('sp:cinema-progress'));};
  video.addEventListener('loadeddata',ready,{once:true});video.addEventListener('error',()=>window.dispatchEvent(new Event('sp:cinema-unavailable')),{once:true});video.muted=true;video.playsInline=true;video.preload='auto';video.src=clip.url;video.load();
 }).catch(()=>{boot.finished=true;window.dispatchEvent(new Event('sp:cinema-unavailable'));});
})();
