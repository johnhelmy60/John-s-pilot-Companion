// Performance dataset contract. No numerical POH data belongs here until it has
// been transcribed, independently checked, and approved for the exact model.
export const performanceDatasetSchema={
 schemaVersion:1,
 aircraftIdentity:{manufacturer:'',model:'',modelCode:'',year:null,serialApplicability:'',engine:'',propeller:''},
 source:{documentTitle:'',revision:'',revisionDate:'',pages:[],verifiedBy:'',verifiedAt:'',checksum:''},
 limitations:{weightLb:null,pressureAltitudeFt:null,temperatureC:null,windKt:null,runwaySurface:[],flapSettings:[]},
 configurations:[],
 charts:{takeoff:[],landing:[],climb:[]},
 interpolation:{method:'bounded-linear',extrapolationAllowed:false},
 assumptions:[]
};

// Exact model code detected in the current default aircraft profile. This is a
// manifest entry only; it deliberately contains no chart values.
export const performanceDatasetManifests={
 'PA-28-161':{
  schemaVersion:1,
  status:'awaiting_verified_poh',
  aircraftIdentity:{manufacturer:'Piper',model:'',modelCode:'PA-28-161',year:null,serialApplicability:'',engine:'',propeller:''},
  source:{documentTitle:'',revision:'',revisionDate:'',pages:[],verifiedBy:'',verifiedAt:'',checksum:''},
  limitations:{weightLb:null,pressureAltitudeFt:null,temperatureC:null,windKt:null,runwaySurface:[],flapSettings:[]},
  charts:{takeoff:[],landing:[],climb:[]},
  interpolation:{method:'bounded-linear',extrapolationAllowed:false},
  assumptions:[],
  warnings:['Verified POH/AFM performance tables have not been supplied.','Serial, engine, propeller, revision and page applicability are not verified.']
 }
};

var approvedDatasets=[];
function normalized(value){return String(value||'').trim().toUpperCase()}

export async function loadPerformanceCatalog(){
 try{
  var response=await fetch('./data/performance/catalog.json',{cache:'no-cache'});if(!response.ok)throw new Error('catalog unavailable');
  var catalog=await response.json(),entries=Array.isArray(catalog.datasets)?catalog.datasets:[];
  approvedDatasets=(await Promise.all(entries.map(function(entry){return fetch(entry.path,{cache:'no-cache'}).then(function(result){if(!result.ok)throw new Error('dataset unavailable');return result.json()}).catch(function(){return null})}))).filter(Boolean);
 }catch(error){approvedDatasets=[]}
 return approvedDatasets;
}

export function datasetForAircraft(aircraft){
 var code=normalized(aircraft&&aircraft.type),year=Number(aircraft&&aircraft.year),engine=normalized(aircraft&&aircraft.engine),propeller=normalized(aircraft&&aircraft.propeller);
 var exact=approvedDatasets.find(function(dataset){var identity=dataset.aircraftIdentity||{};return normalized(identity.modelCode)===code&&Number(identity.year)===year&&normalized(identity.engine)===engine&&normalized(identity.propeller)===propeller});
 return exact||performanceDatasetManifests[code]||null;
}

export function datasetReady(dataset){
 return !!(dataset&&dataset.status==='approved'&&dataset.source&&dataset.source.revision&&dataset.source.approvedBy&&dataset.source.approvedAt&&dataset.charts&&dataset.charts.takeoff.length&&dataset.charts.landing.length&&dataset.charts.climb.length&&dataset.interpolation&&dataset.interpolation.extrapolationAllowed===false);
}
