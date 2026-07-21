import { METAR_PROXY_URL } from './config.js';

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
 if(!/^https:\/\//i.test(METAR_PROXY_URL))throw Object.assign(new Error('Weather proxy is not configured with a full HTTPS URL.'),{weather:previous,httpStatus:0,proxyHostname:'not configured'});
 var proxyUrl=new URL(METAR_PROXY_URL);proxyUrl.searchParams.set('icao',code);
 try{
  var response=await fetch(proxyUrl.href,{headers:{Accept:'application/json'},cache:'no-store'}),contentType=response.headers.get('content-type')||'',body=null;
  try{body=JSON.parse(await response.text())}catch(parseError){throw Object.assign(new Error('Weather proxy returned an unreadable response.'),{httpStatus:response.status,proxyHostname:proxyUrl.hostname})}
  if(!/application\/json/i.test(contentType))throw Object.assign(new Error('Weather proxy did not return application/json.'),{httpStatus:response.status,proxyHostname:proxyUrl.hostname,server:body});
  if(!response.ok||body.status!=='available')throw Object.assign(new Error(body.error||('Weather proxy returned HTTP '+response.status)),{weather:previous,server:body,httpStatus:response.status,proxyHostname:proxyUrl.hostname});
  saveMetar(code,body);return body;
 }catch(error){
  if(!error.weather)error.weather=previous;
  if(error.httpStatus==null)error.httpStatus=0;
  if(!error.proxyHostname)error.proxyHostname=proxyUrl.hostname;
  throw error;
 }
}
