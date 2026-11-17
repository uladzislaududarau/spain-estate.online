import { ScrollVideoPlayer } from './scroll-video.mjs';
import { ScrollCinematicSequence } from './sequence-player.mjs';
import { createContentMotion } from './content-motion.mjs';
import './region-explorer.mjs';
const {gsap,ScrollTrigger}=window;
const root=document.querySelector('#cinema');
if(gsap&&ScrollTrigger&&root){
 gsap.registerPlugin(ScrollTrigger);
 const mm=gsap.matchMedia();let disposed=false;let activePlayer;let heroTrigger;let contentScenes=[];let chapterPins=[];
 const qa={hero:()=>({range:heroTrigger?{start:heroTrigger.start,end:heroTrigger.end}:null,...(activePlayer?.state()||{renderer:'poster',reduced:true})}),chapters:()=>chapterPins.map(pin=>({id:pin.vars.id,start:pin.start,end:pin.end})),content:()=>contentScenes.map(({id,motion})=>({id,range:{start:motion.scrollTrigger.start,end:motion.scrollTrigger.end},progress:motion.progress()}))};
 window.__estateMotionQA=Object.freeze(qa);
 mm.add({desktop:'(min-width:800px)',phone:'(max-width:799px)',reduce:'(prefers-reduced-motion:reduce)'},context=>{
  const {phone,reduce}=context.conditions;let player;let dead=false;const controller=new AbortController();
  if(reduce){root.classList.remove('motion-enabled');return;}
  root.classList.add('motion-enabled');
  const video=root.querySelector('video');const canvas=root.querySelector('canvas');const bar=root.querySelector('.cinema-progress-fill');
  let sceneActive=!document.hidden;
  delete video.dataset.painted;
  video.pause();video.removeAttribute('src');video.load();
  const main=document.querySelector('#main')||document.body;
  const chapters=[...document.querySelectorAll('[data-pinned-chapter]')];
  if(!phone){
    chapters.forEach(chapter=>chapter.classList.add('coast-pinned'));
    // Create pins in reading order so each subsequent scene accounts for earlier holds.
    chapterPins=chapters.map((chapter,index)=>ScrollTrigger.create({
      id:chapter.id==='regions'?'estate-coast-hold':`estate-${chapter.id}-hold`,
      trigger:chapter,pin:true,pinSpacing:true,start:'top top',
      end:()=>`+=${Math.round(innerHeight*1.15)}`,
      invalidateOnRefresh:true,refreshPriority:chapters.length-index+1
    }));
  }
  const background={progress:0};
  // Fit every frame of the new Full HD source to the page, including the footer.
  let backgroundRefreshFrame;
  const paintBackground=progress=>{
    background.progress=Math.max(0,Math.min(1,progress));
    player?.setProgress(background.progress);if(bar)bar.style.transform=`scaleX(${background.progress})`;
  };
  // Read the native trigger position directly. Refreshing a scrubbed value tween
  // can reset its value to zero while Safari still sits at the page bottom.
  heroTrigger=ScrollTrigger.create({id:'estate-cinema',trigger:main,start:'top top',
    end:()=>Math.max(1,ScrollTrigger.maxScroll(window)),invalidateOnRefresh:true,
    onUpdate:self=>{if(!ScrollTrigger.isRefreshing)paintBackground(self.progress);},
    onRefresh:self=>{
      cancelAnimationFrame(backgroundRefreshFrame);
      backgroundRefreshFrame=requestAnimationFrame(()=>{if(!dead)paintBackground((self.scroll()-self.start)/Math.max(1,self.end-self.start));});
    }
  });
  const heroCopy=document.querySelector('.hero-copy');
  // Text is visible at rest; only native scroll moves the parent.
  gsap.to(heroCopy,{
    scrollTrigger:{id:'estate-hero-copy',trigger:'#hero',start:'top top',
      end:()=>`+=${Math.round(Math.min(innerHeight*.55,420))}`,
      scrub:.25,invalidateOnRefresh:true},
    y:phone?-36:-64,opacity:0,ease:'none'
  });
  contentScenes=createContentMotion(gsap,{phone});
  const useVideo=()=>{
    if(dead)return;
    player?.dispose();
    video.src=video.dataset.fallbackSrc;
    player=new ScrollVideoPlayer(video);activePlayer=player;
    player.setProgress(background.progress);player.setActive(sceneActive&&!document.hidden);
  };
  // The query option keeps a directly reviewable fallback without changing the source clip.
  if(new URLSearchParams(location.search).get('background')==='video')useVideo();
  else{
    const q=new URLSearchParams(location.search);
    const preferStandard=!phone&&q.get('quality')!=='4k';
    const folder=phone?'mobile':(preferStandard?'desktop-standard':'desktop');
    const base=`/assets/cinema-main/${folder}/`;
    const loadManifest=(dir)=>fetch(dir+'manifest.json',{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error('sequence_manifest');return r.json().then(m=>({manifest:m,dir}));});
    (window.__cinemaBoot?.folder===folder ? window.__cinemaBoot.manifest.then(manifest=>({manifest,dir:base})) : loadManifest(base)).catch(()=>loadManifest('/assets/cinema-main/desktop/')).then(({manifest,dir})=>{
      if(dead)return;
      if(!Array.isArray(manifest.frames)||manifest.frames.length!==manifest.count||manifest.count<2||manifest.width<1||manifest.height<1)throw new Error('sequence_manifest_shape');
      player=new ScrollCinematicSequence(canvas,manifest,dir,{mobile:phone,onFatal:useVideo});activePlayer=player;
      player.setProgress(background.progress);player.setActive(sceneActive&&!document.hidden);
    }).catch(error=>{if(!dead&&error.name!=='AbortError')useVideo();});
  }
  const tick=()=>player?.draw();gsap.ticker.add(tick);
  const observer=new IntersectionObserver(entries=>{sceneActive=entries[0].isIntersecting;if(player)player.setActive(sceneActive&&!document.hidden);},{rootMargin:'200px'});observer.observe(root);
  const resize=new ResizeObserver(()=>player?.resize());resize.observe(canvas);
  // A shorter city table changes the full-page sequence and text bounds.
  let layoutFrame;let layoutWidth=0;let layoutHeight=0;
  const refreshLayout=()=>{
    cancelAnimationFrame(layoutFrame);
    layoutFrame=requestAnimationFrame(()=>{
      if(!dead&&!document.documentElement.classList.contains('quiz-open'))ScrollTrigger.refresh();
    });
  };
  const layoutObserver=new ResizeObserver(([entry])=>{
    if(document.documentElement.classList.contains('quiz-open'))return;
    const {width,height}=entry.contentRect;
    if(Math.abs(width-layoutWidth)<.5&&Math.abs(height-layoutHeight)<.5)return;
    layoutWidth=width;layoutHeight=height;refreshLayout();
  });layoutObserver.observe(main);
  // Preference/orientation changes can rebuild triggers while the modal locks body position.
  // Capture close, then measure next frame after the quiz restores ordinary document scrolling.
  const dialogClosed=event=>{if(event.target.matches?.('dialog.quiz-dialog'))refreshLayout();};
  document.addEventListener('close',dialogClosed,true);
  const visibility=()=>player?.setActive(sceneActive&&!document.hidden);document.addEventListener('visibilitychange',visibility);
  return()=>{dead=true;cancelAnimationFrame(backgroundRefreshFrame);controller.abort();cancelAnimationFrame(layoutFrame);layoutObserver.disconnect();document.removeEventListener('close',dialogClosed,true);gsap.ticker.remove(tick);observer.disconnect();resize.disconnect();document.removeEventListener('visibilitychange',visibility);player?.dispose();if(activePlayer===player)activePlayer=undefined;chapters.forEach(chapter=>chapter.classList.remove('coast-pinned'));chapterPins=[];root.classList.remove('motion-enabled');heroTrigger=undefined;contentScenes=[];if(bar)bar.style.transform='';};
 });
 document.fonts.ready.then(()=>{if(!disposed)ScrollTrigger.refresh();});
 window.addEventListener('pagehide',()=>{disposed=true;mm.revert();},{once:true});
}
