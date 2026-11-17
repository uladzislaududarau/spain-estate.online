/* Start bounded preview downloads before the motion module's dependency chain. */
(()=>{
 if(matchMedia('(prefers-reduced-motion: reduce)').matches||location.pathname.startsWith('/thank-you'))return;
 const cancellation=new AbortController();
 matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',event=>{if(event.matches)cancellation.abort();});
 const phone=matchMedia('(max-width:799px)').matches;
 const folder=phone?'mobile':new URLSearchParams(location.search).get('quality')==='4k'?'desktop':'desktop-standard';
 const previewBase=`/assets/cinema-main/preview/${phone?'mobile':'desktop'}/`;
 const boot=window.__cinemaBoot={phone,folder,blobs:new Map(),loaded:0,total:48,ready:false,finished:false};
 const request=url=>fetch(url,{signal:cancellation.signal}).then(r=>{if(!r.ok)throw Error('cinema_asset');return r;});
 boot.manifest=request(`/assets/cinema-main/${folder}/manifest.json`).then(r=>r.json());boot.manifest.catch(()=>{});
 boot.previews=request(previewBase+'manifest.json').then(r=>r.json()).then(async manifest=>{
  boot.previewManifest=manifest;boot.total=manifest.frames.length;
  const remaining=[...manifest.frames];
  while(remaining.length&&!cancellation.signal.aborted){
   remaining.sort((a,b)=>Math.abs(a.index-(boot.target||0))-Math.abs(b.index-(boot.target||0)));
   const frame=remaining.shift();
   if(document.hidden)await new Promise(resolve=>{const visible=()=>{if(!document.hidden){document.removeEventListener('visibilitychange',visible);resolve();}};document.addEventListener('visibilitychange',visible);});
   const blob=await request(previewBase+frame.file).then(r=>r.blob());boot.blobs.set(frame.index,blob);boot.loaded++;
   if(boot.loaded===1){const bitmap=await createImageBitmap(blob);const canvas=document.querySelector('#cinema canvas');
    if(canvas&&!canvas.dataset.painted){const w=canvas.clientWidth,h=canvas.clientHeight;canvas.width=Math.round(w);canvas.height=Math.round(h);const ctx=canvas.getContext('2d',{alpha:false});const scale=Math.max(w/bitmap.width,h/bitmap.height);ctx.drawImage(bitmap,(w-bitmap.width*scale)/2,(h-bitmap.height*scale)/2,bitmap.width*scale,bitmap.height*scale);canvas.dataset.painted='true';}
    bitmap.close();boot.ready=true;}
   window.dispatchEvent(new CustomEvent('sp:cinema-progress',{detail:{loaded:boot.loaded,total:boot.total,ready:boot.ready}}));
   // Yield between low-priority overview downloads to the visible target frame.
   if(boot.loaded>=3)await new Promise(r=>setTimeout(r,120));
  }
  boot.finished=true;
 }).catch(()=>{boot.finished=true;window.dispatchEvent(new Event('sp:cinema-unavailable'));});
})();
