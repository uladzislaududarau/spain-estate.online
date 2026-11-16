import {regions,pricingData,getMinimumPrice,formatMoney} from './pricing.mjs';
const list=document.querySelector('#region-tabs');let selected='costa-blanca';let type='apartment';
const label=document.querySelector('#region-name');const cities=document.querySelector('#region-cities');const cta=document.querySelector('#region-search');
function render(){
 label.textContent=regions.find(r=>r.id===selected).name;
 document.querySelector('#region-minimum').textContent=formatMoney(getMinimumPrice({regions:[selected],cities:[],propertyType:type}));
 cities.replaceChildren(...pricingData.filter(row=>row.regionId===selected).sort((a,b)=>a[`${type}Min`]-b[`${type}Min`]).map(row=>{const p=document.createElement('p');const name=document.createElement('span');name.textContent=row.city;const money=document.createElement('span');money.textContent=`от ${formatMoney(row[`${type}Min`])}`;if(type==='villa'&&row.villaLocationNote){const note=document.createElement('small');note.textContent=row.villaLocationNote;name.append(note);}p.append(name,money);return p;}));
 cta.dataset.presetRegion=selected;
 for(const button of list.children){const active=button.dataset.region===selected;button.classList.toggle('is-selected',active);button.setAttribute('aria-pressed',String(active));}
}
list.replaceChildren(...regions.map(region=>{const b=document.createElement('button');b.type='button';b.className='region-tab';b.dataset.region=region.id;b.textContent=region.name;const arrow=document.createElement('span');arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');b.append(arrow);b.addEventListener('click',()=>{selected=region.id;render();});return b;}));
for(const button of document.querySelectorAll('[data-explorer-type]'))button.addEventListener('click',()=>{type=button.dataset.explorerType;for(const other of button.parentElement.children)other.setAttribute('aria-pressed',String(other===button));render();});
render();
