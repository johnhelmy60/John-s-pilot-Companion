var ctx=null;

var defaults={
  schemaVersion:1,
  mode:'solo',
  dual:{maxCrosswindKt:17,maxGustCrosswindKt:22,minCeilingFtAgl:2500,minVisibilitySm:5,minFuelReserveMin:45,maxSurfaceWindKt:20,maxGustKt:25},
  solo:{maxCrosswindKt:10,maxGustCrosswindKt:15,minCeilingFtAgl:3500,minVisibilitySm:8,minFuelReserveMin:60,maxSurfaceWindKt:15,maxGustKt:20}
};

function clone(o){return JSON.parse(JSON.stringify(o))}

export function getMinimums(){
 try{
  var saved=JSON.parse(localStorage.jp_personalMinimums||'null');
  if(saved&&saved.solo&&saved.dual){
   return {
    schemaVersion:1,
    mode:saved.mode==='dual'?'dual':'solo',
    dual:Object.assign(clone(defaults.dual),saved.dual),
    solo:Object.assign(clone(defaults.solo),saved.solo)
   };
  }
 }catch(e){}
 return clone(defaults);
}

function saveMinimums(m){
 localStorage.jp_personalMinimums=JSON.stringify(m);
}

export function getActiveMode(){
 return getMinimums().mode==='dual'?'dual':'solo';
}

export function getActiveMinimums(){
 var m=getMinimums();
 return m[m.mode==='dual'?'dual':'solo'];
}

function n(id,fallback){
 var v=ctx.nv(id);
 return v==null?fallback:v;
}

function setValue(id,val){
 if(ctx.el(id))ctx.el(id).value=val==null?'':val;
}

function loadForm(){
 var m=getMinimums();
 if(ctx.el('minMode'))ctx.el('minMode').value=m.mode;
 ['dual','solo'].forEach(function(kind){
  var prefix=kind==='dual'?'minDual':'minSolo';
  setValue(prefix+'Xw',m[kind].maxCrosswindKt);
  setValue(prefix+'GustXw',m[kind].maxGustCrosswindKt);
  setValue(prefix+'Ceil',m[kind].minCeilingFtAgl);
  setValue(prefix+'Vis',m[kind].minVisibilitySm);
  setValue(prefix+'Reserve',m[kind].minFuelReserveMin);
  setValue(prefix+'SurfaceWind',m[kind].maxSurfaceWindKt);
  setValue(prefix+'Gust',m[kind].maxGustKt);
 });
 renderSummary();
}

function readForm(){
 var m=getMinimums();
 m.mode=ctx.el('minMode')&&ctx.el('minMode').value==='dual'?'dual':'solo';
 [
  ['dual','minDual'],
  ['solo','minSolo']
 ].forEach(function(pair){
  var kind=pair[0],prefix=pair[1],base=defaults[kind];
  m[kind]={
   maxCrosswindKt:n(prefix+'Xw',base.maxCrosswindKt),
   maxGustCrosswindKt:n(prefix+'GustXw',base.maxGustCrosswindKt),
   minCeilingFtAgl:n(prefix+'Ceil',base.minCeilingFtAgl),
   minVisibilitySm:n(prefix+'Vis',base.minVisibilitySm),
   minFuelReserveMin:n(prefix+'Reserve',base.minFuelReserveMin),
   maxSurfaceWindKt:n(prefix+'SurfaceWind',base.maxSurfaceWindKt),
   maxGustKt:n(prefix+'Gust',base.maxGustKt)
  };
 });
 return m;
}

export function renderSummary(){
 if(!ctx)return;
 var m=getMinimums(),active=getActiveMinimums(),mode=getActiveMode();
 var label=mode==='dual'?'Dual':'Solo';
 if(ctx.el('minActiveSummary')){
  ctx.el('minActiveSummary').innerHTML=label+' minimums active: XW '+active.maxCrosswindKt+' kt, gust XW '+active.maxGustCrosswindKt+' kt, ceiling '+active.minCeilingFtAgl+' ft, visibility '+active.minVisibilitySm+' SM, reserve '+active.minFuelReserveMin+' min.';
 }
 if(ctx.el('xwMinMode'))ctx.el('xwMinMode').innerHTML=label;
 if(ctx.el('xwMinSummary'))ctx.el('xwMinSummary').innerHTML='Crosswind '+active.maxCrosswindKt+' kt • gust crosswind '+active.maxGustCrosswindKt+' kt. Verify with instructor and school procedures.';
 if(ctx.el('goMinMode'))ctx.el('goMinMode').innerHTML=label+' minimums';
 if(ctx.el('goMinSummary'))ctx.el('goMinSummary').innerHTML='Ceiling '+active.minCeilingFtAgl+' ft • visibility '+active.minVisibilitySm+' SM • reserve '+active.minFuelReserveMin+' min • XW '+active.maxCrosswindKt+' kt.';
}

function saveFromForm(){
 saveMinimums(readForm());
 renderSummary();
 ctx.calcAll();
 alert('Personal minimums saved.');
}

function resetMinimums(){
 if(!confirm('Reset personal minimums to defaults?'))return;
 saveMinimums(clone(defaults));
 loadForm();
 ctx.calcAll();
}

export function initMinimums(context){
 ctx=context;
 if(!localStorage.jp_personalMinimums)saveMinimums(clone(defaults));
 loadForm();
 if(ctx.el('saveMinimumsBtn'))ctx.el('saveMinimumsBtn').onclick=saveFromForm;
 if(ctx.el('resetMinimumsBtn'))ctx.el('resetMinimumsBtn').onclick=resetMinimums;
 if(ctx.el('minMode'))ctx.el('minMode').onchange=function(){
  var m=readForm();
  saveMinimums(m);
  renderSummary();
  ctx.calcAll();
 };
}
