import { initAirports } from './airports.js';
import { initFrequencies, renderAirports, onAirportRemoved } from './frequencies.js';
import { initCraft } from './craft.js';
import { initBriefing, renderBriefing } from './briefing.js';
import { initMinimums, getActiveMinimums, renderSummary as renderMinimumsSummary } from './minimums.js';
import { initRoutePlan } from './routeplan.js';
import { initFuel, calcFuel, getLastReserveHours } from './fuel.js';
import { initWb, calcWB } from './wb.js';
import { enhanceForms, validateInput } from './validation.js';
import { initPerformance, renderPerformance } from './performance.js';

var lastCrosswind=null,lastGustCrosswind=null;
var mainTabs=['route','plan','airport','craft','more'];
var sections=['routeplan','plan','airport','more','crosswind','wb','performance','fuel','tank','hobbs','freq','airports','brief','minimums','craft','gono'];
var sectionNodes={},mainNode=null;

function el(id){
 var found=document.getElementById(id);if(found)return found;
 var keys=Object.keys(sectionNodes);
 for(var i=0;i<keys.length;i++){found=sectionNodes[keys[i]].querySelector('#'+id);if(found)return found}
 return null;
}
function nv(id){var e=el(id);if(!e||!validateInput(e,false))return null;var x=parseFloat(e.value);return isFinite(x)?x:null}
function fmt(x,d){return isFinite(x)?Number(x).toFixed(d):'—'}
function pill(t,k){return '<span class="pill '+k+'">'+t+'</span>'}
function norm(d){return((d%360)+360)%360}
function diff(f,t){return((f-t+540)%360)-180}
function today(){return new Date().toISOString().slice(0,10)}
function clone(o){return JSON.parse(JSON.stringify(o))}

function normalizeTab(id){
 if(id==='board'||id==='route')return 'routeplan';
 if(id==='radio'||id==='following')return 'craft';
 if(id==='aircraft')return 'plan';
 if(sections.indexOf(id)>=0)return id;
 return 'routeplan';
}

function groupFor(id){
 if(id==='routeplan')return 'route';
 if(['plan','crosswind','wb','performance','fuel','minimums','gono'].indexOf(id)>=0)return 'plan';
 if(['airport','airports','brief','freq'].indexOf(id)>=0)return 'airport';
 if(id==='craft')return 'craft';
 if(['more','tank','hobbs'].indexOf(id)>=0)return 'more';
 return 'route';
}

function showTab(id){
 id=normalizeTab(id);
 var active=sectionNodes[id];if(!active)return;
 sections.forEach(function(s){var node=sectionNodes[s];if(node){node.classList.toggle('hidden',s!==id);node.setAttribute('aria-hidden',s===id?'false':'true');if(s!==id)node.setAttribute('inert','');else node.removeAttribute('inert')}});
 Array.from(mainNode.children).forEach(function(node){if(node.tagName==='SECTION')node.remove()});
 mainNode.appendChild(active);active.classList.remove('hidden');
 mainTabs.forEach(function(s){
  if(el('tab-'+s)){var selected=s==groupFor(id);el('tab-'+s).className=selected?'tab active':'tab';el('tab-'+s).setAttribute('aria-selected',selected?'true':'false');el('tab-'+s).tabIndex=selected?0:-1}
 });
 localStorage.jp_tab=groupFor(id)==='route'?'route':id;
 try{calcAll()}catch(err){console.error('Page calculation refresh failed:',err)}
 if(id=='brief')renderBriefing();
 if(id=='performance')renderPerformance();
}

function saveInputs(){
 allControls('input').forEach(function(i){
  if(i.id&&!i.id.startsWith('ac')&&!i.id.startsWith('min'))localStorage['jp_'+i.id]=i.value;
 });
}

function loadInputs(){
 allControls('input').forEach(function(i){
  var v=localStorage['jp_'+i.id];
  if(v!=null)i.value=v;
 });
}

function allControls(selector){var found=[];Object.keys(sectionNodes).forEach(function(key){found=found.concat(Array.from(sectionNodes[key].querySelectorAll(selector)))});return found}

