import { ac } from './aircraft.js';
import { airportCodes, airportRecord } from './airports.js';
import { getWbSnapshot } from './wb.js';
import { getFuelPlanningSnapshot } from './fuel.js';
import { datasetForAircraft, datasetReady } from './performance-datasets.js';
import { fetchMetar, savedMetar, weatherAge, weatherIsStale } from './weather.js';

var ctx=null;

function e(id){return ctx.el(id)}
function text(id,value){if(e(id))e(id).textContent=value==null||value===''?'—':String(value)}
function savedPlan(){try{return JSON.parse(localStorage.jp_routePlan||'null')||{}}catch(err){return {}}}
function renderWeather(data,error){
 var status=e('perfWeatherStatus'),available=!!(data&&data.status==='available'),stale=weatherIsStale(data),age=weatherAge(data),wind=data&&data.wind;
 status.textContent=error?(available?'STALE SAVED WEATHER - LIVE FETCH FAILED':'WEATHER UNAVAILABLE'):available?(stale?'STALE WEATHER':'CURRENT WEATHER'):'NOT FETCHED';
 status.className='pill '+(available&&!stale?'good':'bad');
 text('perfWeatherTimestamp',data&&data.observationTime?data.observationTime:'Unavailable');
 text('perfWeatherAge',age==null?'Unknown':age+' min');
 text('perfWeatherTemp',data&&data.temperatureC!=null?data.temperatureC+' C':'Unavailable');
 text('perfWeatherAltimeter',data&&data.altimeterInHg!=null?Number(data.altimeterInHg).toFixed(2)+' inHg':'Unavailable');
 text('perfWeatherWind',wind&&wind.speedKt!=null?(wind.directionDegrees==null?'Variable':String(Math.round(wind.directionDegrees)).padStart(3,'0')+' deg')+' at '+wind.speedKt+' kt'+(wind.gustKt!=null?' gust '+wind.gustKt:''):'Unavailable');
 text('perfWeatherRaw',data&&data.rawMetar?data.rawMetar:'Unavailable');
 text('perfWeatherError',error?error.message:(stale&&available?'Observation is stale and cannot satisfy Performance readiness.':''));
 text('perfWeatherDiagnostic',error?'HTTP status: '+(error.httpStatus||'network/unavailable')+' / Proxy: '+(error.proxyHostname||'unknown'):'');
 e('perfConfirmWeather').disabled=!available||stale;if(e('perfConfirmWeather').disabled)e('perfConfirmWeather').checked=false;
}
async function getWeather(){
 var code=e('perfAirport').value,button=e('perfWeatherBtn');button.disabled=true;button.textContent='Fetching AWC METAR...';
 try{renderWeather(await fetchMetar(code),null)}catch(error){renderWeather(error.weather||savedMetar(code),error)}
 button.disabled=false;button.textContent='Fetch Latest AWC METAR';readiness();
}
function format(value,digits,unit){return isFinite(value)?Number(value).toFixed(digits)+(unit||''):'—'}

export function calculateLandingWeight(values){
 var takeoffWeightLb=Number(values.takeoffWeightLb),startingFuelGallons=Number(values.startingFuelGallons),plannedFlightHours=Number(values.plannedFlightHours),fuelBurnGph=Number(values.fuelBurnGph),taxiFuelGallons=Number(values.taxiFuelGallons),fuelPoundsPerGallon=Number(values.fuelPoundsPerGallon);
 var flightFuelConsumedGallons=plannedFlightHours*fuelBurnGph,totalFuelConsumedGallons=taxiFuelGallons+flightFuelConsumedGallons;
 if(![takeoffWeightLb,startingFuelGallons,plannedFlightHours,fuelBurnGph,taxiFuelGallons,fuelPoundsPerGallon].every(isFinite)||takeoffWeightLb<=0||startingFuelGallons<0||plannedFlightHours<0||fuelBurnGph<=0||taxiFuelGallons<0||fuelPoundsPerGallon<=0)return null;
 if(totalFuelConsumedGallons>startingFuelGallons)return null;
 return {flightFuelConsumedGallons:flightFuelConsumedGallons,totalFuelConsumedGallons:totalFuelConsumedGallons,landingWeightLb:takeoffWeightLb-totalFuelConsumedGallons*fuelPoundsPerGallon};
}

