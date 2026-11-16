import test from 'node:test';
import assert from 'node:assert/strict';
import { pricingData, regions, priceSource, getSelectionPrices, getMinimumPrice, generateBudgetRanges, evaluateBudget, recommendAlternatives, createPricingSummary, formatMoney } from '../showcase/assets/pricing.mjs';
const citySelection = (cityId, propertyType = 'apartment') => ({regions:[pricingData.find(row => row.cityId === cityId).regionId],cities:[cityId],propertyType});
for(const [city,type,expected] of [['elda','apartment',120000],['elda','villa',200000],['torrevieja','apartment',150000],['alicante','villa',450000],['javea','villa',700000],['barcelona','villa',1000000],['palma-de-mallorca','villa',1200000]]) test(`${city} ${type}: source threshold €${expected}`,()=>assert.equal(getMinimumPrice(citySelection(city,type)),expected));
test('21 unique city rows, nine regions, integer euro values',()=>{
 assert.equal(pricingData.length,21); assert.equal(new Set(pricingData.map(row=>row.cityId)).size,21); assert.equal(regions.length,9);
 for(const row of pricingData){assert.ok(regions.some(region=>region.id===row.regionId));assert.ok(Number.isSafeInteger(row.apartmentMin)&&row.apartmentMin>0);assert.ok(Number.isSafeInteger(row.villaMin)&&row.villaMin>0);}
 assert.match(priceSource.id,/user-provided/);
});
test('Costa Blanca any-city apartment minimum is Elda €120000, not every city',()=>{
 const selection={regions:['costa-blanca'],cities:[],propertyType:'apartment'};
 assert.equal(getMinimumPrice(selection),120000);assert.equal(getSelectionPrices(selection).length,10);
 assert.deepEqual(evaluateBudget(selection,120000).eligible.map(row=>row.cityId),['elda']);
});
test('Costa del Sol any-city villa minimum is Fuengirola €800000',()=>{
 const selection={regions:['costa-del-sol'],cities:[],propertyType:'villa'};
 assert.equal(getMinimumPrice(selection),800000);assert.deepEqual(evaluateBudget(selection,800000).eligible.map(row=>row.cityId),['fuengirola']);
});
test('multiple cities: €200000 reaches only Torrevieja, not Alicante or Jávea',()=>{
 const result=evaluateBudget({regions:['costa-blanca'],cities:['alicante','torrevieja','javea'],propertyType:'apartment'},200000);
 assert.deepEqual(result.eligible.map(row=>row.cityId),['torrevieja']);assert.deepEqual(result.ineligible.map(row=>row.cityId),['alicante','javea']);assert.equal(result.belowMinimum,false);
});
test('both types remain distinct: Alicante €300000 reaches apartment but not villa',()=>{
 const result=evaluateBudget(citySelection('alicante','both'),300000);
 assert.deepEqual(result.byType,{apartment:250000,villa:450000});assert.deepEqual(result.eligible.map(row=>row.type),['apartment']);assert.deepEqual(result.ineligible.map(row=>row.type),['villa']);assert.equal(result.cities[0].types.villa.meetsThreshold,false);assert.equal(result.minimum,250000);
});
test('all geographical villa notes survive lead summary serialization',()=>{
 for(const [cityId,note] of [['barcelona','пригород Барселоны'],['valencia','пригород Валенсии'],['benidorm','Finestrat рядом с Benidorm']]){
 const summary=createPricingSummary(citySelection(cityId,'villa'),{min:2000000,max:2000000,custom:true});assert.equal(summary.eligible[0].note,note);assert.ok(summary.eligible[0].noteEn.length);assert.deepEqual(JSON.parse(JSON.stringify(summary)),summary);}
});
test('all combinations produce adaptive contiguous, non-overlapping half-open ranges',()=>{
 for(const row of pricingData)for(const type of ['apartment','villa','both']){
 const result=generateBudgetRanges(citySelection(row.cityId,type));assert.equal(result.ranges[0].min,result.minimum);assert.ok(result.customAllowed);assert.equal(result.ranges.at(-1).max,null);
 for(let i=0;i<result.ranges.length-1;i++){assert.ok(result.ranges[i].max>result.ranges[i].min);assert.equal(result.ranges[i].max,result.ranges[i+1].min);assert.ok(Number.isSafeInteger(result.ranges[i].min));}}
 assert.notDeepEqual(generateBudgetRanges(citySelection('elda')).ranges,generateBudgetRanges(citySelection('palma-de-mallorca','villa')).ranges);
 assert.deepEqual(generateBudgetRanges(citySelection('alicante')).ranges.map(range=>range.min),[250000,350000,500000,750000,1000000]);
});
test('Barcelona villa €400000 remains submittable below €1m threshold',()=>{
 const summary=createPricingSummary(citySelection('barcelona','villa'),{min:400000,max:400000,custom:true});
 assert.equal(summary.minimum,1000000);assert.equal(summary.belowMinimum,true);assert.equal(summary.canSubmit,true);assert.equal(summary.ineligible[0].note,'пригород Барселоны');assert.equal(summary.source,priceSource.id);
});
test('legacy categories get no invented price and still permit custom budgets',()=>{
 for(const type of ['penthouse','townhouse','commercial']){
 const selection=citySelection('alicante',type);assert.equal(getMinimumPrice(selection),null);assert.equal(generateBudgetRanges(selection).missingData,true);assert.deepEqual(generateBudgetRanges(selection).ranges,[]);
 const result=evaluateBudget(selection,200000);assert.equal(result.missingData,true);assert.equal(result.eligible.length,0);assert.equal(result.canSubmit,true);}
});
test('unknown IDs and missing prices never widen selection or invent prices',()=>{
 for(const selection of [{regions:['unknown'],cities:[],propertyType:'apartment'},{regions:['costa-blanca'],cities:['unknown'],propertyType:'apartment'},{regions:['costa-blanca'],cities:['barcelona'],propertyType:'apartment'},{regions:[],cities:[],propertyType:'apartment'},{}]){assert.equal(getMinimumPrice(selection),null);assert.equal(evaluateBudget(selection,100000).missingData,true);}
 const damaged=[{...pricingData.find(row=>row.cityId==='alicante'),villaMin:null}];assert.equal(generateBudgetRanges(citySelection('alicante','villa'),damaged).minimum,null);assert.equal(evaluateBudget(citySelection('alicante','both'),300000,damaged).missingData,true);
});
test('multi-region selection supports any-city in one region with explicit city in another',()=>{
 const selection={regions:['costa-blanca','costa-del-sol','costa-blanca'],cities:['alicante'],anyCityRegions:['costa-del-sol'],propertyType:'apartment'};
 assert.deepEqual(getSelectionPrices(selection).map(row=>row.cityId),['alicante','malaga','fuengirola','estepona']);assert.equal(getMinimumPrice(selection),250000);
});
test('same-region alternatives first; other regions require opt-in',()=>{
 const selection=citySelection('javea');const local=recommendAlternatives(selection,200000);
 assert.ok(local.length>0);assert.ok(local.every(row=>row.regionId==='costa-blanca'&&row.minimum<=200000&&row.cityId!=='javea'));assert.ok(local.some(row=>row.cityId==='torrevieja'));
 const wider=recommendAlternatives(selection,200000,{allowOtherRegions:true,limit:30});assert.ok(wider.some(row=>row.regionId!=='costa-blanca'));const firstOutside=wider.findIndex(row=>row.regionId!=='costa-blanca');assert.ok(wider.slice(0,firstOutside).every(row=>row.regionId==='costa-blanca'));assert.deepEqual(recommendAlternatives(citySelection('javea','commercial'),9999999),[]);
});
test('exclusive upper bound and conservative open-ended lower bound',()=>{
 const selection={regions:['costa-blanca'],cities:['torrevieja','alicante'],propertyType:'apartment'};
 assert.deepEqual(createPricingSummary(selection,{min:150000,max:250000,custom:false}).eligible.map(row=>row.cityId),['torrevieja']);assert.equal(createPricingSummary(selection,{min:250000,max:250000,custom:true}).eligible.length,2);assert.deepEqual(createPricingSummary(selection,{min:200000,max:null,custom:false}).eligible.map(row=>row.cityId),['torrevieja']);
});
test('region/type recalculation is pure and generates distinct range IDs',()=>{
 const original=citySelection('elda');const copy=structuredClone(original);const apartment=generateBudgetRanges(original);const villa=generateBudgetRanges({...original,propertyType:'villa'});const palma=generateBudgetRanges(citySelection('palma-de-mallorca','villa'));
 assert.notEqual(apartment.ranges[0].id,villa.ranges[0].id);assert.notEqual(villa.ranges[0].id,palma.ranges[0].id);assert.deepEqual(original,copy);
});
test('invalid budgets do not become matches; zero is a permissible below-threshold request',()=>{
 for(const value of [-1,NaN,Infinity,'200000',undefined]){const result=evaluateBudget(citySelection('elda'),value);assert.equal(result.canSubmit,false);assert.equal(result.eligible.length,0);}assert.equal(evaluateBudget(citySelection('elda'),0).canSubmit,true);
});
test('formatting stays outside numeric logic',()=>{assert.match(formatMoney(250000),/250/);assert.match(formatMoney(250000,'en'),/€/);assert.equal(formatMoney(null),'—');assert.equal(typeof pricingData[0].apartmentMin,'number');});
test('malformed ranges are not silently coerced into valid budgets',()=>{
 for(const budget of [{min:200000,max:100000,custom:false},{min:200000,max:200000,custom:false},{min:200000,max:'300000',custom:false},{min:200000,max:300000,custom:true},{min:-100,max:null,custom:false}])assert.equal(createPricingSummary(citySelection('elda'),budget).canSubmit,false);
});
