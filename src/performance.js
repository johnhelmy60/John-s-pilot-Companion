import { ac } from './aircraft.js';
import { airportCodes, airportRecord } from './airports.js';
import { getWbSnapshot } from './wb.js';
import { getActiveMinimums } from './minimums.js';
import { calculateAtmosphere, calculateWindComponents, temperatureToC, calculateFlightSpeeds, calculateClimbFromRate, calculateClimbFromGradient, calculateClimbPlan, calculateFuelPlan, calculateDescentPlan } from './performance-calculations.js';

var ctx=null,tempUnit='c';
function e(id){return ctx.el(id)}
function value(id){var node=e(id),raw=node?node.value.trim():'';return raw===''?null:Number(raw)}
function text(id,val){var node=e(id);if(node)node.textContent=val==null?'—':String(val)}
function status(id,val,bad){var node=e(id);if(node){node.textContent=val||'';node.style.color=bad?'var(--r)':'var(--m)'}}
function savedPlan(){try{return JSON.parse(localStorage.jp_routePlan||'null')||{}}catch(error){return {}}}
function parseRunway(raw){var source=String(raw||''),ident=((source.match(/^([^•]+)/)||[])[1]||'').trim();var ends=ident.split('/').map(function(x){return x.trim()}).filter(Boolean);return {ends:ends.length?ends:[ident||'Runway']}}
function runwayHeading(end){var match=String(end||'').match(/^(\d{1,2})/),n=match?Number(match[1]):null;return n==null?null:(n===36?360:n*10)}

