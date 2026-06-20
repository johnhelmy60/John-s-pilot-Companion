var ctx=null;
var renderAirportsCallback=function(){};

// Local database. Items marked "verify current" should be checked in ForeFlight/current FAA data before use.
export var builtInAirports={
'KBJC':{code:'KBJC',name:'Rocky Mountain Metro',elevation:'5673',runways:[],updated:'local v2.2',source:'Local',freqs:[['ATIS','126.25','vfr'],['Clearance Delivery','132.6','ifr'],['Ground','121.7','vfr'],['Tower','118.6','vfr'],['Tower Secondary','123.95','vfr'],['CTAF','118.6','vfr'],['Denver Approach','125.125','ff'],['Denver Departure','125.125','ff'],['Flight Service','122.2','vfr']]},
'KFMM':{code:'KFMM',name:'Fort Morgan Municipal',elevation:'4569',runways:[],updated:'local v2.2',source:'Local',freqs:[['AWOS-3PT','132.95','vfr'],['CTAF/UNICOM','123.05','vfr'],['Denver Center','118.475','ff'],['Flight Service','122.2','vfr'],['Flight Service','122.5','vfr']]},
'KAKO':{code:'KAKO',name:'Colorado Plains Regional',elevation:'4714',runways:[],updated:'local v2.2',source:'Local',freqs:[['ASOS','135.475','vfr'],['CTAF/UNICOM','122.8','vfr'],['Denver Center','133.95','ff'],['Flight Service','122.2','vfr']]},
'KBDU':{code:'KBDU',name:'Boulder Municipal',elevation:'5288',runways:[],updated:'local v2.2',source:'Local',freqs:[['AWOS','120.775','vfr'],['CTAF','122.975','vfr'],['Denver Approach/Departure','verify current','ff']]},
'KLMO':{code:'KLMO',name:'Vance Brand / Longmont',elevation:'5055',runways:[],updated:'local v2.2',source:'Local',freqs:[['AWOS','118.925','vfr'],['CTAF','122.975','vfr'],['Denver Approach/Departure','verify current','ff']]},
'KEIK':{code:'KEIK',name:'Erie Municipal',elevation:'5130',runways:[],updated:'local v2.2',source:'Local',freqs:[['AWOS','120.725','vfr'],['CTAF','123.0','vfr'],['Denver Approach/Departure','verify current','ff']]},
'KAPA':{code:'KAPA',name:'Centennial',elevation:'5885',runways:[],updated:'local v2.2',source:'Local',freqs:[['ATIS','120.3','vfr'],['Ground','121.85','vfr'],['Tower','118.9','vfr'],['Tower Secondary','123.7','vfr'],['Denver Approach/Departure','verify current','ff'],['Clearance','verify current','ifr']]},
'KFNL':{code:'KFNL',name:'Northern Colorado Regional',elevation:'5016',runways:[],updated:'local v2.2',source:'Local',freqs:[['ATIS','128.425','vfr'],['Ground','121.65','vfr'],['Tower/CTAF','118.4','vfr'],['Denver Approach/Departure','verify current','ff']]},
'KCFO':{code:'KCFO',name:'Colorado Air and Space Port',elevation:'5515',runways:[],updated:'local v2.2',source:'Local',freqs:[['AWOS','119.025','vfr'],['CTAF','123.0','vfr'],['Denver Approach/Departure','verify current','ff']]},
'KFTG':{code:'KFTG',name:'Front Range',elevation:'5512',runways:[],updated:'local v2.2',source:'Local',freqs:[['AWOS','119.025','vfr'],['CTAF','122.7','vfr'],['Denver Approach/Departure','verify current','ff']]},
'KDEN':{code:'KDEN',name:'Denver International',elevation:'5431',runways:[],updated:'local v2.2',source:'Local',freqs:[['ATIS','verify current','vfr'],['Ground','verify current','vfr'],['Tower','verify current','vfr'],['Denver Approach/Departure','verify current','ff'],['Clearance Delivery','verify current','ifr']]},
'KCOS':{code:'KCOS',name:'Colorado Springs',elevation:'6187',runways:[],updated:'local v2.2',source:'Local',freqs:[['ATIS','124.3','vfr'],['Ground','121.7','vfr'],['Tower','119.9','vfr'],['Colorado Springs Approach/Departure','verify current','ff'],['Clearance','verify current','ifr']]},
'KPUB':{code:'KPUB',name:'Pueblo Memorial',elevation:'4726',runways:[],updated:'local v2.2',source:'Local',freqs:[['ATIS','125.7','vfr'],['Ground','121.9','vfr'],['Tower','119.1','vfr'],['Pueblo Approach/Departure','verify current','ff'],['Clearance','verify current','ifr']]},
'KASE':{code:'KASE',name:'Aspen/Pitkin County',elevation:'7820',runways:[],updated:'local v2.2',source:'Local',freqs:[['ATIS/AWOS','verify current','vfr'],['Tower/CTAF','verify current','vfr'],['Ground','verify current','vfr'],['Approach/Departure','verify current','ff'],['Clearance','verify current','ifr']]},
'KEGE':{code:'KEGE',name:'Eagle County Regional',elevation:'6548',runways:[],updated:'local v2.2',source:'Local',freqs:[['ATIS/AWOS','verify current','vfr'],['Tower/CTAF','verify current','vfr'],['Ground','verify current','vfr'],['Approach/Departure','verify current','ff'],['Clearance','verify current','ifr']]},
'KGJT':{code:'KGJT',name:'Grand Junction Regional',elevation:'4858',runways:[],updated:'local v2.2',source:'Local',freqs:[['ATIS/AWOS','verify current','vfr'],['Ground','verify current','vfr'],['Tower','verify current','vfr'],['Approach/Departure','verify current','ff'],['Clearance','verify current','ifr']]}
};