function calcCross(){
 var mins=getActiveMinimums(),r=nv('rwy'),wd=nv('windDir'),ws=nv('windSpeed'),g=nv('gust'),manualLim=nv('xwLimit');
 var lim=mins.maxCrosswindKt;
 if(manualLim!=null)lim=lim==null?manualLim:Math.min(lim,manualLim);
 var gustLim=mins.maxGustCrosswindKt;
 var rh=r==null?null:(r<=36?norm(r*10):norm(r));
 el('rwyOut').innerHTML=rh==null?'—':String(Math.round(rh)).padStart(3,'0')+'°';
 if(rh==null||wd==null||ws==null){lastCrosswind=null;lastGustCrosswind=null;['angleOut','xwOut','gxwOut','hwOut','sideOut','crabOut'].forEach(function(id){el(id).textContent='—'});el('windRisk').innerHTML='';return}
 var d=diff(wd,rh),abs=Math.abs(d),rad=abs*Math.PI/180,xw=Math.abs(ws*Math.sin(rad)),gxw=(g!=null&&g>ws)?Math.abs(g*Math.sin(rad)):null,hw=ws*Math.cos(rad);
 lastCrosswind=xw;lastGustCrosswind=gxw;
 el('angleOut').innerHTML=fmt(abs,0)+'°';el('xwOut').innerHTML=fmt(xw,1)+' kt';el('gxwOut').innerHTML=gxw==null?'—':fmt(gxw,1)+' kt';el('hwOut').innerHTML=hw>=0?fmt(hw,1)+' kt headwind':fmt(Math.abs(hw),1)+' kt tailwind';
 var side=Math.abs(d)<2?'Mostly straight':d>0?'From RIGHT':'From LEFT',crab=Math.abs(d)<2?'Little/no crab':d>0?'Crab nose RIGHT':'Crab nose LEFT';
 el('sideOut').innerHTML=side;el('crabOut').innerHTML=crab;
 var html=pill(side,'warn')+pill(crab,'good');
 if(lim!=null)html+=xw>lim?pill('Crosswind over minimum','bad'):xw>lim*.8?pill('Crosswind near minimum','warn'):pill('Crosswind within minimum','good');
 if(gxw!=null&&gustLim!=null)html+=gxw>gustLim?pill('Gust XW over minimum','bad'):gxw>gustLim*.8?pill('Gust XW near minimum','warn'):pill('Gust XW within minimum','good');
 if(hw<0)html+=pill('Tailwind','bad');
 el('windRisk').innerHTML=html;
}

function calcHobbs(){
 var sh=nv('startHobbs'),eh=nv('endHobbs'),st=nv('startTach'),et=nv('endTach'),rate=nv('rate'),h=(sh!=null&&eh!=null)?eh-sh:null,t=(st!=null&&et!=null)?et-st:null;
 el('hobbsTime').innerHTML=h==null?'—':fmt(h,1);el('tachTime').innerHTML=t==null?'—':fmt(t,2);el('rentalCost').innerHTML=(h!=null&&rate!=null)?'$'+fmt(h*rate,2):'—';
}

function calcGo(){
 var mins=getActiveMinimums(),steadyX=lastCrosswind??0,gustX=lastGustCrosswind??lastCrosswind??0,res=getLastReserveHours()??0,c=el('goCeil').value.trim()?nv('goCeil'):9999,v=el('goVis').value.trim()?nv('goVis'):10,ws=nv('windSpeed')??0,g=nv('gust')??0;
 if(c==null||v==null){el('goOverall').textContent='INVALID INPUT';el('goDetails').innerHTML=pill('Correct ceiling or visibility','bad');el('goCeilAuto').textContent='—';el('goVisAuto').textContent='—';return}
 el('goXwAuto').innerHTML=gustX?fmt(gustX,1)+' kt':'—';el('goReserveAuto').innerHTML=res?fmt(res,2)+' hr':'—';el('goCeilAuto').innerHTML=fmt(c,0)+' ft AGL';el('goVisAuto').innerHTML=fmt(v,1)+' SM';
 var score=0,html='';function a(n,l){score=Math.max(score,l);html+=pill(n,l==2?'bad':l==1?'warn':'good')}
 a('Crosswind',steadyX&&steadyX>mins.maxCrosswindKt?2:steadyX&&steadyX>mins.maxCrosswindKt*.8?1:0);
 a('Gust XW',gustX&&gustX>mins.maxGustCrosswindKt?2:gustX&&gustX>mins.maxGustCrosswindKt*.8?1:0);
 a('Fuel',res&&res*60<mins.minFuelReserveMin?2:res&&res*60<mins.minFuelReserveMin*1.25?1:0);
 a('Ceiling',c<mins.minCeilingFtAgl?2:c<mins.minCeilingFtAgl*1.25?1:0);
 a('Visibility',v<mins.minVisibilitySm?2:v<mins.minVisibilitySm*1.25?1:0);
 a('Surface wind',ws&&ws>mins.maxSurfaceWindKt?2:ws&&ws>mins.maxSurfaceWindKt*.8?1:0);
 a('Gust',g&&g>mins.maxGustKt?2:g&&g>mins.maxGustKt*.8?1:0);
 el('goOverall').innerHTML=score==2?'HIGH RISK':score==1?'MODERATE RISK':'LOW RISK';
 el('goDetails').innerHTML=html;
}

