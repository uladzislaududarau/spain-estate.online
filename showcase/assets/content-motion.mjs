// Called synchronously inside the page's GSAP matchMedia context: it owns teardown.
export function createContentMotion(gsap, {phone}) {
  const scenes = [];
  const timeline = (id, trigger, start = 'clamp(top 94%)', end = 'clamp(bottom 12%)') => {
    const motion = gsap.timeline({defaults:{ease:'none'}, scrollTrigger:{
      id:`estate-content-${id}`, trigger, start, end, scrub:true, invalidateOnRefresh:true
    }});
    scenes.push({id, motion});
    return motion;
  };

  document.querySelectorAll('[data-kinetic-heading]').forEach(heading => {
    const lines = heading.querySelectorAll('.kinetic-line > span');
    gsap.set(lines, {yPercent:110, rotation:phone?1.5:3, opacity:.7});
    timeline(heading.id, heading)
      .to(lines, {yPercent:0, rotation:0, opacity:1, duration:.28, stagger:.035}, 0)
      .to(lines, {yPercent:-12, x:phone?-4:-12, rotation:-.4, duration:.16, stagger:.025}, .84);
  });

  const copy = '.approach-copy > p, .service-list > div, .section-heading > p, .threshold-copy p, .search-copy > p, .selection-includes > li, .request-action > p, .footer-details > p';
  document.querySelectorAll(copy).forEach((element, index) => {
    timeline(`copy-${index}`, element)
      .fromTo(element, {y:phone?18:28, opacity:.85}, {y:0, opacity:1, duration:.3}, 0)
      .to(element, {y:phone?-4:-8, duration:.14}, .86);
  });

  document.querySelectorAll('[data-scroll-photo]').forEach(frame => {
    const picture = frame.querySelector('picture');
    const image = frame.querySelector('img');
    timeline(`photo-${frame.dataset.scrollPhoto}`, frame, 'clamp(top bottom)', 'clamp(bottom top)')
      .fromTo(picture, {clipPath:'inset(8% 9% 8% 9% round 24px)'},
        {clipPath:'inset(0% 0% 0% 0% round 0px)', duration:.4}, 0)
      .fromTo(image, {scale:1.14, yPercent:-2}, {scale:1.06, yPercent:2, duration:1}, 0);
  });
  return scenes;
}