function populateAirports(){
 var select=e('mathAirport'),prior=localStorage.jp_mathAirport||savedPlan().departure||'';select.innerHTML='<option value="">Manual entry</option>';
 airportCodes().forEach(function(code){var option=document.createElement('option'),airport=airportRecord(code)||{};option.value=code;option.textContent=code+' — '+(airport.name||'Airport');select.appendChild(option)});
 if(Array.from(select.options).some(function(option){return option.value===prior}))select.value=prior;
}
function populateRunways(applyPrefill){
 var airport=airportRecord(e('mathAirport').value),select=e('mathRunway'),prior=localStorage.jp_mathRunway||'';select.innerHTML='<option value="">Manual entry</option>';
 ((airport&&airport.runways)||[]).forEach(function(raw,index){parseRunway(raw).ends.forEach(function(end,endIndex){var option=document.createElement('option');option.value=index+':'+endIndex;option.textContent='Runway '+end;select.appendChild(option)})});
 if(Array.from(select.options).some(function(option){return option.value===prior}))select.value=prior;
 if(applyPrefill&&airport&&Number.isFinite(Number(airport.elevation)))e('mathElevation').value=Number(airport.elevation);
 if(applyPrefill)applyRunwayHeading();
}
function applyRunwayHeading(){var airport=airportRecord(e('mathAirport').value),parts=e('mathRunway').value.split(':');if(!airport||!e('mathRunway').value||!airport.runways[Number(parts[0])])return;var parsed=parseRunway(airport.runways[Number(parts[0])]),heading=runwayHeading(parsed.ends[Number(parts[1])]||parsed.ends[0]);if(heading!=null)e('mathRunwayHeading').value=heading}
function prefillSavedValues(){
 var wb=getWbSnapshot(),aircraft=ac()||{},limits=getActiveMinimums()||{};
 if(e('mathFuelOnboard').value===''&&wb&&Number.isFinite(Number(wb.fuelGallons)))e('mathFuelOnboard').value=Number(wb.fuelGallons);
 if(e('mathFuelBurn').value===''&&Number.isFinite(Number(aircraft.fuelBurn)))e('mathFuelBurn').value=Number(aircraft.fuelBurn);
 if(e('mathCrosswindLimit').value===''&&Number.isFinite(Number(limits.maxCrosswindKt)))e('mathCrosswindLimit').value=Number(limits.maxCrosswindKt);
 if(e('mathReserveMinutes').value===''&&Number.isFinite(Number(limits.minFuelReserveMin)))e('mathReserveMinutes').value=Number(limits.minFuelReserveMin);
}
function renderAtmosphere(){normalizeAltimeter();var result=calculateAtmosphere({fieldElevationFt:value('mathElevation'),temperatureC:value('mathTemperature'),altimeterInHg:value('mathAltimeter')});text('mathPressureAltitude',result?Math.round(result.pressureAltitudeFt).toLocaleString()+' ft':'—');text('mathDensityAltitude',result?Math.round(result.densityAltitudeFt).toLocaleString()+' ft':'—');status('mathAtmosphereStatus',result?'Approximate rule-of-thumb density altitude; verify with an approved source.':'Enter valid elevation, temperature, and altimeter (25.00–35.00 inHg).',!result)}
function normalizeAltimeter(){var node=e('mathAltimeter'),raw=Number(node.value);if(Number.isInteger(raw)&&raw>=2500&&raw<=3500)node.value=(raw/100).toFixed(2)}
function componentLabel(number){return Math.abs(number).toFixed(1)+' kt '+(number>=0?'headwind':'tailwind')}
function average(a,b){return a==null||b==null?null:(a+b)/2}
function flightSpeeds(kias,averageAltitude,course){var tempC=temperatureToC(value('mathFlightTemperature'),e('mathTemperatureUnit').value),noWind=e('mathForecastWindMode').value==='none';return calculateFlightSpeeds({indicatedAirspeedKt:kias,averageAltitudeFt:averageAltitude,temperatureC:tempC,altimeterInHg:value('mathAltimeter')||29.92,noWind:noWind,courseDeg:course,windDirectionDeg:value('mathForecastWindDirection'),windSpeedKt:value('mathForecastWindSpeed')})}
function renderFlightConditions(){var forecast=e('mathForecastWindMode').value==='forecast';e('mathForecastWindDirectionWrap').classList.toggle('hidden',!forecast);e('mathForecastWindSpeedWrap').classList.toggle('hidden',!forecast);var tempC=temperatureToC(value('mathFlightTemperature'),e('mathTemperatureUnit').value),windValid=!forecast||(value('mathForecastWindDirection')!=null&&value('mathForecastWindDirection')>=0&&value('mathForecastWindDirection')<=360&&value('mathForecastWindSpeed')!=null&&value('mathForecastWindSpeed')>=0&&value('mathForecastWindSpeed')<=250);status('mathFlightConditionsStatus',tempC==null?'Enter a temperature within '+(e('mathTemperatureUnit').value==='f'?'-148 to 158 °F.':'-100 to 70 °C.'):(windValid?(forecast?'Forecast wind will be applied along each entered course.':'No-wind mode: estimated groundspeed equals estimated TAS.'):'Enter valid forecast wind direction and speed.'),tempC==null||!windValid)}
function changeTemperatureUnit(){var next=e('mathTemperatureUnit').value,node=e('mathFlightTemperature'),current=Number(node.value);if(node.value!==''&&Number.isFinite(current)&&next!==tempUnit){node.value=(next==='f'?current*9/5+32:(current-32)*5/9).toFixed(1).replace(/\.0$/,'');localStorage.jp_mathFlightTemperature=node.value}tempUnit=next;node.min=next==='f'?'-148':'-100';node.max=next==='f'?'158':'70';localStorage.jp_mathTemperatureUnit=next;render()}
function renderWind(){
 var gust=value('mathWindGust'),speed=value('mathWindSpeed'),result=calculateWindComponents({runwayHeadingDeg:value('mathRunwayHeading'),windDirectionDeg:value('mathWindDirection'),windSpeedKt:speed,gustSpeedKt:gust});
 text('mathHeadwind',result?componentLabel(result.headwindKt):'—');text('mathCrosswind',result?Math.abs(result.crosswindKt).toFixed(1)+' kt from '+(result.crosswindKt>0?'right':result.crosswindKt<0?'left':'centerline'):'—');text('mathGustCrosswind',result&&gust!=null?Math.abs(result.gustCrosswindKt).toFixed(1)+' kt':'—');
 if(!result)return status('mathWindStatus',gust!=null&&speed!=null&&gust<speed?'Gust must be equal to or greater than steady wind.':'Enter valid headings and wind; heading must be 1–360°.',true);
 var limit=value('mathCrosswindLimit'),actual=Math.abs(gust!=null?result.gustCrosswindKt:result.crosswindKt);status('mathWindStatus',limit==null?'No personal crosswind limit entered.':actual>limit?'WARNING: '+actual.toFixed(1)+' kt exceeds your '+limit.toFixed(1)+' kt limit.':'Within entered '+limit.toFixed(1)+' kt personal limit.',limit!=null&&actual>limit);
}
function renderClimb(){
 var mode=e('mathClimbMode').value;e('mathClimbRateWrap').classList.toggle('hidden',mode!=='rate');e('mathClimbGradientWrap').classList.toggle('hidden',mode!=='gradient');
 var kias=value('mathClimbGroundspeed'),start=value('mathClimbStartAltitude'),target=value('mathClimbTargetAltitude'),speeds=flightSpeeds(kias,average(start,target),value('mathClimbCourse')),gs=speeds?speeds.estimatedGroundspeedKt:null,result=mode==='rate'?calculateClimbFromRate({groundSpeedKt:gs,verticalSpeedFpm:value('mathClimbRate')}):calculateClimbFromGradient({groundSpeedKt:gs,gradientFtPerNm:value('mathClimbGradient')});
 var usedFpm=result?result.requiredFpm:null,toc=calculateClimbPlan({startAltitudeFt:start,targetAltitudeFt:target,verticalSpeedFpm:usedFpm,groundspeedKt:gs});
 text('mathRequiredFpm',result?Math.round(result.requiredFpm).toLocaleString()+' ft/min':'—');text('mathGradientResult',result?Math.round(result.gradientFtPerNm).toLocaleString()+' ft/NM':'—');text('mathClimbAngle',result?result.gradientPercent.toFixed(1)+'% / '+result.angleDegrees.toFixed(1)+'°':'—');text('mathTocTas',speeds?speeds.estimatedTasKt.toFixed(1)+' kt':'—');text('mathTocGroundspeed',speeds?speeds.estimatedGroundspeedKt.toFixed(1)+' kt':'—');text('mathTocTime',toc?toc.climbMinutes.toFixed(1)+' min':'—');text('mathTocDistance',toc?toc.approximateDistanceNm.toFixed(1)+' NM':'—');
 status('mathClimbStatus',toc?'Estimated from average altitude, temperature, wind and course. Verify against flight-planning data.':'Enter valid KIAS, temperature, altitudes, climb value, and course when using wind.',!toc);
}
function formatMinutes(minutes){if(!Number.isFinite(minutes))return '—';return Math.floor(minutes/60)+' hr '+Math.round(minutes%60)+' min'}
function renderFuelDescent(){
 var planned=value('mathPlannedMinutes'),plannedMinutes=planned==null?null:planned*(e('mathPlannedTimeUnit').value==='hours'?60:1),fuel=calculateFuelPlan({fuelOnboardGal:value('mathFuelOnboard'),fuelBurnGph:value('mathFuelBurn'),reserveMinutes:value('mathReserveMinutes'),plannedMinutes:plannedMinutes});
 text('mathTotalEndurance',fuel?formatMinutes(fuel.totalEnduranceMinutes):'—');text('mathUsableEndurance',fuel?formatMinutes(fuel.usableEnduranceMinutes):'—');text('mathFuelRemaining',fuel&&fuel.fuelRemainingGal!=null?fuel.fuelRemainingGal.toFixed(1)+' gal':'—');
 var cruise=value('mathCruiseAltitude'),target=value('mathTargetAltitude'),speeds=flightSpeeds(value('mathDescentGroundspeed'),average(cruise,target),value('mathDescentCourse')),descent=calculateDescentPlan({cruiseAltitudeFt:cruise,targetAltitudeFt:target,descentRateFpm:value('mathDescentRate'),groundspeedKt:speeds?speeds.estimatedGroundspeedKt:null});text('mathTodTas',speeds?speeds.estimatedTasKt.toFixed(1)+' kt':'—');text('mathTodGroundspeed',speeds?speeds.estimatedGroundspeedKt.toFixed(1)+' kt':'—');text('mathDescentTime',descent?descent.descentMinutes.toFixed(1)+' min':'—');text('mathDescentDistance',descent?descent.distanceNm.toFixed(1)+' NM':'—');
 var messages=[];if(!fuel)messages.push('Fuel: enter onboard fuel, positive burn, reserve, and a valid planned time.');else if(fuel.reserveExceedsFuel)messages.push('WARNING: entered reserve requires more fuel than onboard.');else if(fuel.fuelRemainingGal!=null&&fuel.fuelRemainingGal<0)messages.push('WARNING: planned flight consumes more fuel than onboard.');if(!descent)messages.push('TOD: enter valid KIAS, temperature, altitudes, descent rate, and course when using wind.');else messages.push('TOD is estimated from average altitude, temperature, wind and course.');status('mathFuelStatus',messages.join(' '),messages.some(function(message){return message.indexOf('WARNING')===0||message.indexOf('TOD:')===0||message.indexOf('Fuel:')===0}));
}
function render(){if(!ctx)return;renderAtmosphere();renderWind();renderFlightConditions();renderClimb();renderFuelDescent()}
export function renderPerformance(){if(!ctx)return;prefillSavedValues();render()}
export function initPerformance(context){
 ctx=context;populateAirports();populateRunways(false);prefillSavedValues();
 if(localStorage.jp_mathPlannedTimeUnit==='hours')e('mathPlannedTimeUnit').value='hours';
 tempUnit=localStorage.jp_mathTemperatureUnit==='f'?'f':'c';e('mathTemperatureUnit').value=tempUnit;e('mathFlightTemperature').min=tempUnit==='f'?'-148':'-100';e('mathFlightTemperature').max=tempUnit==='f'?'158':'70';if(localStorage.jp_mathForecastWindMode==='forecast')e('mathForecastWindMode').value='forecast';
 e('mathAirport').addEventListener('change',function(){localStorage.jp_mathAirport=e('mathAirport').value;localStorage.jp_mathRunway='';populateRunways(true);render()});
 e('mathRunway').addEventListener('change',function(){localStorage.jp_mathRunway=e('mathRunway').value;applyRunwayHeading();render()});
 ['mathElevation','mathTemperature','mathAltimeter','mathRunwayHeading','mathWindDirection','mathWindSpeed','mathWindGust','mathCrosswindLimit','mathFlightTemperature','mathForecastWindDirection','mathForecastWindSpeed','mathClimbMode','mathClimbGroundspeed','mathClimbRate','mathClimbGradient','mathClimbStartAltitude','mathClimbTargetAltitude','mathClimbCourse','mathFuelOnboard','mathFuelBurn','mathReserveMinutes','mathPlannedMinutes','mathPlannedTimeUnit','mathCruiseAltitude','mathTargetAltitude','mathDescentRate','mathDescentGroundspeed','mathDescentCourse'].forEach(function(id){e(id).addEventListener('input',render);e(id).addEventListener('change',render)});
 e('mathAltimeter').addEventListener('input',function(){normalizeAltimeter();render()});
 e('mathPlannedTimeUnit').addEventListener('change',function(){localStorage.jp_mathPlannedTimeUnit=e('mathPlannedTimeUnit').value});
 e('mathTemperatureUnit').addEventListener('change',changeTemperatureUnit);
 e('mathForecastWindMode').addEventListener('change',function(){localStorage.jp_mathForecastWindMode=e('mathForecastWindMode').value;render()});
 render();
}
