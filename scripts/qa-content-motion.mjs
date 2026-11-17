import {chromium} from '../../tools/motion/node_modules/playwright/index.mjs';
import {fileURLToPath} from 'node:url';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=fileURLToPath(new URL('../docs/qa/photo-motion/',import.meta.url));await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const report={date:new Date().toISOString(),browser:browser.version(),widths:[],failures:[]};
const axe=await readFile(new URL('../node_modules/axe-core/axe.min.js',import.meta.url),'utf8');
try{
for(const[width,height]of[[1440,900],[768,1024],[390,844],[375,812],[320,640],[640,320]]){
 const context=await browser.newContext({viewport:{width,height},hasTouch:width<800,deviceScaleFactor:2});const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));let posts=0;await p.route('**/api/leads',r=>{posts++;return r.abort();});
 await p.goto('http://127.0.0.1:4322');await p.getByRole('button',{name:'Отказаться',exact:true}).click();await p.evaluate(()=>document.fonts.ready);await p.waitForFunction(()=>window.__estateMotionQA?.content().length>0);await p.waitForTimeout(400);
 const item={width,height,errors,scenes:[],captures:[],axe:[]};assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
 const sceneIds=['approach-title','regions-title','threshold-title','search-title','photo-approach','photo-search'];
 for(const id of sceneIds){
  const range=await p.evaluate(id=>window.__estateMotionQA.content().find(s=>s.id===id).range,id);assert(range.end>range.start);const selector=id.startsWith('photo-')?`[data-scroll-photo="${id.slice(6)}"] picture`:`#${id} .kinetic-line > span`;
  const states=[];for(const progress of[0,.25,.5,.75,1,.75,.5,.25,0]){
   await p.evaluate(y=>scrollTo({top:y,behavior:'instant'}),range.start+progress*(range.end-range.start));await p.waitForTimeout(70);
   const state=await p.locator(selector).evaluateAll(els=>els.map(el=>({transform:getComputedStyle(el).transform,clip:getComputedStyle(el).clipPath,opacity:getComputedStyle(el).opacity})));const before=states.find(s=>s.progress===progress);if(before)assert.deepEqual(state,before.state,`${width} ${id} reverse ${progress}`);states.push({progress,state});
   if((width===1440||width===390)&&!before&&[0,.25,.5,.75,1].includes(progress)&&['approach-title','photo-approach','search-title','photo-search'].includes(id))await p.screenshot({path:`${out}/${width}-${id}-${Math.round(progress*100)}.png`});
  }
  assert(new Set(states.map(s=>JSON.stringify(s.state))).size>=3,`${id} must change with scroll`);item.scenes.push({id,range,states});
 }
 // Mid-scene state must be controlled by scroll, with no time-driven drift.
 const r=await p.evaluate(()=>window.__estateMotionQA.content().find(s=>s.id==='approach-title').range);await p.evaluate(y=>scrollTo({top:y,behavior:'instant'}),(r.start+r.end)/2);await p.waitForTimeout(150);const still=await p.locator('#approach-title').innerHTML();const transform=await p.locator('#approach-title .kinetic-line>span').first().evaluate(el=>getComputedStyle(el).transform);await p.waitForTimeout(400);assert.equal(await p.locator('#approach-title').innerHTML(),still);assert.equal(await p.locator('#approach-title .kinetic-line>span').first().evaluate(el=>getComputedStyle(el).transform),transform);
 await p.addScriptTag({content:axe});
 for(const selector of['.approach-card','.service-list','#regions','#threshold','.search-card','.footer']){
  await p.locator(selector).evaluate(el=>scrollTo({top:el.getBoundingClientRect().top+scrollY-150,behavior:'instant'}));await p.waitForTimeout(400);
  await p.locator(selector).locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
  const label=selector.replace(/[.#]/g,'');if([1440,768,390,320].includes(width)){await p.screenshot({path:`${out}/${width}-${label}.png`});item.captures.push(`${width}-${label}.png`);}
  const a=await p.evaluate(async selector=>{const r=await axe.run(document.querySelector(selector),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return {violations:r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:r.incomplete.map(v=>v.id)};},selector);assert.equal(a.violations.length,0,JSON.stringify({width,selector,...a}));item.axe.push({selector,...a});
 }
 const pictures=await p.locator('.editorial-media img,.threshold-image img').evaluateAll(imgs=>imgs.map(i=>({url:i.currentSrc,decoded:i.complete&&i.naturalWidth>0,width:i.naturalWidth,height:i.naturalHeight})));assert(pictures.every(i=>i.decoded));assert(pictures.every(i=>i.url.includes(width<600?'/mobile/':'/desktop/')));item.pictures=pictures;
 await p.locator('.request-action [data-open-quiz]').click();assert.equal(await p.locator('dialog[open]').count(),1);await p.keyboard.press('Escape');assert.equal(await p.locator('dialog[open]').count(),0);
 const count=await p.evaluate(()=>window.ScrollTrigger.getAll().length);
 for(let n=0;n<2;n++){
  await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(200);assert.equal(await p.evaluate(()=>window.__estateMotionQA.content().length),0);
  const staticContent=await p.locator('[data-kinetic-heading] .kinetic-line>span,.editorial-media img,.editorial-media picture,.threshold-image img').evaluateAll(els=>els.map(el=>({transform:getComputedStyle(el).transform,clip:getComputedStyle(el).clipPath,opacity:getComputedStyle(el).opacity})));assert(staticContent.every(s=>s.transform==='none'&&s.clip==='none'&&s.opacity==='1'),JSON.stringify(staticContent));
  await p.emulateMedia({reducedMotion:'no-preference'});await p.waitForFunction(()=>window.__estateMotionQA.content().length>0);await p.waitForTimeout(100);assert.equal(await p.evaluate(()=>window.ScrollTrigger.getAll().length),count);
 }
 await p.locator('.request-action [data-open-quiz]').click();await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(200);await p.emulateMedia({reducedMotion:'no-preference'});await p.waitForFunction(()=>window.__estateMotionQA.content().length>0);await p.keyboard.press('Escape');
 await p.waitForFunction(()=>Math.abs(window.__estateMotionQA.hero().range.end-(document.querySelector('#main').getBoundingClientRect().bottom+scrollY-innerHeight))<1);
 assert.equal(await p.evaluate(()=>window.ScrollTrigger.getAll().length),count);item.modalPreferenceChange='bounds restored after live preference change inside quiz';
 await p.emulateMedia({reducedMotion:'reduce'});await p.locator('#search').evaluate(el=>scrollTo({top:el.getBoundingClientRect().top+scrollY-120,behavior:'instant'}));await p.screenshot({path:`${out}/${width}-reduced.png`});
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);assert.equal(posts,0);assert.deepEqual(errors,[]);report.widths.push(item);await context.close();console.log('PASS',width,height);
}
for(const mode of['no-js','failed-images','failed-gsap']){
 const c=await browser.newContext({viewport:{width:390,height:844},javaScriptEnabled:mode!=='no-js'});if(mode==='failed-images')await c.route('**/*.avif',r=>r.abort());if(mode==='failed-gsap')await c.route('**/vendor/*',r=>r.abort());const p=await c.newPage();await p.goto('http://127.0.0.1:4322');if(mode!=='no-js')await p.getByRole('button',{name:'Отказаться',exact:true}).click();await p.locator('#search').evaluate(el=>scrollTo({top:el.getBoundingClientRect().top+scrollY-120,behavior:'instant'}));await p.waitForTimeout(500);assert.equal(await p.locator('#search-title').isVisible(),true);assert.equal(await p.locator('.service-list').innerText().then(t=>t.includes('Помощь с ипотекой')),true);if(mode!=='no-js'){await p.locator('.request-action [data-open-quiz]').click();assert.equal(await p.locator('dialog[open]').count(),1);await p.keyboard.press('Escape');}else assert.equal(await p.locator('noscript a').last().isVisible(),true);await p.screenshot({path:`out/${mode}.png`.replace('out/',out+'/'),fullPage:true});await c.close();report.failures.push({mode,result:'content and actions remain usable'});
}
report.status='pass';
}catch(e){report.status='fail';report.error=e.stack;throw e;}finally{await writeFile(`${out}/results.json`,JSON.stringify(report,null,2));await browser.close();}
