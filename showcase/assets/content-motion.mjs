// Called synchronously inside the page's GSAP matchMedia context: it owns teardown.
export function createContentMotion(gsap, {phone,portrait}) {
  const scenes = [];
  const timeline = (id, trigger, start = 'clamp(top 94%)', end = 'clamp(bottom 12%)') => {
    const motion = gsap.timeline({defaults:{ease:'none'}, scrollTrigger:{
      id:`estate-content-${id}`, trigger, start, end, scrub:.4, invalidateOnRefresh:true
    }});
    scenes.push({id, motion});
    return motion;
  };

  document.querySelectorAll('[data-kinetic-heading]').forEach(heading => {
    const lines = heading.querySelectorAll('.kinetic-line > span');
    gsap.set(lines, {yPercent:135, rotation:phone?3:6, rotationX:45, transformPerspective:1000});
    timeline(heading.id, heading, 'clamp(top 98%)', 'clamp(bottom 8%)')
      .to(lines, {yPercent:0, rotation:0, rotationX:0, duration:.38, stagger:.055}, 0)
      .to(lines, {yPercent:-35, x:phone?-12:-65, rotation:-1, duration:.14, stagger:.025}, .86);
  });

  const copy = '.approach-copy > p, .service-list > div, .section-heading > p, .selection-copy > p, .selection-includes > li, .request-action > p';
  document.querySelectorAll(copy).forEach((element, index) => {
    timeline(`copy-${index}`, element)
      .fromTo(element, {y:phone?45:85, opacity:.55}, {y:0, opacity:1, duration:.4}, 0)
      .to(element, {y:phone?-12:-30, duration:.14}, .86);
  });

  // Phone portrait gets an authored native-sticky scene, not a scaled desktop reveal.
  const viewing = document.querySelector('.threshold-copy');
  if (viewing && phone && portrait) {
    const section=viewing.closest('.threshold');
    const stage=section.querySelector('.threshold-frame');
    const words=viewing.querySelectorAll('.viewing-word');
    const sentences=viewing.querySelectorAll('.viewing-sentence');
    const route=viewing.querySelector('.viewing-route-progress');
    const point=viewing.querySelector('.viewing-route-point');
    // Native sticky releases after 1.1 screens; matchMedia owns all inline geometry.
    gsap.set(section,{height:'210svh',minHeight:0,padding:0,display:'block'});
    gsap.set(stage,{position:'sticky',top:0,height:'100svh',display:'grid',alignItems:'center',padding:'96px var(--frame) 40px'});
    gsap.set(words,{transformPerspective:850,transformOrigin:'50% 65%',force3D:true});
    gsap.set([words[0],words[1]],{rotationX:65,z:-160,y:26,opacity:.35});
    gsap.set([words[2],words[3]],{rotationX:-60,z:-240,y:38,opacity:.25});
    gsap.set(route,{strokeDasharray:1,strokeDashoffset:1});
    gsap.set(point,{attr:{cx:8}});
    const motion=gsap.timeline({defaults:{ease:'power2.out'},scrollTrigger:{
      id:'estate-content-viewing',trigger:section,start:'top 60%',end:'bottom bottom',
      scrub:.28,invalidateOnRefresh:true
    }});
    motion.addLabel('unfold-heading',0)
      .to([words[0],words[1]],{rotationX:0,z:0,y:0,opacity:1,duration:.34,stagger:.055},'unfold-heading')
      .to([words[2],words[3]],{rotationX:0,z:0,y:0,opacity:1,duration:.36,stagger:.055},.15)
      .addLabel('connect',.27)
      .to(route,{strokeDashoffset:0,duration:.42,ease:'none'},'connect')
      .to(point,{attr:{cx:312},duration:.42,ease:'none'},'connect')
      .fromTo(sentences[0],{opacity:.65,scale:.96},{opacity:1,scale:1,duration:.25},.34)
      .fromTo(sentences[1],{opacity:.6,scale:.96},{opacity:1,scale:1,duration:.25},.48)
      .fromTo(viewing.querySelector('.viewing-action'),{opacity:.75},{opacity:1,duration:.2},.61)
      .addLabel('readable-hold',.81)
      .to({},{duration:.19},'readable-hold');
    scenes.push({id:'viewing',motion});
  } else if (viewing) {
    const motion = gsap.timeline({defaults:{ease:'none'}, scrollTrigger:{
      id:'estate-content-viewing', trigger:viewing, start:'clamp(top 88%)',
      end:'clamp(bottom 24%)', scrub:.75, invalidateOnRefresh:true
    }});
    motion.addLabel('push-in', 0)
      .fromTo(viewing.querySelector('.viewing-title'),
        {scale:phone?.88:.8, opacity:.55, transformOrigin:'left center'},
        {scale:1, opacity:1, duration:.55, ease:'power2.out'}, 'push-in')
      .fromTo(viewing.querySelector('.viewing-description'), {opacity:.6},
        {opacity:1, duration:.3, ease:'power2.out'}, .25)
      .fromTo(viewing.querySelector('.viewing-action'), {opacity:.8},
        {opacity:1, duration:.2, ease:'power2.out'}, .45)
      .addLabel('readable-hold', .65)
      .to({}, {duration:.35}, 'readable-hold');
    scenes.push({id:'viewing', motion});
  }

  document.querySelectorAll('[data-scroll-photo]').forEach(frame => {
    const picture = frame.querySelector('picture');
    const image = frame.querySelector('img');
    timeline(`photo-${frame.dataset.scrollPhoto}`, frame, 'clamp(top bottom)', 'clamp(top top)')
      .fromTo(picture, {clipPath:phone?'inset(14% 22% 14% 22% round 120px)':'inset(18% 34% 18% 34% round 240px)'},
        {clipPath:'inset(0% 0% 0% 0% round 0px)', duration:1}, 0)
      .fromTo(image, {scale:1.55, yPercent:-9}, {scale:1.02, yPercent:0, duration:1}, 0);
  });
  return scenes;
}
