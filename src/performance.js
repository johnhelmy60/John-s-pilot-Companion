import { ac } from './aircraft.js';
import { airportCodes, airportRecord } from './airports.js';
import { getWbSnapshot } from './wb.js';
import { datasetForAircraft, datasetReady } from './performance-datasets.js';

var ctx=null;

function e(id){return ctx.el(id)}
function text(id,value){if(e(id))e(id).textContent=value==null||value===''?'—':String(value)}
function savedPlan(){try{return JSON.parse(localStorage.jp_routePlan||'null')||{}}catch(err){return {}}}
function format(value,digits,unit){return isFinite(value)?Number(value).toFixed(digits)+(unit||''):'—'}

function parseRunway(raw){
 var value=String(raw||''),ident=(value.match(/^([^•]+)/)||[])[1],length=(value.match(/([\d,]+)\s*ft/i)||[])[1],width=(value.match(/x\s*([\d,]+)/i)||[])[1];
 return {raw:value,ident:(ident||'').trim(),lengthFt:length?Number(length.replace(/,/g,'')):null,widthFt:width?Number(width.replace(/,/g,'')):null};
}

function populateAirports(){
 var select=e('perfAirport'),prior=select.value||localStorage.jp_perfAirport||savedPlan().departure||'';select.innerHTML='';
 var empty=document.createElement('option');empty.value='';empty.textContent='Select saved airport';select.appendChild(empty);
 airportCodes().forEach(function(code){var option=document.createElement('option');option.value=code;option.textContent=code+' — '+((airportRecord(code)||{}).name||'Airport');select.appendChild(option)});
 select.value=airportCodes().indexOf(prior)>=0?prior:'';
}

function populateRunways(){
 var code=e('perfAirport').value,airport=airportRecord(code),select=e('perfRunway'),prior=localStorage.jp_perfRunway||'';select.innerHTML='';
 var empty=document.createElement('option');empty.value='';empty.textContent='Select runway';select.appendChild(empty);
 ((airport&&airport.runways)||[]).forEach(function(raw,index){var parsed=parseRunway(raw),option=document.createElement('option');option.value=String(index);option.textContent=parsed.raw||('Runway '+(index+1));select.appendChild(option)});
 if(Array.from(select.options).some(function(option){return option.value===prior}))select.value=prior;
 renderAirport();
}

function selectedRunway(){
 var airport=airportRecord(e('perfAirport').value),index=Number(e('perfRunway').value);
 if(!airport||e('perfRunway').value===''||!airport.runways[index])return null;
 return parseRunway(airport.runways[index]);
}

function renderAircraft(){
 var aircraft=ac(),dataset=datasetForAircraft(aircraft),wb=getWbSnapshot();
 text('perfAircraft',((aircraft&&aircraft.n)||'—')+' • '+((aircraft&&aircraft.type)||'Model missing'));
 text('perfDatasetStatus',dataset?(datasetReady(dataset)?'Verified and ready':'Manifest found — verified POH data missing'):'No dataset manifest for this exact aircraft model');
 text('perfTakeoffWeight',wb&&wb.totalWeightLb!=null?format(wb.totalWeightLb,1,' lb'):'Not available from W&B');
 text('perfLandingWeight','Not available — landing fuel burn is not defined');
 text('perfFuel',wb&&wb.fuelGallons!=null?format(wb.fuelGallons,1,' gal'):'Not available from W&B');
 text('perfCg',wb&&wb.cgArmIn!=null?format(wb.cgArmIn,2,' in'):'Not available from W&B');
 var wbReady=!!(wb&&wb.totalWeightLb>(Number(aircraft.emptyWt)||0)&&wb.fuelGallons!=null&&wb.cgArmIn!=null&&wb.envelopeStatus==='inside');
 text('perfWbStatus',wbReady?'W&B snapshot appears complete • '+wb.calculatedAt:'Incomplete W&B snapshot — add occupants/baggage/fuel and verify CG limits');
 text('perfPohRevision',dataset&&dataset.source.revision?dataset.source.revision:'Not supplied');
 text('perfPohPages',dataset&&dataset.source.pages.length?dataset.source.pages.join(', '):'Not supplied');
 text('perfAssumptions',dataset&&dataset.assumptions.length?dataset.assumptions.join('; '):'None permitted until verified POH data is supplied');
 return {aircraft:aircraft,dataset:dataset,wb:wb,wbReady:wbReady};
}

function renderAirport(){
 var code=e('perfAirport').value,airport=airportRecord(code),runway=selectedRunway();
 localStorage.jp_perfAirport=code;localStorage.jp_perfRunway=e('perfRunway').value;
 text('perfAirportName',airport?code+' • '+(airport.name||'Airport'):'No airport selected');
 text('perfElevation',airport&&airport.elevation!==''?airport.elevation+' ft':'Missing');
 text('perfRunwayDimensions',runway?(runway.lengthFt?runway.lengthFt+' × '+(runway.widthFt||'unknown')+' ft':'Dimensions not structured in airport record'):'No runway selected');
}

function readiness(){
 var context=renderAircraft(),airport=airportRecord(e('perfAirport').value),runway=selectedRunway(),missing=[];
 if(!context.dataset||!datasetReady(context.dataset))missing.push('verified exact-model POH/AFM dataset');
 if(!context.wbReady)missing.push('complete, in-envelope W&B loading with fuel');
 missing.push('landing weight / planned fuel burn');
 if(!airport)missing.push('saved airport');
 if(!runway)missing.push('confirmed runway');else if(!runway.lengthFt||!runway.widthFt)missing.push('structured runway length and width');
 if(!e('perfSurface').value)missing.push('surface condition');
 if(!e('perfFlaps').value.trim())missing.push('exact POH flap setting');
 missing.push('current timestamped weather source');
 if(!e('perfConfirmRunway').checked||!e('perfConfirmWeather').checked||!e('perfConfirmConfig').checked)missing.push('pilot confirmations');
 e('perfReadinessList').innerHTML='';missing.forEach(function(item){var li=document.createElement('li');li.textContent=item;e('perfReadinessList').appendChild(li)});
 text('perfResultStatus',missing.length?'RESULTS LOCKED — '+missing.length+' requirement(s) unresolved':'Ready for validated calculation');
 e('perfResultStatus').className='pill '+(missing.length?'bad':'good');
 return missing.length===0;
}

function checkReadiness(){
 readiness();
 e('perfReadinessStatus').textContent='Readiness checked. No performance calculation was run.';
}

export function renderPerformance(){
 if(!ctx)return;populateAirports();populateRunways();renderAircraft();readiness();
}

export function initPerformance(context){
 ctx=context;populateAirports();populateRunways();renderAircraft();readiness();
 e('perfAirport').addEventListener('change',function(){populateRunways();readiness()});
 e('perfRunway').addEventListener('change',function(){renderAirport();readiness()});
 ['perfSurface','perfFlaps','perfConfirmRunway','perfConfirmWeather','perfConfirmConfig'].forEach(function(id){e(id).addEventListener('input',readiness);e(id).addEventListener('change',readiness)});
 e('perfReadinessBtn').onclick=checkReadiness;
}
