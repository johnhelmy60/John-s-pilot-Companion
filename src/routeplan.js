import { setRoute } from './frequencies.js';
import { validateSection, validateInput } from './validation.js';

var ctx=null;
var routeTokens=[];

function e(id){return ctx.el(id)}
function value(id){return e(id)?e(id).value.trim():''}
function normalize(value){return String(value||'').trim().toUpperCase().replace(/\s+/g,'')}
function parseTokens(value){
 return String(value||'').toUpperCase().split(/[\s,]+/).map(normalize).filter(Boolean);
}

export function getRoutePlan(){
 try{return JSON.parse(localStorage.jp_routePlan||'null')||{}}catch(err){return {}}
}

function currentPlan(){
 return {
  callsign:value('planCallsign').toUpperCase(),
  departure:normalize(value('planDeparture')),
  arrival:normalize(value('planArrival')),
  route:routeTokens.slice()
 };
}

function savePlan(){
 var plan=currentPlan();
 localStorage.jp_routePlan=JSON.stringify(plan);
 var airports=[plan.departure,plan.arrival].filter(Boolean);
 setRoute(airports);
 renderSummary(plan);
 return plan;
}

function renderTokens(){
 var box=e('planRouteTokens');if(!box)return;
 box.innerHTML='';
 if(!routeTokens.length){box.innerHTML='<span class="small">No route entered. You can still use As Filed or enter the assigned route directly in CRAFT.</span>';return}
 routeTokens.forEach(function(token,index){
  var button=document.createElement('button');
  button.type='button';button.className='bubble routeBubble';button.textContent=token+' ×';
  button.setAttribute('aria-label','Remove '+token);
  button.onclick=function(){routeTokens.splice(index,1);renderTokens();savePlan()};
  box.appendChild(button);
 });
}

function renderSummary(plan){
 var out=e('planRouteSummary');if(!out)return;
 var endpoints=(plan.departure||'FROM')+' → '+(plan.arrival||'TO');
 out.textContent=endpoints+(plan.route.length?' via '+plan.route.join(' '):'');
}

function addTokens(){
 var input=e('planRouteEntry');
 var added=parseTokens(input.value);
 if(!validateInput(input,true)){input.focus();return}
 added.forEach(function(token){routeTokens.push(token)});
 input.value='';renderTokens();savePlan();
}

function loadPlan(){
 var plan=getRoutePlan();
 e('planCallsign').value=plan.callsign||'';
 e('planDeparture').value=plan.departure||'';
 e('planArrival').value=plan.arrival||'';
 routeTokens=Array.isArray(plan.route)?plan.route.slice():[];
 renderTokens();renderSummary(currentPlan());
}

function saveAndOpenCraft(){
 var plan=savePlan();
 if(!validateSection(e('routeplan'),true)){
  e('planStatus').textContent='Correct the highlighted flight-plan fields before opening CRAFT.';
  var invalid=e('routeplan').querySelector('[aria-invalid="true"]');if(invalid)invalid.focus();
  return;
 }
 e('planStatus').textContent='Plan saved and loaded into CRAFT.';
 window.dispatchEvent(new CustomEvent('jp:route-plan-saved',{detail:plan}));
 ctx.showTab('craft');
}

export function initRoutePlan(context){
 ctx=context;loadPlan();
 ['planCallsign','planDeparture','planArrival'].forEach(function(id){
  e(id).addEventListener('input',savePlan);
  e(id).addEventListener('change',savePlan);
 });
 e('planAddRouteBtn').onclick=addTokens;
 e('planRouteEntry').addEventListener('keydown',function(event){if(event.key==='Enter'){event.preventDefault();addTokens()}});
 e('planClearRouteBtn').onclick=function(){routeTokens=[];renderTokens();savePlan()};
 e('planOpenCraftBtn').onclick=saveAndOpenCraft;
}