function calcAll(){renderMinimumsSummary();calcCross();calcWB();calcFuel();calcHobbs();calcGo();saveInputs()}

function setTankInterval(min){localStorage.jp_tankInterval=String(min);el('tankIntervalLabel').innerHTML=String(min)}
function tankInterval(){return parseInt(localStorage.jp_tankInterval||'60')}
function startTank(t){localStorage.jp_tank=t;localStorage.jp_tankStart=Date.now();updateTank()}
function stopTank(){localStorage.removeItem('jp_tankStart');updateTank()}
function updateTank(){
 var t=localStorage.jp_tank,s=parseInt(localStorage.jp_tankStart||0),int=tankInterval();el('tankIntervalLabel').innerHTML=String(int);el('tankName').innerHTML=t||'—';
 if(!s){el('tankElapsed').innerHTML='—';el('tankRemaining').innerHTML='—';el('tankWarn').innerHTML='';return}
 var m=(Date.now()-s)/60000,rem=int-m;el('tankElapsed').innerHTML='Elapsed: '+fmt(m,1)+' minutes';el('tankRemaining').innerHTML='Remaining: '+fmt(Math.max(rem,0),1)+' minutes';
 el('tankWarn').innerHTML=rem<=0?pill('SWITCH TANKS','bad'):rem<=5?pill('Switch soon','warn'):pill('Timer running','good');
}

function wireTabs(){
 mainTabs.forEach(function(s){
  var tab=el('tab-'+s);
  if(tab)tab.onclick=function(){showTab(s)};
 });
 allControls('[data-open]').forEach(function(btn){
  btn.onclick=function(event){event.preventDefault();event.stopPropagation();showTab(btn.getAttribute('data-open'))};
 });
 var tablist=document.querySelector('.tabs');tablist.setAttribute('role','tablist');tablist.setAttribute('aria-label','Primary navigation');
 mainTabs.forEach(function(s,index){var tab=el('tab-'+s);if(tab){tab.setAttribute('role','tab');tab.setAttribute('aria-controls',s==='route'?'routeplan':s);tab.addEventListener('keydown',function(event){if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight'&&event.key!=='Home'&&event.key!=='End')return;event.preventDefault();var next=event.key==='Home'?0:event.key==='End'?mainTabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+mainTabs.length)%mainTabs.length;el('tab-'+mainTabs[next]).focus();showTab(mainTabs[next])})}});
}

function wireGoNoGo(){var reset=el('goResetBtn');if(reset)reset.addEventListener('click',function(){['goCeil','goVis'].forEach(function(id){el(id).value='';localStorage.removeItem('jp_'+id)});calcAll()})}

window.onload=function(){
 mainNode=document.querySelector('main');sections.forEach(function(id){var node=document.getElementById(id);if(node)sectionNodes[id]=node});
 var context={el:el,nv:nv,fmt:fmt,pill:pill,today:today,clone:clone,calcAll:calcAll,showTab:showTab,renderAirports:function(){renderAirports();renderBriefing()},onAirportRemoved:onAirportRemoved};
 window.jpShowTab=showTab;
 wireTabs();
 wireGoNoGo();
 loadInputs();
 initFuel(context);
 initWb(context);
 initAirports(context);
 initFrequencies(context);
 initRoutePlan(context);
 initCraft(context);
 initBriefing(context);
 initMinimums(context);
initPerformance(context);
 enhanceForms(Object.keys(sectionNodes).map(function(id){return sectionNodes[id]}));
 allControls('input').forEach(function(i){i.addEventListener('input',calcAll)});
 el('leftTankBtn').onclick=function(){startTank('LEFT')};el('rightTankBtn').onclick=function(){startTank('RIGHT')};el('stopTankBtn').onclick=stopTank;
 el('tank30').onclick=function(){setTankInterval(30)};el('tank45').onclick=function(){setTankInterval(45)};el('tank60').onclick=function(){setTankInterval(60)};
 el('crosswindExampleBtn').onclick=function(){el('rwy').value=18;el('windDir').value=240;el('windSpeed').value=12;el('gust').value=18;calcAll()};
 el('crosswindResetBtn').onclick=function(){['rwy','windDir','windSpeed','gust','xwLimit'].forEach(function(id){el(id).value='';localStorage.removeItem('jp_'+id)});calcAll()};
 showTab(localStorage.jp_tab||'route');calcAll();updateTank();setInterval(updateTank,1000);
 if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
}
