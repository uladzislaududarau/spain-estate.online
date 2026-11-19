import { createContentMotion } from './content-motion.mjs';
import './region-explorer.mjs';
const {gsap,ScrollTrigger}=window;
const root=document.querySelector('#cinema');
if(gsap&&ScrollTrigger&&root){
 gsap.registerPlugin(ScrollTrigger);
 const mm=gsap.matchMedia();let disposed=false;let contentScenes=[];let chapterPins=[];
 const qa={hero:()=>({renderer:'static-avif'}),chapters:()=>chapterPins.map(pin=>({id:pin.vars.id,start:pin.start,end:pin.end})),content:()=>contentScenes.map(({id,motion})=>({id,range:{start:motion.scrollTrigger.start,end:motion.scrollTrigger.end},progress:motion.progress()}))};
 window.__estateMotionQA=Object.freeze(qa);
 mm.add({desktop:'(min-width:800px)',phone:'(max-width:799px)',reduce:'(prefers-reduced-motion:reduce)'},context=>{
  const {phone,reduce}=context.conditions;let dead=false;
  if(reduce||location.pathname.startsWith('/thank-you')){root.classList.remove('motion-enabled');return;}
  root.classList.add('motion-enabled');
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
  const heroCopy=document.querySelector('.hero-copy');
  // Text is visible at rest; only native scroll moves the parent.
  gsap.to(heroCopy,{
    scrollTrigger:{id:'estate-hero-copy',trigger:'#hero',start:'top top',
      end:()=>`+=${Math.round(Math.min(innerHeight*.55,420))}`,
      scrub:.25,invalidateOnRefresh:true},
    y:phone?-36:-64,opacity:0,ease:'none'
  });
  contentScenes=createContentMotion(gsap,{phone});
  // A shorter city table changes the full-page sequence and text bounds.
  let layoutFrame;let layoutWidth=0;let layoutHeight=0;
  const refreshLayout=()=>{
    cancelAnimationFrame(layoutFrame);
    layoutFrame=requestAnimationFrame(()=>{
      if(!dead&&!document.documentElement.classList.contains('quiz-open')){
        const scrollTop=window.scrollY;
        ScrollTrigger.refresh();
        // A table update must not reset mobile scroll during trigger refresh.
        if(phone){const restored=Math.min(scrollTop,Math.max(0,ScrollTrigger.maxScroll(window)));if(Math.abs(window.scrollY-restored)>.5)window.scrollTo({top:restored,behavior:'instant'});}
      }
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
  return()=>{dead=true;cancelAnimationFrame(layoutFrame);layoutObserver.disconnect();document.removeEventListener('close',dialogClosed,true);chapters.forEach(chapter=>chapter.classList.remove('coast-pinned'));chapterPins=[];root.classList.remove('motion-enabled');contentScenes=[];};
 });
 document.fonts.ready.then(()=>{if(!disposed)ScrollTrigger.refresh();});
 window.addEventListener('pagehide',()=>{disposed=true;mm.revert();},{once:true});
}
