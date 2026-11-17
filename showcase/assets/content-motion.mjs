// Created synchronously inside the page's matchMedia owner; all styles revert with it.
export function createContentMotion(gsap, {phone}) {
  const scenes=[];
  const panel=document.querySelector('#regions .destinations-card');
  if(!panel)return scenes;
  if(!phone){
    // Finish the entrance while the whole section rises into view. Once pinned,
    // only the background advances: controls and prices hold their final positions.
    const motion=gsap.timeline({defaults:{ease:'power3.out'},scrollTrigger:{
      id:'estate-content-coast-entrance',trigger:'#regions',start:'clamp(top 94%)',
      end:'top top',scrub:.4,invalidateOnRefresh:true
    }});
    motion
      .fromTo(panel.querySelectorAll('.coast-letter'),{yPercent:118,opacity:1},{yPercent:0,opacity:1,duration:.65,stagger:.019},0)
      .fromTo(panel.querySelectorAll('.region-tab'),{x:-44,opacity:.15},{x:0,opacity:1,duration:.55,stagger:.07},.17)
      .fromTo(panel.querySelector('#region-name'),{y:22,opacity:.15},{y:0,opacity:1,duration:.5},.28)
      .fromTo(panel.querySelector('.price-emphasis'),{y:34,opacity:.15},{y:0,opacity:1,duration:.55},.34)
      .fromTo(panel.querySelector('.city-table-group'),{y:28,opacity:.15},{y:0,opacity:1,duration:.55},.43)
      .fromTo(panel.querySelector('.region-action'),{y:24,opacity:.15},{y:0,opacity:1,duration:.45},.59);
    scenes.push({id:'coast-entrance',motion});
    return scenes;
  }
  function scene(id,trigger,end='top 54%') {
    const motion=gsap.timeline({defaults:{ease:'power3.out'},scrollTrigger:{
      id:`estate-content-${id}`,trigger,start:'clamp(top 96%)',end:`clamp(${end})`,
      scrub:.45,invalidateOnRefresh:true
    }});
    scenes.push({id,motion});
    return motion;
  }
  // 0–25%: the letters lift through the two original word windows, then stay readable.
  const heading=panel.querySelector('.section-heading');
  scene('coast-title',heading,'top 56%')
    .fromTo(heading.querySelectorAll('.coast-letter'),
      {yPercent:118,opacity:1},
      {yPercent:0,opacity:1,duration:.85,stagger:.027,ease:'power4.out'},0);
  // 25–50%: regional choices arrive in reading order; the type switch stays still.
  const navigation=panel.querySelector('.region-navigation');
  scene('coast-regions',navigation,phone?'top 66%':'top 52%')
    .fromTo(navigation.querySelectorAll('.region-tab'),
      {x:phone?0:-44,y:phone?32:0,opacity:.15},
      {x:0,y:0,opacity:1,duration:.85,stagger:phone?.09:.12},0);
  const detail=panel.querySelector('.region-detail');
  scene('coast-price',detail,'top 52%')
    .fromTo(detail.querySelector('#region-name'),{y:24,opacity:.15},{y:0,opacity:1,duration:.55},0)
    .fromTo(detail.querySelector('.price-emphasis > span:first-child'),{y:14,opacity:0},{y:0,opacity:1,duration:.45},.15)
    .fromTo(detail.querySelector('.price-window'),{y:38,opacity:.15},{y:0,opacity:1,duration:.8},.2);
  // 50–75%: the comparison table slides into place as a single stable scroll area.
  scene('coast-table',detail.querySelector('.city-table-group'),phone?'top 68%':'top 48%')
    .fromTo(detail.querySelector('.city-table-group'),{y:phone?32:48,opacity:.12},{y:0,opacity:1,duration:1},0)
    .fromTo(detail.querySelectorAll('#region-cities tr'),{y:18,opacity:.25},{y:0,opacity:1,duration:.65,stagger:{amount:.3}},.12);
  // 75–100%: the blue action arrives last, with a stationary hit area after settling.
  const action=detail.querySelector('.region-action');
  scene('coast-action',action,'top 80%')
    .fromTo(action,{y:28,opacity:.15},{y:0,opacity:1,duration:.8},0);
  return scenes;
}