var externalAirportDb = null;
var externalDbLoading = null;

export function normalizeCode(code){code=(code||'').trim().toUpperCase(); if(code.length==3&&/^[A-Z]{3}$/.test(code))code='K'+code; return code}

function mapExternalMode(freq){
  var t=((freq.type||'')+' '+(freq.description||'')).toUpperCase();
  if(freq.mode){return freq.mode;}
  if(t.includes('APP')||t.includes('DEP')||t.includes('CENTER')||t.includes('CTR'))return 'ff';
  if(t.includes('CLD')||t.includes('CLEARANCE')||t.includes('DELIVERY'))return 'ifr';
  return 'vfr';
}

function normalizeExternalAirport(raw){
  if(!raw)return null;
  var code=(raw.ident||raw.code||raw.gps_code||raw.local_code||'').toUpperCase();
  if(!code)return null;
  var freqs=(raw.frequencies||[]).map(function(f){
    return [
      f.type || f.description || 'Frequency',
      f.mhz || f.frequency_mhz || f.frequency || '',
      mapExternalMode(f)
    ];
  }).filter(function(f){return f[1]});
  var runways=(raw.runways||[]).map(function(r){
    var ident = r.ident || ((r.le_ident||'') + (r.he_ident?('/'+r.he_ident):'')) || '';
    var bits = [];
    if(ident) bits.push(ident);
    if(r.length_ft) bits.push(r.length_ft + ' ft');
    if(r.width_ft) bits.push('x ' + r.width_ft);
    if(r.surface) bits.push(r.surface);
    if(String(r.closed)==='1') bits.push('CLOSED');
    return bits.join(' • ');
  }).filter(Boolean);
  return {code:code,name:raw.name||code,elevation:raw.elevation_ft||'',runways:runways,updated:'JSON database v3',source:'JSON',freqs:freqs};
}

