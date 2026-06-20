var n41498Envelope=[{weight:1400,forward:83,aft:93},{weight:1950,forward:83,aft:93},{weight:2325,forward:87,aft:93}];
export var defaults=[{id:'N41498',n:'N41498',type:'PA-28-161',emptyWt:1433,emptyArm:87.1,maxWt:2325,fuelPpg:6,frontArm:80.5,rearArm:118.1,bagArm:142.8,fuelArm:95,fuelBurn:9,xwLimit:17,tankInterval:60,cgEnvelope:n41498Envelope}];

var ctx=null;
var noteFields=['GeneralNotes','RentalQuirks','AvionicsNotes','FuelOilNotes','DispatchNotes','SquawkNotes'];

function addCgEnvelopeRow(point){
 var host=ctx.el('acCgEnvelopeRows');if(!host)return;
 var row=document.createElement('div');row.className='cgEnvelopeRow';
 [['Weight (lb)','weight'],['Forward CG (in)','forward'],['Aft CG (in)','aft']].forEach(function(field){
  var wrap=document.createElement('div'),label=document.createElement('label'),input=document.createElement('input');
  label.textContent=field[0];input.type='number';input.step='any';input.className='cgEnvelope'+field[1];
  if(point&&point[field[1]]!=null)input.value=point[field[1]];
  wrap.appendChild(label);wrap.appendChild(input);row.appendChild(wrap);
 });
 var remove=document.createElement('button');remove.type='button';remove.className='cgEnvelopeRemove';remove.textContent='×';remove.setAttribute('aria-label','Remove CG envelope point');
 remove.onclick=function(){row.remove();if(!host.children.length)addCgEnvelopeRow(null)};
 row.appendChild(remove);host.appendChild(row);
}

function renderCgEnvelopeRows(points){
 var host=ctx.el('acCgEnvelopeRows');if(!host)return;host.innerHTML='';
 (Array.isArray(points)&&points.length?points:[null]).forEach(addCgEnvelopeRow);
}

function setupCgEnvelopeEditor(){
 var legacy=ctx.el('acCgEnvelope');if(!legacy)return;
 legacy.style.display='none';
 var oldLabel=legacy.previousElementSibling;if(oldLabel&&oldLabel.tagName==='LABEL')oldLabel.style.display='none';
 var host=document.createElement('div');host.id='acCgEnvelopeRows';host.className='cgEnvelopeEditor';legacy.parentNode.insertBefore(host,legacy);
 var add=document.createElement('button');add.id='addCgEnvelopePoint';add.type='button';add.className='btn btn2';add.textContent='Add Envelope Point';add.onclick=function(){addCgEnvelopeRow(null)};legacy.parentNode.insertBefore(add,legacy.nextSibling);
 var warning=document.createElement('p');warning.className='small cgEnvelopeWarning';warning.textContent='Enter CG envelope values only from official POH/W&B data.';add.parentNode.insertBefore(warning,add.nextSibling);
}

function readCgEnvelopeRows(){
 var host=ctx.el('acCgEnvelopeRows'),points=[],error='';if(!host)return {points:points,error:error};
 Array.from(host.getElementsByClassName('cgEnvelopeRow')).forEach(function(row,index){
  var values=['weight','forward','aft'].map(function(k){var input=row.getElementsByClassName('cgEnvelope'+k)[0];return input?input.value.trim():''});
  if(values.every(function(v){return v===''}))return;
  if(values.some(function(v){return v===''||!isFinite(parseFloat(v))})){error='Complete all three numeric fields for envelope point '+(index+1)+'.';return}
  var point={weight:parseFloat(values[0]),forward:parseFloat(values[1]),aft:parseFloat(values[2])};
  if(point.forward>point.aft){error='Forward CG must not exceed aft CG at envelope point '+(index+1)+'.';return}
  points.push(point);
 });
 points.sort(function(a,b){return a.weight-b.weight});return {points:points,error:error};
}

export function getList(){try{return JSON.parse(localStorage.jp_aircraft)||defaults}catch(e){return defaults}}
export function saveList(l){localStorage.jp_aircraft=JSON.stringify(l)}
export function acId(){return localStorage.jp_selectedAc||'N41498'}
export function ac(){var l=getList(),a=l.find(function(x){return x.id===acId()});return a||l[0]||defaults[0]}

export function migrateN41498Profile(){
 var migrationKey='jp_n41498WbCorrectionV1';
 if(localStorage[migrationKey])return false;
 var list=getList(),changed=false;
 list.forEach(function(a){
  if(a&&(a.id==='N41498'||a.n==='N41498')){
   a.type='PA-28-161';a.emptyWt=1433;a.emptyArm=87.1;a.maxWt=2325;
   a.cgEnvelope=n41498Envelope.map(function(p){return {weight:p.weight,forward:p.forward,aft:p.aft}});
   changed=true;
  }
 });
 if(changed)saveList(list);
 localStorage[migrationKey]='1';
 return changed;
}

