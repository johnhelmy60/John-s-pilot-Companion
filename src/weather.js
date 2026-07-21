const STALE_MINUTES = 90;

function key(icao){return 'jp_metar_'+String(icao||'').toUpperCase()}
export function savedMetar(icao){try{return JSON.parse(localStorage.getItem(key(icao))||'null')}catch(error){return null}}
function saveMetar(icao,data){try{localStorage.setItem(key(icao),JSON.stringify(data))}catch(error){}}

export function weatherAge(data){
 var time=data&&data.observationTime?Date.parse(data.observationTime):NaN;
 return isFinite(time)?Math.max(0,Math.round((Date.now()-time)/60000)):null;
}

export function weatherIsStale(data){var age=weatherAge(data);return !data||data.status!=='available'||age==null||age>STALE_MINUTES||data.stale===true}

export async function fetchMetar(icao){
 var code=String(icao||'').trim().toUpperCase(),previous=savedMetar(code);
 if(!/^[A-Z][A-Z0-9]{3}$/.test(code))throw Object.assign(new Error('Select a valid four-character ICAO airport.'),{weather:previous});
 try{
  var response=await fetch('/api/metar?icao='+encodeURIComponent(code),{headers:{Accept:'application/json'},cache:'no-store'});
  var body=await response.json().catch(function(){return {status:'unavailable',error:'Weather proxy returned an unreadable response.'}});
  if(!response.ok||body.status!=='available')throw Object.assign(new Error(body.error||('Weather proxy returned HTTP '+response.status)),{weather:previous,server:body});
  saveMetar(code,body);return body;
 }catch(error){
  if(!error.weather)error.weather=previous;
  throw error;
 }
}
