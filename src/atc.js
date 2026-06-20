var ctx=null;

var fields=['atcScenario','atcCallsign','atcAirport','atcFacility','atcRunway','atcAtis','atcLocation','atcDirection','atcTaxiRoute','atcHoldShort','atcClearance','atcPattern','atcPosition','atcIntentions','atcAircraftType','atcAltitude','atcDestination','atcSquawk','atcFrequency'];

function v(id){
 var e=ctx.el(id);
 return e?(e.value||'').trim():'';
}

function label(id){
 var e=ctx.el(id);
 if(!e)return '';
 if(e.tagName==='SELECT'&&e.selectedOptions&&e.selectedOptions[0])return e.selectedOptions[0].textContent;
 return v(id);
}

function saveAtc(){
 fields.forEach(function(id){if(ctx.el(id))localStorage['jp_'+id]=ctx.el(id).value});
}

function loadAtc(){
 fields.forEach(function(id){var saved=localStorage['jp_'+id];if(saved!=null&&ctx.el(id))ctx.el(id).value=saved});
}

function sentence(parts){
 return parts.filter(Boolean).join(', ')+'.';
}

function runway(){
 return v('atcRunway')?'runway '+v('atcRunway'):'the assigned runway';
}

function callsign(){
 return v('atcCallsign')||'Warrior 41498';
}

function airport(){
 return v('atcAirport')||'the airport';
}

function facility(defaultName){
 return v('atcFacility')||defaultName;
}

function infoCode(){
 return v('atcAtis')?'information '+v('atcAtis').toUpperCase():'';
}

function renderGroundTaxi(){
 var request=sentence([facility(airport()+' Ground'),callsign()+' at '+(v('atcLocation')||'parking'),infoCode(),v('atcDirection')||v('atcDestination')?'VFR '+(v('atcDirection')||'to '+v('atcDestination')):'', 'ready to taxi']);
 var readback=sentence([runway()+(v('atcTaxiRoute')?' via '+v('atcTaxiRoute'):''),v('atcHoldShort')?'hold short '+v('atcHoldShort'):'',callsign()]);
 return {title:'Ground Taxi',request:request,readback:readback,tip:'Read back runway assignment, taxi route, and all hold-short instructions exactly.'};
}

function renderTakeoff(){
 var request=sentence([facility(airport()+' Tower'),callsign()+' holding short '+runway(),infoCode(),v('atcDirection')?'request '+v('atcDirection')+' departure':'ready for departure']);
 var clearance=label('atcClearance')||'cleared for takeoff';
 var readback=sentence([clearance+' '+runway(),v('atcDirection')||'',callsign()]);
 return {title:'Tower Takeoff',request:request,readback:readback,tip:'For takeoff, read back the runway and clearance. If told to hold short, read that back and do not cross.'};
}

function renderPattern(){
 var request=sentence([facility(airport()+' Tower'),callsign(),v('atcPosition')||'upwind',v('atcIntentions')||'request pattern work']);
 var readback=sentence([label('atcPattern')||'left closed traffic approved',runway(),callsign()]);
 return {title:'Pattern Work',request:request,readback:readback,tip:'Pattern instructions often include runway, traffic direction, sequence, and landing option.'};
}

function renderArrival(){
 var request=sentence([facility(airport()+' Tower'),callsign(),v('atcPosition')||'10 miles out',infoCode(),v('atcIntentions')||'inbound for landing']);
 var clearance=label('atcClearance')||'cleared to land';
 var readback=sentence([clearance+' '+runway(),callsign()]);
 return {title:'Arrival / Landing',request:request,readback:readback,tip:'Landing clearances require runway readback. Also read back hold-short or LAHSO instructions if issued.'};
}

function renderFlightFollowing(){
 var request=sentence([facility('Approach'),callsign(),v('atcAircraftType')||'PA-28',v('atcPosition')||'near '+airport(),v('atcAltitude')?v('atcAltitude')+' feet':'', 'request VFR flight following'+(v('atcDestination')?' to '+v('atcDestination'):'')]);
 var readback=sentence([v('atcSquawk')?'squawk '+v('atcSquawk'):'squawk assigned code',v('atcFrequency')?'over to '+v('atcFrequency'):'',callsign()]);
 return {title:'Flight Following',request:request,readback:readback,tip:'Have callsign, aircraft type, position, altitude, destination, and request ready before calling.'};
}

function renderCtaf(){
 var airportName=airport()+' traffic';
 var request=sentence([airportName,callsign(),v('atcPosition')||'10 miles out',v('atcIntentions')||'inbound for landing',runway(),airportName]);
 var readback='CTAF is not a clearance environment. Make clear position and intention announcements; there is no ATC readback unless another aircraft coordinates with you.';
 return {title:'CTAF Announcements',request:request,readback:readback,tip:'Use airport name at the beginning and end, and include position, altitude when useful, runway, and intentions.'};
}

function updateVisibility(){
 var s=v('atcScenario');
 ['atcTaxiFields','atcTowerFields','atcPatternFields','atcArrivalFields','atcFollowingFields','atcCtafFields'].forEach(function(id){if(ctx.el(id))ctx.el(id).className='hidden'});
 var map={ground:'atcTaxiFields',takeoff:'atcTowerFields',pattern:'atcPatternFields',arrival:'atcArrivalFields',following:'atcFollowingFields',ctaf:'atcCtafFields'};
 if(ctx.el(map[s]))ctx.el(map[s]).className='';
}

function renderAtc(){
 updateVisibility();
 var scenario=v('atcScenario');
 var out=scenario==='takeoff'?renderTakeoff():scenario==='pattern'?renderPattern():scenario==='arrival'?renderArrival():scenario==='following'?renderFlightFollowing():scenario==='ctaf'?renderCtaf():renderGroundTaxi();
 if(ctx.el('atcModuleTitle'))ctx.el('atcModuleTitle').innerHTML=out.title;
 if(ctx.el('atcRequestOut'))ctx.el('atcRequestOut').innerHTML=out.request;
 if(ctx.el('atcReadbackOut'))ctx.el('atcReadbackOut').innerHTML=out.readback;
 if(ctx.el('atcTipOut'))ctx.el('atcTipOut').innerHTML=out.tip;
 saveAtc();
}

function clearAtc(){
 ['atcTaxiRoute','atcHoldShort','atcSquawk','atcFrequency'].forEach(function(id){if(ctx.el(id))ctx.el(id).value=''});
 renderAtc();
}

export function initAtc(context){
 ctx=context;
 loadAtc();
 if(!v('atcScenario')&&ctx.el('atcScenario'))ctx.el('atcScenario').value='ground';
 fields.forEach(function(id){
  if(ctx.el(id)){
   ctx.el(id).addEventListener('input',renderAtc);
   ctx.el(id).addEventListener('change',renderAtc);
  }
 });
 if(ctx.el('clearAtcBtn'))ctx.el('clearAtcBtn').onclick=clearAtc;
 renderAtc();
}