export function populateAc(){
 var el=ctx.el,s=el('aircraftSelect'),l=getList();s.innerHTML='';
 l.forEach(function(a){var o=document.createElement('option');o.value=a.id;o.textContent=a.n+' • '+a.type;s.appendChild(o)});
 s.value=acId();loadAcForm();
}

export function loadAcForm(){
 var el=ctx.el,a=ac();
 el('acN').value=a.n||'';el('acType').value=a.type||'';el('acEmptyWt').value=a.emptyWt||'';el('acEmptyArm').value=a.emptyArm||'';el('acMaxWt').value=a.maxWt||'';el('acFuelPpg').value=a.fuelPpg||6;el('acFrontArm').value=a.frontArm||'';el('acRearArm').value=a.rearArm||'';el('acBagArm').value=a.bagArm||'';el('acFuelArm').value=a.fuelArm||'';el('acFuelBurn').value=a.fuelBurn||9;el('acXwLimit').value=a.xwLimit||17;
 if(el('acCgEnvelope'))el('acCgEnvelope').value=Array.isArray(a.cgEnvelope)?JSON.stringify(a.cgEnvelope):'';
 renderCgEnvelopeRows(a.cgEnvelope);
 el('xwLimit').value=a.xwLimit||17;el('fuelBurn').value=a.fuelBurn||9;
 var notes=a.notes||{};
 noteFields.forEach(function(k){if(el('ac'+k))el('ac'+k).value=notes[k]||''});
}

function readNotes(){
 var el=ctx.el,notes={};
 noteFields.forEach(function(k){notes[k]=el('ac'+k)?el('ac'+k).value:''});
 return notes;
}

function saveCurrentNotes(){
 var l=getList(),id=acId(),i=l.findIndex(function(x){return x.id===id});
 if(i<0)return;
 l[i].notes=readNotes();
 saveList(l);
}

export function saveAc(){
 var el=ctx.el,nv=ctx.nv,calcAll=ctx.calcAll,l=getList(),id=acId(),n=el('acN').value.trim()||'NEW';
 var i=l.findIndex(function(x){return x.id===id});
 var envelopeResult=readCgEnvelopeRows(),envelope=envelopeResult.points;
 if(envelopeResult.error)return alert(envelopeResult.error);
 var a={id:id.indexOf('NEW_')===0?n:id,n:n,type:el('acType').value,emptyWt:nv('acEmptyWt')||0,emptyArm:nv('acEmptyArm')||0,maxWt:nv('acMaxWt')||0,fuelPpg:nv('acFuelPpg')||6,frontArm:nv('acFrontArm')||0,rearArm:nv('acRearArm')||0,bagArm:nv('acBagArm')||0,fuelArm:nv('acFuelArm')||0,fuelBurn:nv('acFuelBurn')||9,xwLimit:nv('acXwLimit')||17,tankInterval:parseInt(localStorage.jp_tankInterval||'60'),notes:readNotes()};
 if(envelope.length)a.cgEnvelope=envelope;
 if(i>=0)l[i]=a;else l.push(a);
 saveList(l);localStorage.jp_selectedAc=a.id;populateAc();calcAll();alert('Aircraft saved.');
}

export function newAc(){
 var l=getList(),id='NEW_'+Date.now();
 l.push({id:id,n:'',type:'',fuelPpg:6,fuelBurn:9,xwLimit:17,tankInterval:60,notes:{}});
 saveList(l);localStorage.jp_selectedAc=id;populateAc();
}

export function delAc(){
 var calcAll=ctx.calcAll,l=getList();
 if(l.length<=1)return alert('Keep at least one aircraft.');
 if(confirm('Delete selected aircraft?')){l=l.filter(function(a){return a.id!==acId()});saveList(l);localStorage.jp_selectedAc=l[0].id;populateAc();calcAll()}
}

export function initAircraft(context){
 ctx=context;
 if(!localStorage.jp_aircraft)saveList(defaults);
 migrateN41498Profile();
 setupCgEnvelopeEditor();
 populateAc();
 ctx.el('aircraftSelect').onchange=function(){localStorage.jp_selectedAc=this.value;loadAcForm();ctx.calcAll()};
 ctx.el('saveAcBtn').onclick=saveAc;
 ctx.el('newAcBtn').onclick=newAc;
 ctx.el('deleteAcBtn').onclick=delAc;
 noteFields.forEach(function(k){
  if(ctx.el('ac'+k))ctx.el('ac'+k).addEventListener('input',saveCurrentNotes);
 });
}