async function loadExternalDb(){
  if(externalAirportDb)return externalAirportDb;
  if(externalDbLoading)return externalDbLoading;
  externalDbLoading = Promise.all([
    fetch('./data/airport_database_A_M.json?v=3', {cache:'reload'}).then(function(r){if(!r.ok)throw new Error('A-M database missing'); return r.json();}),
    fetch('./data/airport_database_N_Z.json?v=3', {cache:'reload'}).then(function(r){if(!r.ok)throw new Error('N-Z database missing'); return r.json();})
  ]).then(function(parts){
    var all={};
    parts.forEach(function(p){
      var airports=p.airports||{};
      Object.keys(airports).forEach(function(k){all[k.toUpperCase()]=airports[k]});
    });
    externalAirportDb=all;
    return externalAirportDb;
  });
  return externalDbLoading;
}

async function findExternalAirport(code){
  var db=await loadExternalDb();
  code=normalizeCode(code);
  if(db[code])return normalizeExternalAirport(db[code]);
  var keys=Object.keys(db);
  for(var i=0;i<keys.length;i++){
    var a=db[keys[i]];
    if(((a.local_code||'').toUpperCase()===code) || ((a.gps_code||'').toUpperCase()===code) || ((a.iata_code||'').toUpperCase()===code)){
      return normalizeExternalAirport(a);
    }
  }
  return null;
}

export function getSavedAirports(){
 try{var x=JSON.parse(localStorage.jp_savedAirports||'null'); if(x)return x}catch(e){}
 var start={}; Object.keys(builtInAirports).forEach(function(k){start[k]=ctx.clone(builtInAirports[k])}); localStorage.jp_savedAirports=JSON.stringify(start); return start;
}
export function saveSavedAirports(obj){localStorage.jp_savedAirports=JSON.stringify(obj)}
export function airportCodes(){return Object.keys(getSavedAirports()).sort()}
export function airportRecord(code){return getSavedAirports()[code]||builtInAirports[code]}

export async function searchAirport(){
 var el=ctx.el,pill=ctx.pill,code=normalizeCode(el('airportSearch').value);
 if(!code){el('airportSearchResult').innerHTML='Enter an airport code.';return}
 var saved=getSavedAirports();
 el('airportSearchResult').innerHTML='Searching JSON database for '+code+'...';
 try{
   var rec=await findExternalAirport(code);
   if(rec){
     saved[rec.code]=rec;
     saveSavedAirports(saved);
     el('airportSearchResult').innerHTML='<b>'+rec.code+'</b><br>'+rec.name+'<br>Elevation: '+(rec.elevation||'—')+' ft<br>Frequencies: '+rec.freqs.length+'<br>Runways: '+rec.runways.length+'<br>'+pill('Refreshed from JSON database','good');
     renderMyAirports(); renderAirportsCallback(); return;
   }
 }catch(e){}
 if(saved[code]){
   el('airportSearchResult').innerHTML='<b>'+code+'</b><br>'+saved[code].name+'<br>'+pill('Using saved local copy','warn')+'<br><span class="small">JSON refresh failed or airport not found in JSON.</span>';
   renderMyAirports(); renderAirportsCallback(); return;
 }
 if(builtInAirports[code]){
   saved[code]=ctx.clone(builtInAirports[code]);
   saved[code].updated='built-in backup v2.4.1';
   saveSavedAirports(saved);
   el('airportSearchResult').innerHTML='<b>'+code+'</b><br>'+saved[code].name+'<br>Elevation: '+(saved[code].elevation||'—')+' ft<br>Frequencies: '+saved[code].freqs.length+'<br>'+pill('Loaded from built-in backup','warn');
   renderMyAirports(); renderAirportsCallback(); return;
 }
 el('airportSearchResult').innerHTML=pill('Not found','warn')+' Airport not found. Add it as a custom airport below.';
 renderMyAirports(); renderAirportsCallback();
}