function landingWeightData(){
 var aircraft=ac(),wb=getWbSnapshot(),fuel=getFuelPlanningSnapshot(),taxiRaw=e('perfTaxiFuel').value.trim(),taxi=taxiRaw===''?null:Number(taxiRaw),ppg=Number(aircraft&&aircraft.fuelPpg),errors=[];
 if(!wb||!isFinite(wb.totalWeightLb))errors.push('takeoff weight from W&B');
 if(!wb||!isFinite(wb.fuelGallons))errors.push('starting fuel from W&B');
 if(!fuel||!isFinite(fuel.plannedFlightHours))errors.push('planned flight time from Fuel Planning');
 if(!fuel||!isFinite(fuel.fuelBurnGph))errors.push('fuel burn from Fuel Planning');
 if(taxi==null||!isFinite(taxi)||taxi<0)errors.push('valid taxi fuel');
 if(!isFinite(ppg)||ppg<=0)errors.push('aircraft fuel weight per gallon');
 var calculation=wb&&fuel&&taxi!=null?calculateLandingWeight({takeoffWeightLb:wb.totalWeightLb,startingFuelGallons:wb.fuelGallons,plannedFlightHours:fuel.plannedFlightHours,fuelBurnGph:fuel.fuelBurnGph,taxiFuelGallons:taxi,fuelPoundsPerGallon:ppg}):null;
 var flightConsumed=fuel?fuel.plannedFlightHours*fuel.fuelBurnGph:null,totalConsumed=flightConsumed!=null&&taxi!=null?flightConsumed+taxi:null;
 if(totalConsumed!=null&&wb&&isFinite(wb.fuelGallons)&&totalConsumed>wb.fuelGallons)errors.push('planned fuel consumed exceeds W&B starting fuel');
 if(!e('perfConfirmTaxi').checked)errors.push('taxi-fuel confirmation');
 var landingWeight=!errors.length&&calculation?calculation.landingWeightLb:null;if(!calculation&&errors.length===0)errors.push('valid landing-weight inputs');
 text('perfLandingTakeoffWeight',wb&&isFinite(wb.totalWeightLb)?format(wb.totalWeightLb,1,' lb'):'Missing');
 text('perfLandingStartFuel',wb&&isFinite(wb.fuelGallons)?format(wb.fuelGallons,1,' gal'):'Missing');
 text('perfLandingFlightTime',fuel&&isFinite(fuel.plannedFlightHours)?format(fuel.plannedFlightHours,2,' hr'):'Missing');
 text('perfLandingBurn',fuel&&isFinite(fuel.fuelBurnGph)?format(fuel.fuelBurnGph,1,' GPH'):'Missing');
 text('perfLandingTaxiUsed',taxi!=null&&isFinite(taxi)?format(taxi,1,' gal'):'Missing');
 text('perfLandingFlightUsed',flightConsumed!=null?format(flightConsumed,1,' gal'):'Missing');
 text('perfLandingTotalUsed',totalConsumed!=null?format(totalConsumed,1,' gal'):'Missing');
 text('perfLandingFuelPpg',isFinite(ppg)?format(ppg,1,' lb/gal'):'Missing');
 text('perfLandingWeightCalc',landingWeight!=null?format(landingWeight,1,' lb'):'LOCKED');
 text('perfLandingWeight',landingWeight!=null?format(landingWeight,1,' lb'):'LOCKED');
 e('perfLandingWeightStatus').textContent=errors.length?'Landing weight locked - '+errors.join(', '):'Landing weight calculated from taxi plus planned flight fuel actually consumed.';
 e('perfLandingWeightStatus').className='pill '+(errors.length?'bad':'good');
 return {ready:errors.length===0,landingWeightLb:landingWeight,errors:errors};
}

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
 text('perfDatasetStatus',datasetReady(dataset)?'Approved exact-aircraft dataset ready':'Performance data unavailable');
 text('perfTakeoffWeight',wb&&wb.totalWeightLb!=null?format(wb.totalWeightLb,1,' lb'):'Not available from W&B');
 landingWeightData();
 text('perfFuel',wb&&wb.fuelGallons!=null?format(wb.fuelGallons,1,' gal'):'Not available from W&B');
 text('perfCg',wb&&wb.cgArmIn!=null?format(wb.cgArmIn,2,' in'):'Not available from W&B');
 var wbReady=!!(wb&&wb.totalWeightLb>(Number(aircraft.emptyWt)||0)&&wb.fuelGallons!=null&&wb.cgArmIn!=null&&wb.envelopeStatus==='inside');
 text('perfWbStatus',wbReady?'W&B snapshot appears complete • '+wb.calculatedAt:'Incomplete W&B snapshot — add occupants/baggage/fuel and verify CG limits');
 text('perfPohRevision',dataset&&dataset.source.revision?dataset.source.revision:'Not supplied');
 var pages=dataset&&dataset.source&&Array.isArray(dataset.source.pages)?dataset.source.pages:dataset&&dataset.charts?['takeoff','landing','climb'].reduce(function(all,kind){return all.concat((dataset.charts[kind]||[]).map(function(chart){return chart.page}))},[]):[];
 text('perfPohPages',pages.length?Array.from(new Set(pages)).join(', '):'Not supplied');
 text('perfAssumptions',dataset&&dataset.assumptions.length?dataset.assumptions.join('; '):'None permitted until verified POH data is supplied');
 return {aircraft:aircraft,dataset:dataset,wb:wb,wbReady:wbReady};
}

