// Performance dataset contract. No numerical POH data belongs here until it has
// been transcribed, independently checked, and approved for the exact model.
export const performanceDatasetSchema={
 schemaVersion:1,
 aircraftIdentity:{manufacturer:'',model:'',modelCode:'',serialApplicability:'',engine:'',propeller:''},
 source:{documentTitle:'',revision:'',revisionDate:'',pages:[],verifiedBy:'',verifiedAt:'',checksum:''},
 limitations:{weightLb:null,pressureAltitudeFt:null,temperatureC:null,windKt:null,runwaySurface:[],flapSettings:[]},
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
  aircraftIdentity:{manufacturer:'Piper',model:'',modelCode:'PA-28-161',serialApplicability:'',engine:'',propeller:''},
  source:{documentTitle:'',revision:'',revisionDate:'',pages:[],verifiedBy:'',verifiedAt:'',checksum:''},
  limitations:{weightLb:null,pressureAltitudeFt:null,temperatureC:null,windKt:null,runwaySurface:[],flapSettings:[]},
  charts:{takeoff:[],landing:[],climb:[]},
  interpolation:{method:'bounded-linear',extrapolationAllowed:false},
  assumptions:[],
  warnings:['Verified POH/AFM performance tables have not been supplied.','Serial, engine, propeller, revision and page applicability are not verified.']
 }
};

export function datasetForAircraft(aircraft){
 var code=String((aircraft&&aircraft.type)||'').trim().toUpperCase();
 return performanceDatasetManifests[code]||null;
}

export function datasetReady(dataset){
 return !!(dataset&&dataset.status==='verified'&&dataset.source.revision&&dataset.source.pages.length&&dataset.charts.takeoff.length&&dataset.charts.landing.length&&dataset.charts.climb.length);
}
