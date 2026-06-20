import { ac } from './aircraft.js';
import { airportCodes, airportRecord } from './airports.js';
import { getRoute, getRadioStack } from './frequencies.js';
import { getActiveMode, getActiveMinimums } from './minimums.js';

var ctx=null;
var selectedAirport='';

function readJson(key,fallback){
 try{return JSON.parse(localStorage[key]||'null')||fallback}catch(e){return fallback}
}

function airportNotes(code){
 return readJson('jp_airportNotes',{})[code]||'';
}

function patternBrief(code){
 return readJson('jp_airportPatternBriefs',{})[code]||{altitude:'',direction:'Verify current',runwayNotes:'',patternNotes:''};
}

function formatFreq(k){
 if(!k)return '-';
 return k.replaceAll('|',' - ');
}

function tankStatus(){
 var tank=localStorage.jp_tank||'-';
 var start=parseInt(localStorage.jp_tankStart||0);
 var interval=parseInt(localStorage.jp_tankInterval||'60');
 if(!start)return {tank:tank,elapsed:'-',remaining:'-',warn:''};
 var elapsed=(Date.now()-start)/60000;
 var remaining=interval-elapsed;
 return {
  tank:tank,
  elapsed:elapsed.toFixed(1)+' min',
  remaining:Math.max(remaining,0).toFixed(1)+' min',
  warn:remaining<=0?'SWITCH TANKS':remaining<=5?'Switch soon':'Timer running'
 };
}

function esc(value){
 return String(value).replace(/[&<>"']/g,function(ch){
  return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
 });
}

function setText(id,value){
 if(ctx.el(id))ctx.el(id).textContent=value;
}

function setHtml(id,value){
 if(ctx.el(id))ctx.el(id).innerHTML=value;
}

function routeOptions(){
 var route=getRoute();
 return route.length?route:airportCodes();
}

function renderAirportSelect(){
 var sel=ctx.el('boardAirportSelect');
 if(!sel)return;
 var codes=routeOptions();
 var prior=selectedAirport||localStorage.jp_kneeboardAirport||codes[0]||'';
 sel.innerHTML='';
 codes.forEach(function(code){
  var a=airportRecord(code)||{};
  var o=document.createElement('option');
  o.value=code;
  o.textContent=code+' - '+(a.name||'Airport');
  sel.appendChild(o);
 });
 selectedAirport=codes.indexOf(prior)>=0?prior:(codes[0]||'');
 if(selectedAirport)sel.value=selectedAirport;
 localStorage.jp_kneeboardAirport=selectedAirport||'';
}

function renderAirportBrief(){
 var code=selectedAirport;
 var a=airportRecord(code)||{};
 var p=patternBrief(code);
 setText('boardAirportTitle',code?code+' - '+(a.name||'Airport'):'No airport selected');
 setText('boardAirportMeta',code?'Elevation '+(a.elevation||'-')+' ft - verify current chart/ForeFlight':'Select or save an airport first.');
 setText('boardStudentNotes',airportNotes(code)||'No student notes saved for this airport.');
 setHtml('boardPattern',[
  'Pattern altitude: '+esc(p.altitude||'Verify current'),
  'Traffic: '+esc(p.direction||'Verify current'),
  'Runway notes: '+esc(p.runwayNotes||'-'),
  'Pattern notes: '+esc(p.patternNotes||'-')
 ].join('<br>'));
}

export function renderKneeboard(){
 if(!ctx)return;
 var aircraft=ac();
 var route=getRoute();
 var radio=getRadioStack();
 var tank=tankStatus();
 var mins=getActiveMinimums();
 var mode=getActiveMode()==='dual'?'Dual':'Solo';

 renderAirportSelect();
 setText('boardAircraft',''+(aircraft.n||'-')+' - '+(aircraft.type||'-'));
 setText('boardRoute',route.length?route.join(' -> '):'No route selected');
 setText('boardActiveFreq',formatFreq(radio.active));
 setText('boardStandbyFreq',formatFreq(radio.standby));
 setText('boardTank','Tank '+tank.tank+' - elapsed '+tank.elapsed+' - remaining '+tank.remaining);
 setText('boardTankWarn',tank.warn);
 setText('boardMinimums',mode+' - XW '+mins.maxCrosswindKt+' kt - gust XW '+mins.maxGustCrosswindKt+' kt - ceiling '+mins.minCeilingFtAgl+' ft - visibility '+mins.minVisibilitySm+' SM - reserve '+mins.minFuelReserveMin+' min');
 renderAirportBrief();
}

function goTab(id){
 if(window.jpShowTab){window.jpShowTab(id);return}
 var tab=ctx.el('tab-'+id);
 if(tab)tab.click();
}

export function initKneeboard(context){
 ctx=context;
 if(ctx.el('boardAirportSelect'))ctx.el('boardAirportSelect').onchange=function(){
  selectedAirport=this.value;
  localStorage.jp_kneeboardAirport=selectedAirport;
  renderAirportBrief();
 };
 if(ctx.el('boardAtcBtn'))ctx.el('boardAtcBtn').onclick=function(){goTab('atc')};
 if(ctx.el('boardFfBtn'))ctx.el('boardFfBtn').onclick=function(){goTab('radio')};
 if(ctx.el('boardCraftBtn'))ctx.el('boardCraftBtn').onclick=function(){goTab('craft')};
 renderKneeboard();
}
