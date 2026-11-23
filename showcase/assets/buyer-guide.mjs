// «Гид покупателя»: the header button opens a full-screen guide. The interface
// module and its stylesheet load on first intent or when the browser is idle,
// so the Hero's critical path is unchanged.
// Local prototype routes: /preview/buyer-guide-a | -b | -c (dev server only).
const triggers = [...document.querySelectorAll('[data-open-guide]')];
const route = location.pathname.match(/^\/preview\/buyer-guide-([abc])\/?$/);
let pending;

function load() {
  pending ||= Promise.all([
    import('./buyer-guide-app.mjs'),
    new Promise(resolve => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href='/assets/buyer-guide.css';
      link.addEventListener('load', resolve, { once: true });
      link.addEventListener('error', resolve, { once: true });
      document.head.append(link);
    })
  ]).then(([app]) => app);
  return pending;
}
for (const trigger of triggers) {
  trigger.addEventListener('pointerenter', load, { once: true });
  trigger.addEventListener('focus', load, { once: true });
  trigger.addEventListener('click', async event => {
    event.preventDefault();
    (await load()).openGuide({ trigger });
  });
}
function afterPreloader(run) {
  if (document.getElementById('site-preloader')) addEventListener('sp:preloader-done', run, { once: true });
  else run();
}
if (route) afterPreloader(() => load().then(app => app.openGuide({ variant: route[1] })));
else if (triggers.length) addEventListener('load', () => {
  if (window.requestIdleCallback) requestIdleCallback(load, { timeout: 4000 });
  else setTimeout(load, 1500);
}, { once: true });
