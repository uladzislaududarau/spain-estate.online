// Called synchronously inside the page's GSAP matchMedia context: it owns teardown.
export function createContentMotion(gsap, {phone}) {
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

  const copy = '.approach-copy > p, .service-list > div, .section-heading > p, .selection-copy > p, .selection-includes > li, .request-action > p, .footer-details > p';
  document.querySelectorAll(copy).forEach((element, index) => {
    timeline(`copy-${index}`, element)
      .fromTo(element, {y:phone?45:85, opacity:.55}, {y:0, opacity:1, duration:.4}, 0)
      .to(element, {y:phone?-12:-30, duration:.14}, .86);
  });

  // One reading sequence owns this whole composition. Text never leaves its layout box.
  const viewing = document.querySelector('.threshold-copy');
  if (viewing) {
    const bases = viewing.querySelectorAll('.viewing-base');
    const ink = viewing.querySelectorAll('.viewing-ink');
    gsap.set(bases, {opacity:.32});
    gsap.set(ink, {clipPath:'inset(0% 100% 0% 0%)'});
    const motion = gsap.timeline({defaults:{ease:'none'}, scrollTrigger:{
      id:'estate-content-viewing', trigger:viewing, start:'clamp(top 88%)',
      end:'clamp(bottom 24%)', scrub:.65, invalidateOnRefresh:true
    }});
    motion.addLabel('first-phrase', .02)
      .to(ink[0], {clipPath:'inset(0% 0% 0% 0%)', duration:.3}, 'first-phrase')
      .addLabel('second-phrase', .22)
      .to(ink[1], {clipPath:'inset(0% 0% 0% 0%)', duration:.32}, 'second-phrase')
      .fromTo(viewing.querySelector('.viewing-description'), {opacity:.5},
        {opacity:1, duration:.28, ease:'power2.out'}, .24)
      .fromTo(viewing.querySelector('.viewing-action'), {opacity:.75},
        {opacity:1, duration:.2, ease:'power2.out'}, .44)
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
