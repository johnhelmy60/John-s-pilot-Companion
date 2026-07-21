import { ac } from './aircraft.js';
import { getWbSnapshot } from './wb.js';
import { datasetForAircraft, datasetReady } from './performance-datasets.js';

var ctx=null,currentStep=0,host=null;
var steps=[
 {title:'Aircraft identity',why:'Exact identity prevents performance data from being applied to the wrong airframe or production variant.',fields:[['registration','Registration','text'],['manufacturer','Manufacturer','text'],['exactModel','Exact model / variant','text'],['modelYear','Model year','number'],['serialNumber','Serial number','text']]},
 {title:'Configuration',why:'Engine, propeller and landing-gear configuration can change every published performance result.',fields:[['engineModel','Engine model','text'],['horsepower','Horsepower','number'],['propellerModel','Propeller model / type','text'],['gearType','Landing gear','select',['Fixed','Retractable']]]},
 {title:'Fuel system',why:'Fuel capacity and density connect W&B loading to fuel-consumed landing-weight calculations.',fields:[['fuelType','Fuel type','select',['100LL','UL94','Jet A','Other']],['fuelDensity','Fuel density (lb/gal)','number'],['tankCount','Number of tanks','number'],['usablePerTank','Usable fuel per tank (gal)','number'],['totalUsableFuel','Total usable fuel (gal)','number'],['cruiseFuelBurn','Cruise fuel-burn rate (GPH)','number']]},
 {title:'POH information',why:'Source identity, revision and applicability must remain attached to every digitized performance point.',fields:[['pohFile','Upload POH PDF','file'],['pohTitle','POH title','text'],['revisionDate','Publication / revision date','date'],['applicableSerialRange','Applicable serial-number range','text']]},
 {title:'Performance configuration',why:'Chart applicability depends on exact flap, runway-surface and source-page selections.',fields:[['takeoffFlaps','Takeoff flap settings','text'],['landingFlaps','Landing flap settings','text'],['runwaySurfaces','Runway-surface options','text'],['chartPages','Performance chart pages','text']]},
 {title:'Verification',why:'Every structured value must be reviewed before a developer can submit it for administrator approval.',fields:[]}
];