function renderAirport(){
 var code=e('perfAirport').value,airport=airportRecord(code),runway=selectedRunway();
 localStorage.jp_perfAirport=code;localStorage.jp_perfRunway=e('perfRunway').value;
 text('perfAirportName',airport?code+' • '+(airport.name||'Airport'):'No airport selected');
 text('perfElevation',airport&&airport.elevation!==''?airport.elevation+' ft':'Missing');
 text('perfRunwayDimensions',runway?(runway.lengthFt?runway.lengthFt+' × '+(runway.widthFt||'unknown')+' ft':'Dimensions not structured in airport record'):'No runway selected');
 renderWeather(savedMetar(code),null);
}

function readiness(){
 var context=renderAircraft(),landing=landingWeightData(),airport=airportRecord(e('perfAirport').value),runway=selectedRunway(),missing=[];
 if(!context.dataset||!datasetReady(context.dataset))missing.push('verified exact-model POH/AFM dataset');
 if(!context.wbReady)missing.push('complete, in-envelope W&B loading with fuel');
 if(!landing.ready)missing.push('confirmed landing-weight calculation');
 if(!airport)missing.push('saved airport');
 if(!runway)missing.push('confirmed runway');else if(!runway.lengthFt||!runway.widthFt)missing.push('structured runway length and width');
 if(!e('perfSurface').value)missing.push('surface condition');
 if(!e('perfFlaps').value.trim())missing.push('exact POH flap setting');
 var weather=savedMetar(e('perfAirport').value);if(!weather||weatherIsStale(weather))missing.push('current, non-stale timestamped METAR');
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
 ctx=context;
 if(!e('perfWeatherDiagnostic')){var diagnostic=document.createElement('div');diagnostic.id='perfWeatherDiagnostic';diagnostic.className='small';diagnostic.setAttribute('role','status');e('perfWeatherError').parentNode.insertBefore(diagnostic,e('perfWeatherBtn'))}
 populateAirports();populateRunways();renderAircraft();readiness();
 e('perfAirport').addEventListener('change',function(){populateRunways();readiness()});
 e('perfRunway').addEventListener('change',function(){renderAirport();readiness()});
 ['perfSurface','perfFlaps','perfConfirmRunway','perfConfirmWeather','perfConfirmConfig'].forEach(function(id){e(id).addEventListener('input',readiness);e(id).addEventListener('change',readiness)});
 ['perfTaxiFuel','perfConfirmTaxi'].forEach(function(id){e(id).addEventListener('input',readiness);e(id).addEventListener('change',readiness)});
 e('perfReadinessBtn').onclick=checkReadiness;
 e('perfWeatherBtn').onclick=getWeather;
}
