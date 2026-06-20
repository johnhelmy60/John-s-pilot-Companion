import { airportCodes, airportRecord, refreshRouteAirports, removeAirport } from './airports.js';

var ctx=null;
var activeFreq=null,standbyFreq=null,airportRoute=[],freqMode='local';

export function getRoute(){return airportRoute}
export function getRadioStack(){return {active:activeFreq,standby:standbyFreq}}

function saveRoute(){localStorage.jp_route=JSON.stringify(airportRoute)}

export function onAirportRemoved(code){
 airportRoute=airportRoute.filter(function(x){return x!=code});
 saveRoute();
 activeFreq=activeFreq&&activeFreq.indexOf(code+'|')===0?null:activeFreq;
 standbyFreq=standbyFreq&&standbyFreq.indexOf(code+'|')===0?null:standbyFreq;
 localStorage.jp_activeFreq=activeFreq||'';
 localStorage.jp_standbyFreq=standbyFreq||'';
}

export function setMode(m){freqMode=m;localStorage.jp_freqMode=m;renderFreqs();updateModeButtons()}

function updateModeButtons(){
 var el=ctx.el,label=freqMode=='local'?'Local VFR':freqMode=='ff'?'VFR + Flight Following':'IFR';
 el('freqModeLabel').innerHTML=label;
 ['modeLocal','modeFF','modeIFR'].forEach(function(id){el(id).className='btn btn2'});
 if(freqMode=='local')el('modeLocal').className='btn';
 if(freqMode=='ff')el('modeFF').className='btn';
 if(freqMode=='ifr')el('modeIFR').className='btn';
}

function shouldShow(freqType){if(freqMode=='ifr')return true;if(freqMode=='ff')return freqType=='vfr'||freqType=='ff';return freqType=='vfr'}

export function renderAirports(){
 var bank=ctx.el('airportBank');bank.innerHTML='';
 airportCodes().forEach(function(code){
  var item=document.createElement('div');
  item.className='airportBankItem';

  var b=document.createElement('button');
  b.className='bubble'+(airportRoute.includes(code)?' selected':'');
  b.textContent=code;
  b.title='Add '+code+' to selected airport sequence';
  b.onclick=function(){airportRoute.push(code);saveRoute();renderAirports()};

  var del=document.createElement('button');
  del.className='airportRemove';
  del.textContent='X';
  del.title='Remove '+code+' from My Airports';
  del.setAttribute('aria-label','Remove '+code+' from My Airports');
  del.onclick=function(){removeAirport(code)};

  item.appendChild(b);
  item.appendChild(del);
  bank.appendChild(item);
 });
 renderRoute();renderFreqs();
}

function renderRoute(){
 var box=ctx.el('routeBox');box.innerHTML='';
 if(!airportRoute.length){box.innerHTML='<span class="small">No selected airports selected yet. Add airports from the Frequency page.</span>';return}
 airportRoute.forEach(function(code,i){
  var b=document.createElement('button');
  b.className='bubble routeBubble';
  b.textContent=code+' - Remove from Selected Airports';
  b.onclick=function(){removeRouteAirport(code)};
  box.appendChild(b);
 });
}

function removeRouteAirport(code){
 airportRoute=airportRoute.filter(function(x){return x!==code});
 if(activeFreq && activeFreq.indexOf(code+'|')===0) activeFreq=null;
 if(standbyFreq && standbyFreq.indexOf(code+'|')===0) standbyFreq=null;
 localStorage.jp_activeFreq=activeFreq||'';
 localStorage.jp_standbyFreq=standbyFreq||'';
 saveRoute();
 renderAirports();
}

function airportInfoHtml(a){
 if(!a)return '';
 var runwayCount=(a.runways||[]).length;
 var freqCount=(a.freqs||[]).length;
 var preview=(a.runways||[]).slice(0,4).join('<br>');
 if(!preview) preview='Runway details not loaded';
 return '<div class="airportInfo">'
   + '<b>'+((a&&a.name)||'')+'</b><br>'
   + 'Elevation: '+(a.elevation||'—')+' ft • Runways: '+runwayCount+' • Frequencies: '+freqCount+'<br>'
   + '<b>Runways:</b><br>'+preview
   + (runwayCount>4?'<br>+'+(runwayCount-4)+' more':'')
   + '</div>';
}

function tapFreq(k){
 if(activeFreq==k){
   activeFreq=null;
 } else if(standbyFreq==k){
   standbyFreq=null;
 } else if(!activeFreq){
   activeFreq=k;
 } else if(!standbyFreq){
   standbyFreq=k;
 } else {
   activeFreq=standbyFreq;
   standbyFreq=k;
 }
 localStorage.jp_activeFreq=activeFreq||'';
 localStorage.jp_standbyFreq=standbyFreq||'';
 renderFreqs();
}

function renderFreqs(){
 updateModeButtons();
 var el=ctx.el,list=el('freqList');list.innerHTML='';
 el('activeFreqLabel').innerHTML=activeFreq?activeFreq.replaceAll('|',' • '):'—';
 el('standbyFreqLabel').innerHTML=standbyFreq?standbyFreq.replaceAll('|',' • '):'—';
 if(!airportRoute.length){list.innerHTML='<div class="small">No airports selected.</div>';return}
 airportRoute.forEach(function(code){
  var a=airportRecord(code), g=document.createElement('div');
  g.className='freqGroup';
  g.innerHTML='<h3>'+code+'</h3>'
    + airportInfoHtml(a)
    + '<button class="btn btn2 miniBtn">Remove from Selected Airports</button>';
  g.querySelector('button').onclick=function(){removeRouteAirport(code)};
  var shown=((a&&a.freqs)||[]).filter(function(f){return shouldShow(f[2])});
  if(!shown.length){
    var empty=document.createElement('div');
    empty.className='small';
    empty.innerHTML='No frequencies for this mode.';
    g.appendChild(empty);
  }
  shown.forEach(function(f){
   var k=code+'|'+f[0]+'|'+f[1],btn=document.createElement('button');
   btn.className='freqBtn'+(activeFreq==k?' activeFreq':standbyFreq==k?' standbyFreq':'');
   btn.innerHTML='<span>'+f[0]+'</span> '+f[1];
   btn.onclick=function(){tapFreq(k)};
   g.appendChild(btn);
  });
  list.appendChild(g);
 });
}

export function initFrequencies(context){
 ctx=context;
 try{airportRoute=JSON.parse(localStorage.jp_route||'[]')}catch(e){airportRoute=[]}
 activeFreq=localStorage.jp_activeFreq||null;
 standbyFreq=localStorage.jp_standbyFreq||null;
 freqMode=localStorage.jp_freqMode||'local';
 ctx.el('clearRouteBtn').onclick=function(){airportRoute=[];activeFreq=null;standbyFreq=null;saveRoute();renderAirports()};
 ctx.el('modeLocal').onclick=function(){setMode('local')};
 ctx.el('modeFF').onclick=function(){setMode('ff')};
 ctx.el('modeIFR').onclick=function(){setMode('ifr')};
 if(ctx.el('refreshRouteBtn'))ctx.el('refreshRouteBtn').onclick=function(){refreshRouteAirports(airportRoute)};
 renderAirports();
}
