import { chromium } from '../../tools/motion/node_modules/playwright/index.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const base = process.env.QUIZ_TARGET || 'http://127.0.0.1:4321';
const out = new URL('../docs/qa/', import.meta.url);
await mkdir(new URL('quiz-captures/',out), {recursive:true});
const results = { date:new Date().toISOString(), target:base, browser:'', sourceHash:createHash('sha256').update(await readFile(new URL('../showcase/assets/quiz.mjs',import.meta.url))).digest('hex'), checks:[], errors:[], interceptedPosts:[], limitations:['Browser emulation only; no physical phone or iOS Safari test.','All POST requests intercepted; external delivery and production credentials not exercised.','This focused quiz run does not measure motion FPS or field performance.'] };
const browser = await chromium.launch({channel:'chrome',headless:true});
results.browser = browser.version();
let context, page, mobile = false;
const check = async (name,fn) => {try {const details=await fn();results.checks.push({name,status:'pass',...(details?{details}:{})}); console.log('PASS',name);}catch(error){results.checks.push({name,status:'fail',error:error.message}); console.log('FAIL',name,error.message);try{await page.screenshot({path:fileURLToPath(new URL(`quiz-captures/failure-${results.checks.length}.png`,out))});}catch{}}};
async function fresh(width=1440,height=900,{reduced=false}={}){
 await context?.close(); mobile=width<700;
 context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:mobile,isMobile:mobile,reducedMotion:reduced?'reduce':'no-preference'});
 await context.addInitScript(()=>{window.addEventListener('lead_saved',()=>sessionStorage.setItem('qa-lead-saved',String(Number(sessionStorage.getItem('qa-lead-saved')||0)+1)));});
 await context.route('**/*',async route=>{if(route.request().method()==='POST'){results.interceptedPosts.push({url:route.request().url(),unexpected:true});await route.abort('blockedbyclient');}else await route.continue();});
 page=await context.newPage();page.setDefaultTimeout(7000);
 page.on('pageerror',error=>results.errors.push({type:'pageerror',message:error.message,width}));
 page.on('console',msg=>{if(msg.type()==='error')results.errors.push({type:'console',message:msg.text(),width});});
 await page.goto(base+'/?utm_source=qa-local&utm_campaign=cinematic-test',{waitUntil:'load'});
 await page.locator('dialog.quiz-dialog').waitFor({state:'attached'});
 await page.locator('[data-open-quiz]').first().focus(); await activate(page.locator('[data-open-quiz]').first());
 await page.locator('dialog[open]').waitFor();
}
async function activate(locator){if(mobile)await locator.tap();else await locator.click();}
async function choose(name,value){await activate(page.locator(`dialog label.quiz-choice:has(input[name="${name}"][value="${value}"])`));}
async function next(){await activate(page.locator('dialog [data-next]'));}
async function back(){await activate(page.locator('dialog .quiz-secondary'));}
async function stage(index){assert.equal(await page.locator('dialog').getAttribute('data-stage'),index===6?'contact':`question-${index}`);}
async function budgetFlow(region,city,type){await choose('regions',region);await next();if(city)await choose(`cities-${region}`,city);await next();await choose('propertyType',type);await next();await stage(3);}
async function custom(amount){await choose('budget','custom');await page.locator('#quiz-custom-budget').fill(String(amount));}
async function toContact(){await next();await choose('purpose','holiday-home');await next();await choose('timeline','online-viewings');await next();await stage(6);}
async function screenshot(name){await page.waitForTimeout(300);const path=fileURLToPath(new URL(`quiz-captures/${name}.png`,out));await page.screenshot({path});return path;}
async function overflow(){return page.evaluate(()=>({page:document.documentElement.scrollWidth>innerWidth+1,dialog:document.querySelector('dialog').scrollWidth>document.querySelector('dialog').clientWidth+1,content:document.querySelector('.quiz-content').scrollWidth>document.querySelector('.quiz-content').clientWidth+1}));}
async function checkOverflow(){const state=await overflow();assert.deepEqual(state,{page:false,dialog:false,content:false});return state;}
try {
 await check('1440px opening, keyboard focus and Escape restoration',async()=>{
  await fresh();await stage(0);assert.equal(await page.locator('#quiz-title').evaluate(el=>el===document.activeElement),true);await checkOverflow();const capture=await screenshot('desktop-regions');
  const tabStops=[];for(let i=0;i<20;i++){await page.keyboard.press('Tab');const stop=await page.locator('dialog').evaluate(el=>({tag:document.activeElement.tagName,name:document.activeElement.name||'',inside:el.contains(document.activeElement),nativeDocumentFocus:document.activeElement===document.body}));tabStops.push(stop);assert.equal(stop.inside||stop.nativeDocumentFocus,true);}
  await page.keyboard.press('Escape');await page.locator('dialog').waitFor({state:'hidden'});assert.equal(await page.locator('[data-open-quiz]').first().evaluate(el=>el===document.activeElement),true);return {capture,tabStops,note:'Chrome native dialog briefly reports document.body at browser-focus wrap; no background control receives focus.'};
 });
 await check('Barcelona villa custom €400000 keeps consultation available and notes suburb',async()=>{
  await fresh();await budgetFlow('costa-barcelona','barcelona','villa');assert.match(await page.locator('.quiz-intro').innerText(),/1\D*000\D*000/);
  await custom(400000);assert.match(await page.locator('.quiz-budget-status').innerText(),/ниже/);assert.equal(await page.locator('[data-next]').isEnabled(),true);
  await activate(page.locator('.quiz-price-details summary'));assert.match(await page.locator('.quiz-threshold-list').innerText(),/пригород Барселоны/);
  assert.equal(await page.locator('.quiz-alternative-list').count(),0);await activate(page.locator('.quiz-expand-geography'));assert.ok(await page.locator('.quiz-alternative-list li').count()>0);
  await checkOverflow();return {capture:await screenshot('desktop-barcelona-low-budget')};
 });
 await check('contact validation, consent and mocked failure→429→network→success',async()=>{
  await toContact();await choose('messenger','telegram');const submit=page.locator('dialog button[type=submit]');
  await activate(submit);assert.match(await page.locator('#quiz-error').innerText(),/имя/);assert.equal(await page.locator('#quiz-name').getAttribute('aria-invalid'),'true');
  await page.locator('#quiz-name').fill('QA Тест');await page.locator('#quiz-contact').fill('@bad');await activate(submit);assert.match(await page.locator('#quiz-error').innerText(),/Telegram/);
  await page.locator('#quiz-contact').fill('@qa_local_test');await activate(submit);assert.match(await page.locator('#quiz-error').innerText(),/согласие/);assert.equal(await page.locator('#quiz-consent').evaluate(el=>el===document.activeElement),true);
  await page.locator('#quiz-consent').check();await back();await next();assert.equal(await page.locator('#quiz-name').inputValue(),'QA Тест');assert.equal(await page.locator('#quiz-contact').inputValue(),'@qa_local_test');assert.equal(await page.locator('#quiz-consent').isChecked(),true);await checkOverflow();const capture=await screenshot('desktop-contact');
  let mode='error',posts=[];
  await page.route('**/api/lead',async route=>{const body=route.request().postDataJSON();posts.push(body);results.interceptedPosts.push({url:route.request().url(),mode,body});if(mode==='network')return route.abort('internetdisconnected');await route.fulfill({status:mode==='rate'?429:mode==='error'?500:200,contentType:'application/json',body:JSON.stringify(mode==='success'?{success:true,leadId:'745aa0be-2c50-4492-a70a-8a030b994d33',status:'saved'}:{code:mode==='rate'?'rate_limited':'save_failed'})});});
  await activate(submit);await page.waitForFunction(()=>document.querySelector('#quiz-error')?.textContent.includes('Не удалось'));assert.equal(await page.evaluate(()=>Number(sessionStorage.getItem('qa-lead-saved')||0)),0);
  mode='rate';await activate(submit);await page.waitForFunction(()=>document.querySelector('#quiz-error')?.textContent.includes('Слишком много'));assert.equal(await page.evaluate(()=>Number(sessionStorage.getItem('qa-lead-saved')||0)),0);
  mode='network';await activate(submit);await page.waitForFunction(()=>document.querySelector('#quiz-error')?.textContent.includes('Не удалось'));assert.equal(await page.evaluate(()=>Number(sessionStorage.getItem('qa-lead-saved')||0)),0);
  assert.equal(await page.locator('#quiz-name').inputValue(),'QA Тест');assert.equal(await page.locator('#quiz-contact').inputValue(),'@qa_local_test');assert.equal(await page.locator('#quiz-consent').isChecked(),true);
  mode='success';await activate(submit);await page.waitForURL('**/thank-you');await page.locator('dialog[data-stage=success]').waitFor();assert.equal(await page.evaluate(()=>Number(sessionStorage.getItem('qa-lead-saved')||0)),1);
  assert.equal(posts.length,4);assert.equal(new Set(posts.map(item=>item.requestId)).size,1);const payload=posts.at(-1);assert.equal(payload.pricing.budget.min,400000);assert.equal(payload.pricing.propertyType,'villa');assert.equal(payload.pricing.crossRegionOptIn,true);assert.equal(payload.attribution.utm_source,'qa-local');assert.equal(payload.answers.purpose,'holiday-home');assert.equal(payload.answers.timeline,'online-viewings');
  return {capture,successCapture:await screenshot('desktop-mocked-success'),postedRequestCount:posts.length};
 });
 await check('Palma villa ranges begin at €1200000, custom amount is accepted',async()=>{
  await fresh();await budgetFlow('mallorca','palma-de-mallorca','villa');const first=page.locator('input[name=budget]').first();assert.equal(await first.getAttribute('value'),'eur-1200000-1700000');await custom(1200000);assert.doesNotMatch(await page.locator('.quiz-budget-status').innerText(),/ниже/);assert.equal(await page.locator('[data-next]').isEnabled(),true);return {capture:await screenshot('desktop-palma-villa')};
 });
 await check('390px multi-city/both types stays distinct, back changes invalidate budget',async()=>{
  await fresh(390,844);await choose('regions','costa-blanca');await next();await choose('cities-costa-blanca','alicante');await choose('cities-costa-blanca','torrevieja');await next();await choose('propertyType','both');await next();await custom(200000);await activate(page.locator('.quiz-price-details summary'));const details=await page.locator('.quiz-threshold-list').innerText();assert.match(details,/Torrevieja/);assert.match(details,/Alicante/);assert.equal(await page.locator('.quiz-threshold-list li').count(),4);assert.match(await page.locator('.quiz-budget-status').innerText(),/не для всех/);await checkOverflow();const capture=await screenshot('mobile-mixed-budget');
  await back();await choose('propertyType','villa');await next();assert.equal(await page.locator('input[name=budget]:checked').count(),0);assert.equal(await page.locator('[data-next]').isEnabled(),false);await custom(200000);
  await activate(page.getByRole('button',{name:'Изменить географию',exact:true}));await choose('regions','mallorca');await next();await next();await next();assert.equal(await page.locator('input[name=budget]:checked').count(),0);assert.equal(await page.locator('[data-next]').isEnabled(),false);
  return {capture};
 });
 await check('320px any-city region, internal scroll, orientation and contact reachability',async()=>{
  await fresh(320,640);await budgetFlow('costa-blanca',null,'apartment');assert.match(await page.locator('.quiz-intro').innerText(),/120\D*000/);await custom(120000);await activate(page.locator('.quiz-price-details summary'));assert.match(await page.locator('.quiz-threshold-list li').first().innerText(),/Elda/);await checkOverflow();const capture=await screenshot('small-phone-budget');
  const internal=await page.locator('.quiz-content').evaluate(el=>({scrollable:el.scrollHeight>el.clientHeight,height:el.clientHeight,scrollHeight:el.scrollHeight}));assert.equal(internal.scrollable,true);await page.locator('.quiz-content').hover();await page.mouse.wheel(0,500);assert.ok(await page.locator('.quiz-content').evaluate(el=>el.scrollTop)>0);
  await toContact();await choose('messenger','telegram');await page.locator('#quiz-name').fill('Тест');await page.locator('#quiz-contact').fill('@qa_local_test');await page.locator('#quiz-consent').check();await checkOverflow();assert.equal(await page.locator('dialog button[type=submit]').isVisible(),true);
  await page.setViewportSize({width:640,height:320});await checkOverflow();assert.equal(await page.locator('dialog button[type=submit]').isVisible(),true);await page.setViewportSize({width:320,height:640});await checkOverflow();return {capture,contactCapture:await screenshot('small-phone-contact'),internal};
 });
 await check('legacy penthouse/townhouse/commercial expose custom input and no invented ranges',async()=>{
  await fresh(390,844);await budgetFlow('costa-blanca','alicante','penthouse');
  for(const type of ['penthouse','townhouse','commercial']){
   if(type!=='penthouse'){await back();await choose('propertyType',type);await next();}
   assert.match(await page.locator('.quiz-intro').innerText(),/нет цен/);assert.equal(await page.locator('input[name=budget]').count(),1);await custom(200000);assert.match(await page.locator('.quiz-budget-status').innerText(),/индивидуально/);assert.equal(await page.locator('[data-next]').isEnabled(),true);await checkOverflow();
  }
  return {capture:await screenshot('mobile-missing-prices')};
 });
 await check('reduced-motion quiz and live preference keep all actions available',async()=>{
  await fresh(390,844,{reduced:true});await budgetFlow('costa-blanca','elda','apartment');await custom(100000);await checkOverflow();assert.equal(await page.locator('[data-next]').isEnabled(),true);await page.emulateMedia({reducedMotion:'no-preference'});await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('[data-next]').isEnabled(),true);return {capture:await screenshot('mobile-reduced-budget')};
 });
} finally {
 await context?.close();await browser.close();for(const error of results.errors)error.expectedInjectedFailure=error.type==='console'&&/status of (500|429)|ERR_INTERNET_DISCONNECTED/.test(error.message);
 results.summary={unexpectedRuntimeErrors:results.errors.filter(error=>!error.expectedInjectedFailure).length,pass:results.checks.filter(x=>x.status==='pass').length,fail:results.checks.filter(x=>x.status==='fail').length,unexpectedPosts:results.interceptedPosts.filter(x=>x.unexpected).length};
 await writeFile(new URL('quiz-results.json',out),JSON.stringify(results,null,2));console.log(JSON.stringify(results.summary));
}
if(results.summary.fail||results.summary.unexpectedPosts||results.summary.unexpectedRuntimeErrors)process.exitCode=1;
