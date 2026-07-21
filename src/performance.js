import { ac } from './aircraft.js';
import { airportCodes, airportRecord } from './airports.js';
import { getWbSnapshot } from './wb.js';
import { getActiveMinimums } from './minimums.js';
import { calculateAtmosphere, calculateWindComponents, calculateClimbFromRate, calculateClimbFromGradient, calculateFuelPlan, calculateDescentPlan } from './performance-calculations.js';

var ctx=null;
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
function renderAtmosphere(){var result=calculateAtmosphere({fieldElevationFt:value('mathElevation'),temperatureC:value('mathTemperature'),altimeterInHg:value('mathAltimeter')});text('mathPressureAltitude',result?Math.round(result.pressureAltitudeFt).toLocaleString()+' ft':'—');text('mathDensityAltitude',result?Math.round(result.densityAltitudeFt).toLocaleString()+' ft':'—');status('mathAtmosphereStatus',result?'Approximate rule-of-thumb density altitude; verify with an approved source.':'Enter valid elevation, temperature, and altimeter (25.00–35.00 inHg).',!result)}
function componentLabel(number){return Math.abs(number).toFixed(1)+' kt '+(number>=0?'headwind':'tailwind')}
function renderWind(){
 var gust=value('mathWindGust'),speed=value('mathWindSpeed'),result=calculateWindComponents({runwayHeadingDeg:value('mathRunwayHeading'),windDirectionDeg:value('mathWindDirection'),windSpeedKt:speed,gustSpeedKt:gust});
 text('mathHeadwind',result?componentLabel(result.headwindKt):'—');text('mathCrosswind',result?Math.abs(result.crosswindKt).toFixed(1)+' kt from '+(result.crosswindKt>0?'right':result.crosswindKt<0?'left':'centerline'):'—');text('mathGustCrosswind',result&&gust!=null?Math.abs(result.gustCrosswindKt).toFixed(1)+' kt':'—');
 if(!result)return status('mathWindStatus',gust!=null&&speed!=null&&gust<speed?'Gust must be equal to or greater than steady wind.':'Enter valid headings and wind; heading must be 1–360°.',true);
 var limit=value('mathCrosswindLimit'),actual=Math.abs(gust!=null?result.gustCrosswindKt:result.crosswindKt);status('mathWindStatus',limit==null?'No personal crosswind limit entered.':actual>limit?'WARNING: '+actual.toFixed(1)+' kt exceeds your '+limit.toFixed(1)+' kt limit.':'Within entered '+limit.toFixed(1)+' kt personal limit.',limit!=null&&actual>limit);
}
function renderClimb(){
 var mode=e('mathClimbMode').value;e('mathClimbRateWrap').classList.toggle('hidden',mode!=='rate');e('mathClimbGradientWrap').classList.toggle('hidden',mode!=='gradient');
 var result=mode==='rate'?calculateClimbFromRate({groundSpeedKt:value('mathClimbGroundspeed'),verticalSpeedFpm:value('mathClimbRate')}):calculateClimbFromGradient({groundSpeedKt:value('mathClimbGroundspeed'),gradientFtPerNm:value('mathClimbGradient')});
 text('mathRequiredFpm',result?Math.round(result.requiredFpm).toLocaleString()+' ft/min':'—');text('mathGradientResult',result?Math.round(result.gradientFtPerNm).toLocaleString()+' ft/NM':'—');text('mathClimbAngle',result?result.gradientPercent.toFixed(1)+'% / '+result.angleDegrees.toFixed(1)+'°':'—');status('mathClimbStatus',result?'Conversion assumes constant groundspeed and climb rate.':'Enter positive groundspeed and the selected climb value.',!result);
}
function formatMinutes(minutes){if(!Number.isFinite(minutes))return '—';return Math.floor(minutes/60)+' hr '+Math.round(minutes%60)+' min'}
function renderFuelDescent(){
 var fuel=calculateFuelPlan({fuelOnboardGal:value('mathFuelOnboard'),fuelBurnGph:value('mathFuelBurn'),reserveMinutes:value('mathReserveMinutes'),plannedMinutes:value('mathPlannedMinutes')});
 text('mathTotalEndurance',fuel?formatMinutes(fuel.totalEnduranceMinutes):'—');text('mathUsableEndurance',fuel?formatMinutes(fuel.usableEnduranceMinutes):'—');text('mathFuelRemaining',fuel&&fuel.fuelRemainingGal!=null?fuel.fuelRemainingGal.toFixed(1)+' gal':'—');
 var descent=calculateDescentPlan({cruiseAltitudeFt:value('mathCruiseAltitude'),targetAltitudeFt:value('mathTargetAltitude'),descentRateFpm:value('mathDescentRate'),groundSpeedKt:value('mathDescentGroundspeed')});text('mathDescentTime',descent?descent.descentMinutes.toFixed(1)+' min':'—');text('mathDescentDistance',descent?descent.distanceNm.toFixed(1)+' NM':'—');
 var messages=[];if(!fuel)messages.push('Fuel: enter onboard fuel, positive burn, and reserve.');else if(fuel.reserveExceedsFuel)messages.push('WARNING: entered reserve requires more fuel than onboard.');else if(fuel.fuelRemainingGal!=null&&fuel.fuelRemainingGal<0)messages.push('WARNING: planned flight consumes more fuel than onboard.');if(!descent)messages.push('Descent: cruise altitude must exceed target; enter positive descent rate and groundspeed.');status('mathFuelStatus',messages.join(' '),messages.length>0);
}
function render(){if(!ctx)return;renderAtmosphere();renderWind();renderClimb();renderFuelDescent()}
export function renderPerformance(){if(!ctx)return;prefillSavedValues();render()}
export function initPerformance(context){
 ctx=context;populateAirports();populateRunways(false);prefillSavedValues();
 e('mathAirport').addEventListener('change',function(){localStorage.jp_mathAirport=e('mathAirport').value;localStorage.jp_mathRunway='';populateRunways(true);render()});
 e('mathRunway').addEventListener('change',function(){localStorage.jp_mathRunway=e('mathRunway').value;applyRunwayHeading();render()});
 ['mathElevation','mathTemperature','mathAltimeter','mathRunwayHeading','mathWindDirection','mathWindSpeed','mathWindGust','mathCrosswindLimit','mathClimbMode','mathClimbGroundspeed','mathClimbRate','mathClimbGradient','mathFuelOnboard','mathFuelBurn','mathReserveMinutes','mathPlannedMinutes','mathCruiseAltitude','mathTargetAltitude','mathDescentRate','mathDescentGroundspeed'].forEach(function(id){e(id).addEventListener('input',render);e(id).addEventListener('change',render)});
 render();
}
