// Shared header shading and table label alignment.
const header = document.querySelector('.header');
const reducedHeaderMotion=matchMedia('(prefers-reduced-motion:reduce)');
let shadeFrame=0;
let shadeTime=0;
let shadeValue=0;
let shadeTarget=0;
function paintHeader(time){
  const elapsed=shadeTime?Math.min(64,time-shadeTime):16;
  shadeTime=time;
  shadeValue+=(shadeTarget-shadeValue)*(1-Math.exp(-elapsed/165));
  if(Math.abs(shadeTarget-shadeValue)<.001)shadeValue=shadeTarget;
  header?.style.setProperty('--header-shade',String(shadeValue));
  if(shadeValue!==shadeTarget)shadeFrame=requestAnimationFrame(paintHeader);
  else{shadeFrame=0;shadeTime=0;}
}
function shadeHeader() {
  // Opening the quiz temporarily locks body position; retain the page's header state.
  if (!document.documentElement.classList.contains('quiz-open')) {
    // Safari can expose a negative offset during a trackpad bounce. Do not switch
    // to the transparent top state in the middle of that overscroll gesture.
    if(window.scrollY<0)return;
    header?.classList.toggle('is-scrolled',window.scrollY>0);
    const progress=Math.min(1,window.scrollY/180);
    shadeTarget=progress**3*(progress*(progress*6-15)+10);
    if(reducedHeaderMotion.matches){
      cancelAnimationFrame(shadeFrame);shadeFrame=0;shadeTime=0;shadeValue=shadeTarget;
      header?.style.setProperty('--header-shade',String(shadeValue));
    }else if(!shadeFrame)shadeFrame=requestAnimationFrame(paintHeader);
  }
}
const priceScroller=document.querySelector('.city-prices');
const tableGroup=document.querySelector('.city-table-group');
const alignTableLabels=()=>{
  if(priceScroller&&tableGroup)tableGroup.style.setProperty('--city-scrollbar',`${priceScroller.offsetWidth-priceScroller.clientWidth}px`);
};
const tableResize=new ResizeObserver(alignTableLabels);
if(priceScroller)tableResize.observe(priceScroller);
alignTableLabels();
shadeHeader();
window.addEventListener('scroll',shadeHeader,{passive:true});
window.addEventListener('pageshow',shadeHeader);
reducedHeaderMotion.addEventListener('change',shadeHeader);
window.addEventListener('pagehide',()=>{
  cancelAnimationFrame(shadeFrame);
  reducedHeaderMotion.removeEventListener('change',shadeHeader);
  tableResize.disconnect();
  window.removeEventListener('scroll',shadeHeader);
  window.removeEventListener('pageshow',shadeHeader);
},{once:true});