export async function refreshRouteAirports(route){
 if(!route.length){alert('No selected airports to refresh. Add airports from the Frequency page.');return}
 var saved=getSavedAirports(),updated=0,failed=0;
 for(var i=0;i<route.length;i++){
   try{var rec=await findExternalAirport(route[i]); if(rec){saved[rec.code]=rec;updated++;} else failed++;}catch(e){failed++;}
 }
 saveSavedAirports(saved);
 renderMyAirports();
 renderAirportsCallback();
 alert('Refreshed '+updated+' selected airport(s). Failed: '+failed+'.');
}

export function addCustomAirport(){
 var el=ctx.el,pill=ctx.pill,code=normalizeCode(el('customCode').value),name=el('customName').value.trim(),elev=el('customElev').value.trim();
 if(!code||!name){alert('Enter airport ID and name.');return}
 var saved=getSavedAirports();
 saved[code]={code:code,name:name,elevation:elev,runways:[],updated:ctx.today(),source:'Custom',freqs:[]};
 saveSavedAirports(saved);
 el('airportSearchResult').innerHTML='<b>'+code+'</b><br>'+name+'<br>'+pill('Custom airport added','good');
 renderMyAirports(); renderAirportsCallback();
}

export function addFrequency(){
 var el=ctx.el,code=normalizeCode(el('freqCode').value),label=el('freqLabel').value.trim(),val=el('freqValue').value.trim(),mode=el('freqModeAdd').value;
 if(!code||!label||!val){alert('Enter airport, label, and frequency.');return}
 var saved=getSavedAirports();
 if(!saved[code]){alert('Add/save the airport first.');return}
 saved[code].freqs.push([label,val,mode]);
 saved[code].updated=ctx.today();
 saveSavedAirports(saved);
 el('freqLabel').value=''; el('freqValue').value='';
 renderMyAirports(); renderAirportsCallback();
}

export function removeAirport(code){
 if(!confirm('Remove '+code+' from My Airports? You can add it again later from Airport Search.'))return;
 var saved=getSavedAirports(); delete saved[code]; saveSavedAirports(saved);
 if(ctx.onAirportRemoved)ctx.onAirportRemoved(code);
 renderMyAirports(); renderAirportsCallback();
}

export function removeFreq(code, idx){
 var saved=getSavedAirports(); if(!saved[code])return;
 saved[code].freqs.splice(idx,1); saved[code].updated=ctx.today(); saveSavedAirports(saved); renderMyAirports(); renderAirportsCallback();
}

export function renderMyAirports(){
 var el=ctx.el,pill=ctx.pill,box=el('myAirportsList'); if(!box)return;
 var saved=getSavedAirports(), codes=Object.keys(saved).sort();
 if(!codes.length){box.innerHTML='<div class="small">No saved airports yet.</div>';return}
 box.innerHTML='';
 codes.forEach(function(code){
  var a=saved[code], d=document.createElement('div'); d.className='freqGroup';
  var status=(a.source=='Custom')?pill('Custom','bluepill'):pill(a.updated||'Local','good');
  d.innerHTML='<h3>'+code+'</h3><b>'+((a&&a.name)||'')+'</b><br><span class="small">Elevation: '+(a.elevation||'—')+' ft • Frequencies: '+((a.freqs||[]).length)+'</span><br>'+status;
  (a.freqs||[]).forEach(function(f,idx){
    var row=document.createElement('button'); row.className='freqBtn'; row.innerHTML='<span>'+f[0]+'</span> '+f[1]+' <span>('+f[2]+')</span> ×';
    row.onclick=function(){removeFreq(code,idx)}; d.appendChild(row);
  });
  var del=document.createElement('button'); del.className='btn btn2'; del.textContent='Remove '+code; del.onclick=function(){removeAirport(code)};
  d.appendChild(del); box.appendChild(d);
 });
}

export function initAirports(context){
 ctx=context;
 renderAirportsCallback=ctx.renderAirports||function(){};
 getSavedAirports();
 ctx.el('searchAirportBtn').onclick=searchAirport;
 ctx.el('addCustomAirportBtn').onclick=addCustomAirport;
 ctx.el('addFrequencyBtn').onclick=addFrequency;
 renderMyAirports();
}
