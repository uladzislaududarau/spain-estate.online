import { ScrollVideoPlayer } from './scroll-video.mjs';
import { createContentMotion } from './content-motion.mjs';
const {gsap,ScrollTrigger}=window;
const root=document.querySelector('#cinema');
if(gsap&&ScrollTrigger&&root){
 gsap.registerPlugin(ScrollTrigger);
 const mm=gsap.matchMedia();let disposed=false;let activePlayer;let heroTrigger;let contentScenes=[];
 const qa={hero:()=>({range:heroTrigger?{start:heroTrigger.start,end:heroTrigger.end}:null,...(activePlayer?.state()||{renderer:'poster',reduced:true})}),content:()=>contentScenes.map(({id,motion})=>({id,range:{start:motion.scrollTrigger.start,end:motion.scrollTrigger.end},progress:motion.progress()}))};
 window.__estateMotionQA=Object.freeze(qa);
 mm.add({desktop:'(min-width:800px)',phone:'(max-width:799px)',portrait:'(orientation:portrait)',reduce:'(prefers-reduced-motion:reduce)'},context=>{
  const {phone,portrait,reduce}=context.conditions;let player;let dead=false;const controller=new AbortController();
  if(reduce){root.classList.remove('motion-enabled');return;}
  root.classList.add('motion-enabled');
  const video=root.querySelector('video');const bar=root.querySelector('.cinema-progress-fill');const chapter=root.querySelector('[data-chapter]');
  const chapters=['Архитектура света','Открытое пространство','Ближе к морю','Время для себя'];
  const main=document.querySelector('#main')||document.body;
  const background={progress:0};
  heroTrigger=gsap.to(background,{progress:1,ease:'none',scrollTrigger:{id:'estate-cinema',trigger:main,start:'top top',end:'bottom bottom',scrub:.45,invalidateOnRefresh:true},onUpdate:()=>{
    player?.setProgress(background.progress);if(bar)bar.style.transform=`scaleX(${background.progress})`;const text=chapters[Math.min(3,Math.floor(background.progress*4))];if(chapter&&chapter.textContent!==text)chapter.textContent=text;
  }}).scrollTrigger;
  const heroCopy=document.querySelector('.hero-copy');
  // Entrance owns the child layers; native scroll owns only their parent.
  const intro=gsap.timeline({defaults:{ease:'power3.out',duration:.85}});
  intro.fromTo('.hero-title',{y:28,opacity:0},{y:0,opacity:1},0)
    .fromTo('.hero-copy p',{y:18,opacity:0},{y:0,opacity:1},.12)
    .fromTo('.hero-action',{y:14,opacity:0},{y:0,opacity:1},.24);
  gsap.to(heroCopy,{
    scrollTrigger:{id:'estate-hero-copy',trigger:'#hero',start:'top top',
      end:()=>`+=${Math.round(Math.min(innerHeight*.55,420))}`,
      scrub:.25,invalidateOnRefresh:true},
    y:phone?-36:-64,opacity:0,ease:'none'
  });
  contentScenes=createContentMotion(gsap,{phone,portrait});
  player=new ScrollVideoPlayer(video);activePlayer=player;player.setProgress(background.progress);
  const tick=()=>player?.draw();gsap.ticker.add(tick);
  const observer=new IntersectionObserver(entries=>{if(player)player.setActive(entries[0].isIntersecting&&!document.hidden);},{rootMargin:'200px'});observer.observe(root);
  const resize=new ResizeObserver(()=>player?.resize());resize.observe(video);
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
  const visibility=()=>player?.setActive(!document.hidden);document.addEventListener('visibilitychange',visibility);
  return()=>{dead=true;controller.abort();cancelAnimationFrame(layoutFrame);layoutObserver.disconnect();document.removeEventListener('close',dialogClosed,true);gsap.ticker.remove(tick);observer.disconnect();resize.disconnect();document.removeEventListener('visibilitychange',visibility);player?.dispose();if(activePlayer===player)activePlayer=undefined;root.classList.remove('motion-enabled');heroTrigger=undefined;contentScenes=[];if(bar)bar.style.transform='';};
 });
 document.fonts.ready.then(()=>{if(!disposed)ScrollTrigger.refresh();});
 window.addEventListener('pagehide',()=>{disposed=true;mm.revert();},{once:true});
}
