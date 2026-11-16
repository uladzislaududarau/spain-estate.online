import { ScrollCinematicSequence } from './sequence-player.mjs';
const {gsap,ScrollTrigger}=window;
const root=document.querySelector('#cinema');
if(gsap&&ScrollTrigger&&root){
 gsap.registerPlugin(ScrollTrigger);
 const mm=gsap.matchMedia();let disposed=false;let activePlayer;let heroTrigger;let immersiveTrigger;
 const qa={hero:()=>({range:heroTrigger?{start:heroTrigger.start,end:heroTrigger.end}:null,...(activePlayer?.state()||{renderer:'poster',reduced:true})}),immersive:()=>({range:immersiveTrigger?{start:immersiveTrigger.start,end:immersiveTrigger.end}:null,clipPath:getComputedStyle(document.querySelector('.threshold-image')).clipPath})};
 window.__estateMotionQA=Object.freeze(qa);
 mm.add({desktop:'(min-width:800px)',phone:'(max-width:799px)',reduce:'(prefers-reduced-motion:reduce)'},context=>{
  const {phone,reduce}=context.conditions;let player;let dead=false;const controller=new AbortController();
  if(reduce){root.classList.remove('motion-enabled');return;}
  root.classList.add('motion-enabled');
  const canvas=root.querySelector('canvas');const bar=root.querySelector('.cinema-progress-fill');const chapter=root.querySelector('[data-chapter]');
  const chapters=['Архитектура света','Открытое пространство','Ближе к морю','Время для себя'];
  const main=document.querySelector('#main')||document.body;
  heroTrigger=ScrollTrigger.create({id:'estate-cinema',trigger:main,start:'top top',end:'bottom bottom',scrub:true,invalidateOnRefresh:true,onUpdate:self=>{
    player?.setProgress(self.progress);if(bar)bar.style.transform=`scaleX(${self.progress})`;const text=chapters[Math.min(3,Math.floor(self.progress*4))];if(chapter&&chapter.textContent!==text)chapter.textContent=text;
  }});
  const intro=gsap.timeline({defaults:{ease:'power2.out',duration:.9}});intro.from('.hero-title',{y:20,opacity:.7},0).from('.hero-action',{y:10,opacity:.5},.15);
  gsap.to('.hero-content',{scrollTrigger:{trigger:'#hero',start:'top top',end:'bottom top',scrub:true},y:-70,opacity:0,ease:'none'});
  const threshold=document.querySelector('#threshold');
  if(threshold){
    const tl=gsap.timeline({scrollTrigger:{id:'estate-threshold',trigger:threshold,start:'top bottom',end:'top top',scrub:true,invalidateOnRefresh:true}});
    tl.fromTo('.threshold-image',{clipPath:phone?'inset(8% 6% 8% 6% round 24px)':'inset(12% 18% 12% 18% round 32px)'},{clipPath:'inset(0% 0% 0% 0% round 0px)',duration:1,ease:'none'},0)
      .fromTo('.threshold-image img',{scale:1.08},{scale:1,duration:1,ease:'none'},0);
    immersiveTrigger=tl.scrollTrigger;
  }
  const tier=phone?'mobile':'desktop';
  fetch(`/assets/sequence/${tier}/manifest.json`,{signal:controller.signal}).then(r=>{if(!r.ok)throw Error('manifest');return r.json();}).then(manifest=>{
    if(dead||disposed||!manifest.count||manifest.count>300||manifest.width>1280||manifest.height>720)return;
    player=new ScrollCinematicSequence(canvas,manifest,`/assets/sequence/${tier}/`,{mobile:phone,startIndex:48,focalX:phone?.55:.5});activePlayer=player;player.setProgress(heroTrigger.progress);
  }).catch(()=>{/* Keep permanent poster and usable content. */});
  const tick=()=>player?.draw();gsap.ticker.add(tick);
  const observer=new IntersectionObserver(entries=>{if(player)player.setActive(entries[0].isIntersecting&&!document.hidden);},{rootMargin:'200px'});observer.observe(root);
  const resize=new ResizeObserver(()=>player?.resize());resize.observe(canvas);
  const visibility=()=>player?.setActive(!document.hidden);document.addEventListener('visibilitychange',visibility);
  return()=>{dead=true;controller.abort();gsap.ticker.remove(tick);observer.disconnect();resize.disconnect();document.removeEventListener('visibilitychange',visibility);player?.dispose();if(activePlayer===player)activePlayer=undefined;root.classList.remove('motion-enabled');heroTrigger=undefined;immersiveTrigger=undefined;if(bar)bar.style.transform='';};
 });
 document.fonts.ready.then(()=>{if(!disposed)ScrollTrigger.refresh();});
 window.addEventListener('pagehide',()=>{disposed=true;mm.revert();},{once:true});
}
