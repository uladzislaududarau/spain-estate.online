import {regions,pricingData,getMinimumPrice,formatMoney} from './pricing.mjs';
const list=document.querySelector('#region-tabs');if(!list)return;let selected='costa-blanca';let type='apartment';
const label=document.querySelector('#region-name');const cities=document.querySelector('#region-cities');const cta=document.querySelector('#region-search');
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
let transitions=[];
function stopTransitions(){for(const animation of transitions)animation.cancel();transitions=[];}
reduced.addEventListener('change',stopTransitions);
function animateUpdate(){
 stopTransitions();
 if(reduced.matches||!cities.animate)return;
 // Each update owns only inner content. Scroll motion owns the enclosing blocks.
 for(const [element,index] of [label,document.querySelector('#region-minimum'),...cities.children].map((el,i)=>[el,i])){
   if(!element)continue;
   transitions.push(element.animate([
     {transform:`translateY(${index<2?18:22}px)`,opacity:0},
     {transform:'translateY(0)',opacity:1}
   ],{duration:index<2?480:420,delay:index<2?index*35:Math.min(index-2,7)*42,easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'}));
 }
}
function render(animate=false){
 label.textContent=regions.find(r=>r.id===selected).name;
 const priceLabel=type==='villa'?'Виллы / дома':'Квартиры';
 document.querySelector('#region-price-label').textContent=priceLabel;
 document.querySelector('#region-price-semantic').textContent=priceLabel;
 document.querySelector('#region-minimum').textContent=formatMoney(getMinimumPrice({regions:[selected],cities:[],propertyType:type}));
 const rows=pricingData.filter(row=>row.regionId===selected).sort((a,b)=>a[`${type}Min`]-b[`${type}Min`]);
 cities.replaceChildren(...rows.map(row=>{
   const tr=document.createElement('tr');const name=document.createElement('th');name.scope='row';name.textContent=row.city;
   const money=document.createElement('td');money.textContent='от '+formatMoney(row[`${type}Min`]);
   if(type==='villa'&&row.villaLocationNote){const note=document.createElement('small');note.textContent=row.villaLocationNote;name.append(note);}
   tr.append(name,money);return tr;
 }));
 cities.closest('.city-prices').scrollTop=0;
 cta.dataset.presetRegion=selected;cta.dataset.presetPropertyType=type;
 for(const button of list.children){const active=button.dataset.region===selected;button.classList.toggle('is-selected',active);button.setAttribute('aria-pressed',String(active));}
 if(animate)animateUpdate();
}
const explorerRegions=[...regions.filter(region=>region.id==='costa-blanca'),...regions.filter(region=>region.id!=='costa-blanca')];
list.replaceChildren(...explorerRegions.map(region=>{
 const b=document.createElement('button');b.type='button';b.className='region-tab';b.dataset.region=region.id;b.append(document.createTextNode(region.name));
 const arrow=document.createElement('span');arrow.setAttribute('aria-hidden','true');
 const ns='http://www.w3.org/2000/svg';const icon=document.createElementNS(ns,'svg');
 for(const [key,value] of Object.entries({class:'icon-arrow',viewBox:'0 0 24 24',width:'24',height:'24',fill:'none',stroke:'currentColor','stroke-width':'1.25','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true',focusable:'false'}))icon.setAttribute(key,value);
 const path=document.createElementNS(ns,'path');path.setAttribute('d','M5 19 19 5M5 5h14v14');icon.append(path);arrow.append(icon);
 b.append(arrow);b.addEventListener('click',()=>{if(selected===region.id)return;selected=region.id;render(true);});return b;
}));
for(const button of document.querySelectorAll('[data-explorer-type]'))button.addEventListener('click',()=>{
 if(type===button.dataset.explorerType)return;
 type=button.dataset.explorerType;for(const other of button.parentElement.children)other.setAttribute('aria-pressed',String(other===button));render(true);
});
render();
window.addEventListener('pagehide',()=>{stopTransitions();reduced.removeEventListener('change',stopTransitions);},{once:true});
