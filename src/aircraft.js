export var defaults=[{id:'N41498',n:'N41498',type:'PA-28-161',emptyWt:1443,emptyArm:87.1,maxWt:2440,fuelPpg:6,frontArm:80.5,rearArm:118.1,bagArm:142.8,fuelArm:95,fuelBurn:9,xwLimit:17,tankInterval:60}];

var ctx=null;
var noteFields=['GeneralNotes','RentalQuirks','AvionicsNotes','FuelOilNotes','DispatchNotes','SquawkNotes'];

export function getList(){try{return JSON.parse(localStorage.jp_aircraft)||defaults}catch(e){return defaults}}
export function saveList(l){localStorage.jp_aircraft=JSON.stringify(l)}
export function acId(){return localStorage.jp_selectedAc||'N41498'}
export function ac(){var l=getList(),a=l.find(function(x){return x.id===acId()});return a||l[0]||defaults[0]}

export function populateAc(){
 var el=ctx.el,s=el('aircraftSelect'),l=getList();s.innerHTML='';
 l.forEach(function(a){var o=document.createElement('option');o.value=a.id;o.textContent=a.n+' • '+a.type;s.appendChild(o)});
 s.value=acId();loadAcForm();
}

export function loadAcForm(){
 var el=ctx.el,a=ac();
 el('acN').value=a.n||'';el('acType').value=a.type||'';el('acEmptyWt').value=a.emptyWt||'';el('acEmptyArm').value=a.emptyArm||'';el('acMaxWt').value=a.maxWt||'';el('acFuelPpg').value=a.fuelPpg||6;el('acFrontArm').value=a.frontArm||'';el('acRearArm').value=a.rearArm||'';el('acBagArm').value=a.bagArm||'';el('acFuelArm').value=a.fuelArm||'';el('acFuelBurn').value=a.fuelBurn||9;el('acXwLimit').value=a.xwLimit||17;
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
 var a={id:id.indexOf('NEW_')===0?n:id,n:n,type:el('acType').value,emptyWt:nv('acEmptyWt')||0,emptyArm:nv('acEmptyArm')||0,maxWt:nv('acMaxWt')||0,fuelPpg:nv('acFuelPpg')||6,frontArm:nv('acFrontArm')||0,rearArm:nv('acRearArm')||0,bagArm:nv('acBagArm')||0,fuelArm:nv('acFuelArm')||0,fuelBurn:nv('acFuelBurn')||9,xwLimit:nv('acXwLimit')||17,tankInterval:parseInt(localStorage.jp_tankInterval||'60'),notes:readNotes()};
 var i=l.findIndex(function(x){return x.id===id});if(i>=0)l[i]=a;else l.push(a);
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
 populateAc();
 ctx.el('aircraftSelect').onchange=function(){localStorage.jp_selectedAc=this.value;loadAcForm();ctx.calcAll()};
 ctx.el('saveAcBtn').onclick=saveAc;
 ctx.el('newAcBtn').onclick=newAc;
 ctx.el('deleteAcBtn').onclick=delAc;
 noteFields.forEach(function(k){
  if(ctx.el('ac'+k))ctx.el('ac'+k).addEventListener('input',saveCurrentNotes);
 });
}