function e(id){return ctx.el(id)}
function storageKey(){return 'jp_performanceSetup_'+String((ac()||{}).id||'unknown')}
function saved(){try{return JSON.parse(localStorage.getItem(storageKey())||'null')||{status:'unverified',values:{},confirmed:{},file:null}}catch(error){return {status:'unverified',values:{},confirmed:{},file:null}}}
function write(data){localStorage.setItem(storageKey(),JSON.stringify(data))}
function prefill(data){
 var aircraft=ac()||{};data.values=Object.assign({registration:aircraft.n||'',manufacturer:aircraft.manufacturer||'',exactModel:aircraft.type||'',modelYear:aircraft.year||'',serialNumber:aircraft.serialNumber||aircraft.serialApplicability||'',engineModel:aircraft.engine||'',propellerModel:aircraft.propeller||'',fuelDensity:aircraft.fuelPpg||'',cruiseFuelBurn:aircraft.fuelBurn||''},data.values||{});return data;
}
function inputFor(field,data){
 var wrap=document.createElement('div'),label=document.createElement('label'),input;
 label.htmlFor='perfSetup_'+field[0];label.textContent=field[1];wrap.appendChild(label);
 if(field[2]==='select'){input=document.createElement('select');var blank=document.createElement('option');blank.value='';blank.textContent='Select';input.appendChild(blank);field[3].forEach(function(value){var option=document.createElement('option');option.value=value;option.textContent=value;input.appendChild(option)})}else{input=document.createElement('input');input.type=field[2];if(field[2]==='number'){input.step='any';input.min='0'}}
 input.id='perfSetup_'+field[0];input.dataset.field=field[0];
 if(field[2]==='file'){input.accept='application/pdf,.pdf';input.addEventListener('change',function(){var file=input.files&&input.files[0],next=saved();if(!file){next.file=null}else if(file.type!=='application/pdf'&&!/\.pdf$/i.test(file.name)){input.value='';alert('Select a PDF file.');return}else{next.file={name:file.name,size:file.size,lastModified:file.lastModified};next.status='unverified'}write(next);render()})}else{input.value=data.values[field[0]]||'';input.addEventListener('input',function(){var next=saved();next.values[field[0]]=input.value;next.confirmed={};next.status='unverified';write(next);updateProgress()})}
 wrap.appendChild(input);
 var help=document.createElement('div');help.className='small';help.textContent=field[2]==='file'?'The browser records filename metadata only. The PDF is not parsed, uploaded, or treated as verified data.':'Required for exact-aircraft applicability and source traceability.';wrap.appendChild(help);return wrap;
}
function renderReview(data,panel){
 var warning=document.createElement('div');warning.className='result';warning.innerHTML='<b>Structured review only</b><div class="small">No chart values are extracted from the PDF. Confirming these entries does not approve performance data or unlock calculations.</div>';panel.appendChild(warning);
 var list=document.createElement('div');list.className='result';
 var entries=[];steps.slice(0,5).forEach(function(step){step.fields.forEach(function(field){entries.push([field[0],field[1],field[2]==='file'?(data.file?data.file.name:''):data.values[field[0]]])})});
 entries.forEach(function(entry){var row=document.createElement('div');row.className='checkRow';var check=document.createElement('input');check.type='checkbox';check.id='perfSetupConfirm_'+entry[0];check.checked=!!data.confirmed[entry[0]];check.disabled=!String(entry[2]||'').trim();check.addEventListener('change',function(){var next=saved();next.confirmed[entry[0]]=check.checked;next.status='unverified';write(next);updateProgress()});var label=document.createElement('label');label.htmlFor=check.id;label.textContent=entry[1]+': '+(entry[2]||'Missing');row.appendChild(check);row.appendChild(label);list.appendChild(row)});panel.appendChild(list);
 var saveButton=document.createElement('button');saveButton.type='button';saveButton.className='btn';saveButton.textContent='Save Unverified Setup Draft';saveButton.onclick=function(){var next=saved(),allComplete=entries.every(function(entry){return String(entry[2]||'').trim()&&next.confirmed[entry[0]]});if(!allComplete){alert('Complete and confirm every value before saving the review draft.');return}next.status='unverified';next.reviewedAt=new Date().toISOString();write(next);render()};panel.appendChild(saveButton);
}
function updateProgress(){
 if(!host)return;var data=prefill(saved()),fields=steps.slice(0,5).reduce(function(all,step){return all.concat(step.fields)},[]),complete=fields.filter(function(field){return field[2]==='file'?!!data.file:!!String(data.values[field[0]]||'').trim()}).length,percent=Math.round(complete/fields.length*100),progress=host.querySelector('#perfSetupProgress');if(progress){progress.value=percent;progress.textContent=percent+'%'}var text=host.querySelector('#perfSetupProgressText');if(text)text.textContent=complete+' of '+fields.length+' required values entered ('+percent+'%).';
}
function showStep(index){currentStep=Math.max(0,Math.min(steps.length-1,index));render()}
function render(){
 if(!host)return;var data=prefill(saved()),dataset=datasetForAircraft(ac()),approved=datasetReady(dataset);host.innerHTML='';
 var title=document.createElement('h3');title.textContent='Performance Setup';host.appendChild(title);
 var status=document.createElement('div');status.className='pill '+(approved?'good':'bad');status.textContent=approved?'Administrator-approved structured dataset available':'UNVERIFIED — administrator approval required';host.appendChild(status);
 var progress=document.createElement('progress');progress.id='perfSetupProgress';progress.max=100;progress.value=0;progress.setAttribute('aria-label','Performance setup progress');host.appendChild(progress);var progressText=document.createElement('div');progressText.id='perfSetupProgressText';progressText.className='small';host.appendChild(progressText);
 var stepNav=document.createElement('div');stepNav.className='workflowSteps';steps.forEach(function(step,index){var button=document.createElement('button');button.type='button';button.className='workflowStep';button.textContent=(index+1)+' '+step.title;button.setAttribute('aria-current',index===currentStep?'step':'false');button.onclick=function(){showStep(index)};stepNav.appendChild(button)});host.appendChild(stepNav);
 var panel=document.createElement('section');panel.className='result';var heading=document.createElement('h4');heading.textContent=(currentStep+1)+' — '+steps[currentStep].title;panel.appendChild(heading);var why=document.createElement('p');why.className='small';why.textContent=steps[currentStep].why;panel.appendChild(why);
 if(currentStep<5){var grid=document.createElement('div');grid.className='grid';steps[currentStep].fields.forEach(function(field){grid.appendChild(inputFor(field,data))});panel.appendChild(grid);if(currentStep===0){var wb=getWbSnapshot(),reference=document.createElement('p');reference.className='small';reference.textContent=wb?'Current W&B reference: '+wb.totalWeightLb+' lb, '+wb.fuelGallons+' gal, CG '+wb.cgArmIn+' in. This reference is not copied into POH performance data.':'Current W&B snapshot is unavailable.';panel.appendChild(reference)}}else renderReview(data,panel);
 var controls=document.createElement('div');controls.className='grid';if(currentStep>0){var back=document.createElement('button');back.type='button';back.className='btn btn2';back.textContent='Previous';back.onclick=function(){showStep(currentStep-1)};controls.appendChild(back)}if(currentStep<steps.length-1){var next=document.createElement('button');next.type='button';next.className='btn';next.textContent='Next';next.onclick=function(){showStep(currentStep+1)};controls.appendChild(next)}panel.appendChild(controls);host.appendChild(panel);
 updateProgress();
}
export function renderPerformanceSetup(){render()}
export function initPerformanceSetup(context){ctx=context;var aircraftSection=e('aircraft');host=document.createElement('div');host.id='performanceSetup';host.className='result';aircraftSection.appendChild(host);e('aircraftSelect').addEventListener('change',function(){currentStep=0;render()});render()}
