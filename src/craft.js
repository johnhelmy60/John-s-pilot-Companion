import { airportRecord, normalizeCode } from './airports.js';

var ctx=null;
var craftRouteTokens=[];

function craftVal(id){var e=ctx.el(id);return e?(e.value||'').trim():''}
function setInput(id,val){if(ctx.el(id)){ctx.el(id).value=val;craftUpdate();saveCraft();}}
function commaNumber(n){if(!n)return '';var x=parseInt(n,10);return isFinite(x)?x.toLocaleString():n}

function saveCraft(){
 var fields=['craftCallsign','craftDep','craftClearance','craftClearType','craftMaintain','craftExpect','craftExpectTime','craftFreq','craftSquawk'];
 fields.forEach(function(id){if(ctx.el(id))localStorage['jp_'+id]=ctx.el(id).value});
 localStorage.jp_craftRouteTokens=JSON.stringify(craftRouteTokens);
}

function loadCraft(){
 var fields=['craftCallsign','craftDep','craftClearance','craftClearType','craftMaintain','craftExpect','craftExpectTime','craftFreq','craftSquawk'];
 fields.forEach(function(id){var v=localStorage['jp_'+id];if(v!=null&&ctx.el(id))ctx.el(id).value=v});
 try{craftRouteTokens=JSON.parse(localStorage.jp_craftRouteTokens||'[]')}catch(e){craftRouteTokens=[]}
}

function addRouteToken(){
 var v=craftVal('routeEntry').toUpperCase().replace(/\s+/g,'');
 if(!v)return;
 craftRouteTokens.push(v);
 ctx.el('routeEntry').value='';
 renderRouteTokens();
 craftUpdate();
 saveCraft();
}

function renderRouteTokens(){
 var box=ctx.el('routeTokens'); if(!box)return;
 box.innerHTML='';
 if(!craftRouteTokens.length){box.innerHTML='<span class="small">Add route bubbles or choose As Filed / Radar Vectors.</span>';return}
 craftRouteTokens.forEach(function(tok,i){
  var b=document.createElement('button');b.className='bubble routeBubble';b.textContent=tok+' ×';
  b.onclick=function(){craftRouteTokens.splice(i,1);renderRouteTokens();craftUpdate();saveCraft()};
  box.appendChild(b);
 });
}

function setRoutePreset(txt){
 craftRouteTokens=[txt];
 renderRouteTokens();
 craftUpdate();
 saveCraft();
}

function renderAltitudeButtons(){
 var maintain=[5000,6000,7000,8000,9000,10000,11000,12000];
 var expect=[7000,8000,9000,10000,11000,12000,14000,16000];
 var times=[5,10,15,20];
 function render(list,boxId,targetId,suffix){
  var box=ctx.el(boxId); if(!box)return; box.innerHTML='';
  list.forEach(function(v){
   var b=document.createElement('button');b.className='bubble';b.textContent=String(v)+(suffix||'');
   b.onclick=function(){setInput(targetId,String(v))};
   box.appendChild(b);
  });
 }
 render(maintain,'maintainButtons','craftMaintain','');
 render(expect,'expectButtons','craftExpect','');
 render(times,'expectTimeButtons','craftExpectTime',' min');
}

function renderDepartureFreqs(){
 var box=ctx.el('departureFreqButtons'); if(!box)return;
 box.innerHTML='';
 var code=normalizeCode(craftVal('craftDep'));
 var a=airportRecord(code);
 if(!a){box.innerHTML='<span class="small">Enter a saved departure airport to show departure frequencies.</span>';return}
 var freqs=(a.freqs||[]).filter(function(f){
   var label=((f[0]||'')+' '+(f[1]||'')).toUpperCase();
   return label.indexOf('DEP')>=0 || label.indexOf('APP')>=0 || label.indexOf('CENTER')>=0 || f[2]=='ff';
 });
 if(!freqs.length){box.innerHTML='<span class="small">No departure/approach frequencies found for '+code+'. Use custom frequency.</span>';return}
 freqs.forEach(function(f){
  var b=document.createElement('button');b.className='bubble';b.textContent=f[0]+' '+f[1];
  b.onclick=function(){setInput('craftFreq',f[1])};
  box.appendChild(b);
 });
}

function craftUpdate(){
 renderDepartureFreqs();
 var callsign=craftVal('craftCallsign')||'CALLSIGN';
 var clearTo=craftVal('craftClearance').toUpperCase();
 var clearType=craftVal('craftClearType')||'Cleared to';
 var route=craftRouteTokens.join(' ');
 var maintain=craftVal('craftMaintain');
 var expect=craftVal('craftExpect');
 var expectTime=craftVal('craftExpectTime')||'10';
 var freq=craftVal('craftFreq');
 var squawk=craftVal('craftSquawk');
 var parts=[];
 if(clearTo)parts.push(clearType+' '+clearTo);
 if(route)parts.push(route.toLowerCase()==='as filed'?'as filed':route.toLowerCase()==='radar vectors'?'via radar vectors':'via '+route);
 if(maintain)parts.push('maintain '+commaNumber(maintain));
 if(expect)parts.push('expect '+commaNumber(expect)+' '+expectTime+' minutes after departure');
 if(freq)parts.push('departure frequency '+freq);
 if(squawk)parts.push('squawk '+squawk);
 ctx.el('craftReadback').innerHTML=parts.length?parts.join(', ')+', '+callsign+'.':'—';
 function ok(v){return v?ctx.pill('✅','good'):ctx.pill('❌','bad')}
 ctx.el('craftChecklist').innerHTML =
   '<div>C '+ok(clearTo)+' Clearance Limit</div>'+
   '<div>R '+ok(route)+' Route</div>'+
   '<div>A '+ok(maintain)+' Altitude</div>'+
   '<div>F '+ok(freq)+' Frequency</div>'+
   '<div>T '+ok(squawk)+' Transponder</div>';
}

function clearCraft(){
 ['craftClearance','craftMaintain','craftExpect','craftExpectTime','craftFreq','craftSquawk','routeEntry'].forEach(function(id){if(ctx.el(id))ctx.el(id).value=''});
 craftRouteTokens=[];
 renderRouteTokens();
 craftUpdate();
 saveCraft();
}

export function initCraft(context){
 ctx=context;
 loadCraft();
 renderRouteTokens();
 renderAltitudeButtons();
 craftUpdate();
 if(ctx.el('addRouteTokenBtn'))ctx.el('addRouteTokenBtn').onclick=addRouteToken;
 if(ctx.el('routeEntry'))ctx.el('routeEntry').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();addRouteToken()}});
 if(ctx.el('routeAsFiledBtn'))ctx.el('routeAsFiledBtn').onclick=function(){setRoutePreset('AS FILED')};
 if(ctx.el('routeRadarVectorsBtn'))ctx.el('routeRadarVectorsBtn').onclick=function(){setRoutePreset('RADAR VECTORS')};
 if(ctx.el('clearRouteTokensBtn'))ctx.el('clearRouteTokensBtn').onclick=function(){craftRouteTokens=[];renderRouteTokens();craftUpdate();saveCraft()};
 if(ctx.el('clearCraftBtn'))ctx.el('clearCraftBtn').onclick=clearCraft;
 ['craftCallsign','craftDep','craftClearance','craftClearType','craftMaintain','craftExpect','craftExpectTime','craftFreq','craftSquawk'].forEach(function(id){
   if(ctx.el(id)){ctx.el(id).addEventListener('input',function(){craftUpdate();saveCraft()});ctx.el(id).addEventListener('change',function(){craftUpdate();saveCraft()})}
 });
}
