/* One compressed clip in memory, before scroll starts seeking it. No frame fetches. */
(()=>{
 const clips=new Map(),controllers=new Map();
 matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',event=>{if(event.matches)for(const controller of controllers.values())controller.abort();});
 window.__loadCinemaVideo=phone=>{
  const key=phone?'mobile':'desktop';
  if(!clips.has(key)){const controller=new AbortController();controllers.set(key,controller);clips.set(key,fetch(`/assets/cinema-main/scroll-${key}.mp4`,{signal:controller.signal}).then(r=>{if(!r.ok)throw Error('cinema_video');return r.blob();}).then(blob=>({url:URL.createObjectURL(blob),bytes:blob.size})).catch(error=>{clips.delete(key);throw error;}).finally(()=>controllers.delete(key)));}
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
