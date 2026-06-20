import { ac } from './aircraft.js';
import { airportRecord } from './airports.js';
import { getRoute } from './frequencies.js';

var ctx=null;

var fields=[
 'ffFacilityPreset','ffFacilityCustom','ffCallsign','ffAircraftType','ffPosition','ffAltitude','ffDestination','ffSquawk',
 'ffAltitudeInstruction','ffAssignedAltitude','ffAltimeter','ffNextFacility','ffFrequency','ffTermination'
];

function e(id){return ctx.el(id)}
function v(id){var node=e(id);return node?(node.value||'').trim():''}

function save(){
 fields.forEach(function(id){if(e(id))localStorage['jp_'+id]=e(id).value});
}

function load(){
 fields.forEach(function(id){var saved=localStorage['jp_'+id];if(saved!=null&&e(id))e(id).value=saved});
}

function sentence(parts){
 return parts.filter(Boolean).join(', ')+'.';
}

function routeAirports(){
 try{return getRoute().slice()}catch(e){return []}
}

function airportName(code){
 var a=airportRecord(code);
 return (a&&a.name)||code||'';
}

function defaultCallsign(){
 var aircraft=ac();
 return aircraft&&aircraft.n?aircraft.n:'Warrior 41498';
}

function defaultAircraftType(){
 var aircraft=ac();
 if(aircraft&&aircraft.type){
  if(aircraft.type.indexOf('PA-28')>=0)return 'PA-28';
  if(aircraft.type.indexOf('172')>=0)return 'C172';
  return aircraft.type;
 }
 return 'PA-28';
}

function defaultDestination(){
 var route=routeAirports();
 if(route.length>1)return route[route.length-1];
 return '';
}

function defaultPosition(){
 var route=routeAirports();
 if(route.length)return '3 miles north of '+airportName(route[0]);
 return '3 miles north of departure airport';
}

function facility(){
 var preset=v('ffFacilityPreset');
 return preset==='custom'?(v('ffFacilityCustom')||'Approach'):preset;
}

function fillDefaults(){
 if(e('ffCallsign')&&!v('ffCallsign'))e('ffCallsign').value=defaultCallsign();
 if(e('ffAircraftType')&&!v('ffAircraftType'))e('ffAircraftType').value=defaultAircraftType();
 if(e('ffPosition')&&!v('ffPosition'))e('ffPosition').value=defaultPosition();
 if(e('ffDestination')&&!v('ffDestination'))e('ffDestination').value=defaultDestination();
}

function matchingFreqs(){
 var out=[];
 routeAirports().forEach(function(code){
  var a=airportRecord(code);
  ((a&&a.freqs)||[]).forEach(function(f){
   var label=((f[0]||'')+' '+(f[1]||'')).toUpperCase();
   if(label.indexOf('APP')>=0||label.indexOf('DEP')>=0||label.indexOf('CENTER')>=0||label.indexOf('CTR')>=0||f[2]==='ff'){
    out.push({code:code,label:f[0],freq:f[1]});
   }
  });
 });
 return out;
}

function renderSuggestions(){
 var box=e('ffFreqSuggestions');
 if(!box)return;
 var freqs=matchingFreqs();
 if(!freqs.length){box.innerHTML='<span class="small">No approach/departure/center frequencies found in the selected airports. Add airports from the Frequency page or save frequencies on the Airport page.</span>';return}
 box.innerHTML='';
 freqs.forEach(function(f){
  var b=document.createElement('button');
  b.className='bubble';
  b.textContent=f.code+' '+f.label+' '+f.freq;
  b.onclick=function(){
   if(e('ffFrequency'))e('ffFrequency').value=f.freq;
   if(e('ffNextFacility')&&!v('ffNextFacility'))e('ffNextFacility').value=f.label;
   render();
  };
  box.appendChild(b);
 });
}

function requestText(){
 var dest=v('ffDestination');
 var destName=dest?airportName(dest):'destination';
 return sentence([facility(),v('ffCallsign')||defaultCallsign(),v('ffAircraftType')||defaultAircraftType(),v('ffPosition')||defaultPosition(),v('ffAltitude')?v('ffAltitude'):'6,500',dest?'VFR to '+destName:'VFR to destination','request flight following']);
}

function squawkText(){
 return sentence([v('ffSquawk')?'Squawk '+v('ffSquawk'):'Squawk assigned code',v('ffCallsign')||defaultCallsign()]);
}

function altitudeText(){
 var instr=v('ffAltitudeInstruction');
 var alt=v('ffAssignedAltitude');
 var phrase='Maintain VFR';
 if(instr==='below'&&alt)phrase+=' at or below '+alt;
 if(instr==='above'&&alt)phrase+=' at or above '+alt;
 if(v('ffAltimeter'))phrase+=' altimeter '+v('ffAltimeter');
 return sentence([phrase,v('ffCallsign')||defaultCallsign()]);
}

function handoffText(){
 return sentence(['Contact '+(v('ffNextFacility')||'next facility')+(v('ffFrequency')?' '+v('ffFrequency'):''),v('ffCallsign')||defaultCallsign()]);
}

function terminationText(){
 var type=v('ffTermination');
 if(type==='terminated')return sentence(['Radar service terminated','squawk VFR','frequency change approved',v('ffCallsign')||defaultCallsign()]);
 if(type==='approved')return sentence(['Frequency change approved',v('ffCallsign')||defaultCallsign()]);
 return sentence([v('ffCallsign')||defaultCallsign(),'cancel flight following']);
}

function setOut(id,text){
 if(e(id))e(id).innerHTML=text;
}

function render(){
 fillDefaults();
 renderSuggestions();
 setOut('ffInitialOut',requestText());
 setOut('ffSquawkOut',squawkText());
 setOut('ffAltitudeOut',altitudeText());
 setOut('ffHandoffOut',handoffText());
 setOut('ffTerminationOut',terminationText());
 var route=routeAirports();
 setOut('ffRouteHint',route.length?'Using selected airports from Frequency page: '+route.join(' -> '):'No selected airports selected yet. Add airports from the Frequency page.');
 save();
}

export function renderFlightFollowing(){
 if(ctx)render();
}

export function initFlightFollowing(context){
 ctx=context;
 load();
 if(e('ffFacilityPreset')&&!v('ffFacilityPreset'))e('ffFacilityPreset').value='Denver Approach';
 if(e('ffAltitudeInstruction')&&!v('ffAltitudeInstruction'))e('ffAltitudeInstruction').value='vfr';
 if(e('ffTermination')&&!v('ffTermination'))e('ffTermination').value='cancel';
 fields.forEach(function(id){
  if(e(id)){
   e(id).addEventListener('input',render);
   e(id).addEventListener('change',render);
  }
 });
 if(e('ffRefreshDefaults'))e('ffRefreshDefaults').onclick=function(){
  ['ffCallsign','ffAircraftType','ffPosition','ffDestination'].forEach(function(id){if(e(id))e(id).value=''});
  fillDefaults();
  render();
 };
 render();
}
