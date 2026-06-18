import { ac } from './aircraft.js';
import { airportCodes, airportRecord } from './airports.js';

var ctx=null;
var currentCode=null;

function normalizeBriefCode(code){
 return (code||'').trim().toUpperCase();
}

function getNotes(){
 try{return JSON.parse(localStorage.jp_airportNotes||'{}')||{}}catch(e){return {}}
}

function saveNote(code,value){
 var notes=getNotes();
 code=normalizeBriefCode(code);
 if(!code)return;
 notes[code]=value;
 localStorage.jp_airportNotes=JSON.stringify(notes);
}

function noteFor(code){
 return getNotes()[normalizeBriefCode(code)]||'';
}

function groupFrequency(f){
 var label=((f&&f[0])||'').toUpperCase();
 if(label.indexOf('ATIS')>=0||label.indexOf('AWOS')>=0||label.indexOf('ASOS')>=0)return 'Weather';
 if(label.indexOf('GROUND')>=0)return 'Ground';
 if(label.indexOf('TOWER')>=0||label.indexOf('CTAF')>=0||label.indexOf('UNICOM')>=0||label.indexOf('MULTICOM')>=0)return 'Tower / CTAF';
 if(label.indexOf('CLEARANCE')>=0||label.indexOf('DELIVERY')>=0||label.indexOf('CLD')>=0)return 'Clearance';
 if(label.indexOf('DEP')>=0||label.indexOf('APP')>=0||label.indexOf('CENTER')>=0||label.indexOf('CTR')>=0)return 'Approach / Departure / Center';
 if(label.indexOf('FSS')>=0||label.indexOf('FLIGHT SERVICE')>=0)return 'Flight Service / Other';
 return 'Other';
}

function renderFrequencyGroup(title,freqs){
 if(!freqs.length)return '';
 var html='<div class="freqGroup"><h3>'+title+'</h3>';
 freqs.forEach(function(f){
  html+='<div class="freqBtn"><span>'+((f&&f[0])||'Frequency')+'</span> '+((f&&f[1])||'verify current')+' <span>'+((f&&f[2])||'reference')+'</span></div>';
 });
 return html+'</div>';
}

function frequencyHtml(a){
 var groups={
  'Weather':[],
  'Ground':[],
  'Tower / CTAF':[],
  'Clearance':[],
  'Approach / Departure / Center':[],
  'Flight Service / Other':[],
  'Other':[]
 };
 ((a&&a.freqs)||[]).forEach(function(f){groups[groupFrequency(f)].push(f)});
 var html='';
 Object.keys(groups).forEach(function(k){html+=renderFrequencyGroup(k,groups[k])});
 return html||'<div class="small">No frequencies saved for this airport.</div>';
}

function runwayHtml(a){
 var runways=(a&&a.runways)||[];
 if(!runways.length)return '<div class="small">Runway details not loaded. Verify runway, pattern, closures, and NOTAMs with current sources.</div>';
 return '<ul class="briefList">'+runways.map(function(r){return '<li>'+r+'</li>'}).join('')+'</ul>';
}

function aircraftHtml(){
 var aircraft=ac();
 return '<div class="result">'
   + '<h3>Selected Aircraft</h3>'
   + '<table>'
   + '<tr><td>N-number</td><td>'+(aircraft.n||'—')+'</td></tr>'
   + '<tr><td>Type</td><td>'+(aircraft.type||'—')+'</td></tr>'
   + '<tr><td>Personal XW limit</td><td>'+((aircraft.xwLimit||'—'))+' kt</td></tr>'
   + '<tr><td>Fuel burn</td><td>'+((aircraft.fuelBurn||'—'))+' GPH</td></tr>'
   + '</table>'
   + '</div>';
}

function reminderHtml(){
 return '<div class="result">'
  + '<h3>Briefing Reminders</h3>'
  + '<ul class="briefList">'
  + '<li>Verify weather and NOTAMs with current official sources.</li>'
  + '<li>Confirm runway in use, runway condition, and traffic pattern.</li>'
  + '<li>Verify frequencies with ForeFlight/current charts before transmitting.</li>'
  + '<li>Confirm personal minimums, fuel, W&B, POH, instructor, and school procedures.</li>'
  + '</ul>'
  + '</div>';
}

export function renderBriefing(){
 if(!ctx)return;
 var codes=airportCodes();
 var select=ctx.el('briefAirportSelect');
 if(!select)return;
 var prior=currentCode||localStorage.jp_briefAirport||codes[0]||'';
 select.innerHTML='';
 codes.forEach(function(code){
  var o=document.createElement('option');
  o.value=code;
  o.textContent=code+' - '+((airportRecord(code)||{}).name||'Airport');
  select.appendChild(o);
 });
 currentCode=codes.indexOf(prior)>=0?prior:(codes[0]||'');
 if(currentCode)select.value=currentCode;
 localStorage.jp_briefAirport=currentCode||'';
 renderSelectedBriefing();
}

function renderSelectedBriefing(){
 var box=ctx.el('briefContent');
 var notes=ctx.el('briefStudentNotes');
 if(!box)return;
 if(!currentCode){
  box.innerHTML='<div class="result">Save or load an airport first, then return here for a briefing.</div>';
  if(notes){notes.value='';notes.disabled=true}
  return;
 }
 var a=airportRecord(currentCode);
 if(!a){
  box.innerHTML='<div class="result">Airport not found. Save or load the airport first.</div>';
  if(notes){notes.value='';notes.disabled=true}
  return;
 }
 if(notes){notes.disabled=false;notes.value=noteFor(currentCode)}
 box.innerHTML=
  '<div class="result">'
  + '<div class="small">Airport</div>'
  + '<div class="big" style="font-size:24px">'+currentCode+'</div>'
  + '<b>'+((a&&a.name)||'')+'</b><br>'
  + '<span class="small">Elevation: '+(a.elevation||'—')+' ft • Source: '+(a.source||'Local')+' • Updated: '+(a.updated||'verify current')+'</span>'
  + '</div>'
  + '<div class="result"><h3>Runways</h3>'+runwayHtml(a)+'</div>'
  + '<h3>Frequencies</h3>'
  + frequencyHtml(a)
  + aircraftHtml()
  + reminderHtml()
  + '<p class="small">Reference only. Verify airport, runway, frequency, weather, NOTAM, POH/W&B, instructor, and school procedure information with ForeFlight, FAA/current sources, and official documents before flight.</p>';
}

export function initBriefing(context){
 ctx=context;
 var select=ctx.el('briefAirportSelect');
 var notes=ctx.el('briefStudentNotes');
 if(select)select.onchange=function(){currentCode=this.value;localStorage.jp_briefAirport=currentCode;renderSelectedBriefing()};
 if(notes)notes.addEventListener('input',function(){saveNote(currentCode,this.value)});
 renderBriefing();
}
