import { ac } from './aircraft.js';

var ctx=null;
var activeInput=null;

var rows=[
 {key:'empty',wt:'wbEmptyWt',arm:'wbEmptyArm',moment:'wbEmptyMoment',required:[['emptyWt','Empty Weight'],['emptyArm','Empty Weight Arm']]},
 {key:'pilot',wt:'frontWt',arm:'wbPilotArm',moment:'wbPilotMoment',required:[['frontArm','Front Seat Arm']]},
 {key:'frontRight',wt:'wbFrontRightWt',arm:'wbFrontRightArm',moment:'wbFrontRightMoment',required:[['frontArm','Front Seat Arm']]},
 {key:'rear',wt:'rearWt',arm:'wbRearArm',moment:'wbRearMoment',required:[['rearArm','Rear Seat Arm']]},
 {key:'bag',wt:'bagWt',arm:'wbBagArm',moment:'wbBagMoment',required:[['bagArm','Baggage Arm']]},
 {key:'fuel',gal:'fuelGal',wt:'wbFuelWt',arm:'wbFuelArm',moment:'wbFuelMoment',required:[['fuelArm','Fuel Arm'],['fuelPpg','Fuel Weight Per Gallon']]},
 {key:'custom1',wt:'wbCustom1Wt',arm:'wbCustom1Arm',moment:'wbCustom1Moment'},
 {key:'custom2',wt:'wbCustom2Wt',arm:'wbCustom2Arm',moment:'wbCustom2Moment'}
];

function e(id){return ctx.el(id)}
function num(id){var n=e(id),x=n?parseFloat(n.value):NaN;return isFinite(x)?x:null}
function has(a,k){return a&&a[k]!=null&&a[k]!==''&&isFinite(parseFloat(a[k]))}
function val(a,k){return has(a,k)?parseFloat(a[k]):null}
function setText(id,value){if(e(id))e(id).innerHTML=value}
function mode(){return e('wbMode')?e('wbMode').value:'profile'}
function factor(){return parseFloat(e('wbMomentFormat')?e('wbMomentFormat').value:'1')||1}
function formatLabel(f){return f===1?'Moment':f===100?'Moment / 100':'Moment / 1000'}

function envelopePoints(a){
 if(!a||!Array.isArray(a.cgEnvelope))return [];
 return a.cgEnvelope.map(function(p){return {weight:parseFloat(p.weight),forward:parseFloat(p.forward),aft:parseFloat(p.aft)}})
  .filter(function(p){return isFinite(p.weight)&&isFinite(p.forward)&&isFinite(p.aft)&&p.forward<=p.aft})
  .sort(function(x,y){return x.weight-y.weight});
}

function limitsAtWeight(points,weight){
 if(!points.length||!isFinite(weight))return null;
 if(weight<=points[0].weight)return {forward:points[0].forward,aft:points[0].aft};
 if(weight>=points[points.length-1].weight)return {forward:points[points.length-1].forward,aft:points[points.length-1].aft};
 for(var i=1;i<points.length;i++)if(weight<=points[i].weight){
  var low=points[i-1],high=points[i],ratio=(weight-low.weight)/(high.weight-low.weight||1);
  return {forward:low.forward+(high.forward-low.forward)*ratio,aft:low.aft+(high.aft-low.aft)*ratio};
 }
 return null;
}

export function evaluateEnvelope(profile,weight,cg){
 var points=envelopePoints(profile);
 if(!points.length)return {code:'missing',label:'Envelope data missing',points:points};
 var limits=limitsAtWeight(points,weight);
 if(cg<limits.forward)return {code:'forward',label:'CG Too Forward',points:points,limits:limits};
 if(cg>limits.aft)return {code:'aft',label:'CG Too Aft',points:points,limits:limits};
 if(weight<points[0].weight||weight>points[points.length-1].weight)return {code:'outside',label:'Outside Envelope',points:points,limits:limits};
 return {code:'inside',label:'Within Envelope',points:points,limits:limits};
}

function renderEnvelope(a,totalWeight,cg,over,result){
 var host=e('wbEnvelopeGraph');
 if(!host)return result;
 if(result.code==='missing'){
  setText('wbEnvelopeStatus','CG envelope data missing — verify with POH/W&amp;B chart');
  host.innerHTML='<div class="small" style="padding:28px 16px;text-align:center">CG envelope data missing — verify with POH/W&amp;B chart</div>';
  return result;
 }
 var points=result.points,arms=[],weights=[];
 points.forEach(function(p){arms.push(p.forward,p.aft);weights.push(p.weight)});
 var max=val(a,'maxWt');if(max){weights.push(max)}
 var minArm=Math.min.apply(null,arms),maxArm=Math.max.apply(null,arms),minWeight=Math.min.apply(null,weights),maxWeight=Math.max.apply(null,weights);
 var armPad=Math.max((maxArm-minArm)*.12,1),weightPad=Math.max((maxWeight-minWeight)*.14,80);
 minArm-=armPad;maxArm+=armPad;minWeight=Math.max(0,minWeight-weightPad);maxWeight+=weightPad;
 var left=54,right=12,top=22,bottom=42,w=360,h=280,plotW=w-left-right,plotH=h-top-bottom;
 function x(v){return left+(v-minArm)/(maxArm-minArm)*plotW}
 function y(v){return top+(maxWeight-v)/(maxWeight-minWeight)*plotH}
 function clamp(v,low,high){return Math.max(low,Math.min(high,v))}
 function path(kind){return points.map(function(p,i){return (i?'L':'M')+x(p[kind]).toFixed(1)+' '+y(p.weight).toFixed(1)}).join(' ')}
 var polygon=points.map(function(p){return x(p.forward).toFixed(1)+','+y(p.weight).toFixed(1)}).concat(points.slice().reverse().map(function(p){return x(p.aft).toFixed(1)+','+y(p.weight).toFixed(1)})).join(' ');
 var grid='',ticks=4;
 for(var i=0;i<=ticks;i++){
  var tw=minWeight+(maxWeight-minWeight)*i/ticks,ty=y(tw),ta=minArm+(maxArm-minArm)*i/ticks,tx=x(ta);
  grid+='<line x1="'+left+'" y1="'+ty+'" x2="'+(w-right)+'" y2="'+ty+'" stroke="#2d4358" stroke-width="1"/><text x="'+(left-7)+'" y="'+(ty+4)+'" fill="#9fb0c0" font-size="10" text-anchor="end">'+Math.round(tw)+'</text>';
  grid+='<line x1="'+tx+'" y1="'+top+'" x2="'+tx+'" y2="'+(h-bottom)+'" stroke="#203447" stroke-width="1"/><text x="'+tx+'" y="'+(h-bottom+16)+'" fill="#9fb0c0" font-size="10" text-anchor="middle">'+ta.toFixed(1)+'</text>';
 }
 var gross=max?'<line x1="'+left+'" y1="'+y(max)+'" x2="'+(w-right)+'" y2="'+y(max)+'" stroke="#ff6b6b" stroke-width="2" stroke-dasharray="6 4"/><text x="'+(w-right-2)+'" y="'+(y(max)-5)+'" fill="#ff6b6b" font-size="10" text-anchor="end">Max Gross Weight</text>':'';
 var rawX=x(cg),rawY=y(totalWeight),pointOutside=rawX<left||rawX>w-right||rawY<top||rawY>h-bottom;
 var pointX=clamp(rawX,left+8,w-right-8),pointY=clamp(rawY,top+8,h-bottom-8);
 var point=totalWeight>0?'<circle cx="'+pointX+'" cy="'+pointY+'" r="7" fill="'+(over||result.code!=='inside'?'#ff6b6b':'#76e06b')+'" stroke="#fff" stroke-width="3"/><text x="'+pointX+'" y="'+clamp(pointY-12,top+10,h-bottom-10)+'" fill="#fff" font-size="10" font-weight="700" text-anchor="middle">Current: '+cg.toFixed(2)+' in / '+totalWeight.toFixed(0)+' lb</text>':'';
 host.innerHTML='<svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="CG arm by total weight envelope graph">'+grid+'<polygon points="'+polygon+'" fill="#58b7ff18" stroke="none"/><path d="'+path('forward')+'" fill="none" stroke="#58b7ff" stroke-width="3"/><path d="'+path('aft')+'" fill="none" stroke="#ffd166" stroke-width="3"/>'+gross+point+'<text x="'+(left+plotW/2)+'" y="'+(h-7)+'" fill="#f4f7fb" font-size="12" text-anchor="middle">CG / Arm (in)</text><text x="13" y="'+(top+plotH/2)+'" fill="#f4f7fb" font-size="12" text-anchor="middle" transform="rotate(-90 13 '+(top+plotH/2)+')">Total Weight (lb)</text></svg>';
 if(pointOutside)host.innerHTML+='<div class="cgPlotWarning">Current loading point is outside graph bounds; marker is pinned to the nearest edge.</div>';
 setText('wbEnvelopeStatus',over?'OVER MAX GROSS WEIGHT':result.label);
 return {minCgArmIn:minArm,maxCgArmIn:maxArm,minWeightLb:minWeight,maxWeightLb:maxWeight,pointOutside:pointOutside};
}

function renderDebug(a,totalWeight,cg,result,ranges,error){
 var data={aircraft:(a.n||'')+' '+(a.type||''),envelopeCoordinatesLoaded:result.points,currentLoadingPoint:{cgArmIn:Number(cg.toFixed(2)),totalWeightLb:Number(totalWeight.toFixed(1))},graphRanges:ranges||null,units:'CG/arms: inches from the aircraft profile datum; weight: pounds; moment: pound-inches',graphError:error?String(error.message||error):null};
 setText('wbDebugOutput',JSON.stringify(data,null,2));
}

function setVal(id,value,d){
 var n=e(id);
 if(!n)return;
 if(value==null||!isFinite(value)){n.value='';return}
 n.value=Number(value).toFixed(d).replace(/\.0+$/,'').replace(/(\.\d*?)0+$/,'$1');
}

function markReadonly(id,locked){
 var n=e(id);
 if(n)n.readOnly=!!locked;
}

function profileMissing(a){
 var seen={},missing=[];
 var required=[['maxWt','Max Gross Weight'],['emptyWt','Empty Weight'],['emptyArm','Empty Weight Arm']];
 rows.forEach(function(r){
  var rowInUse=num(r.wt)!=null&&num(r.wt)!==0;
  if(r.gal)rowInUse=rowInUse||(num(r.gal)!=null&&num(r.gal)!==0);
  if(rowInUse)(r.required||[]).forEach(function(pair){required.push(pair)});
 });
 required.forEach(function(pair){
  if(!seen[pair[0]]&&!has(a,pair[0]))missing.push(pair[1]);
  seen[pair[0]]=true;
 });
 return missing;
}

function profileFill(a){
 var useProfile=mode()==='profile';
 rows.forEach(function(r){
  markReadonly(r.wt,false);
  markReadonly(r.arm,false);
  markReadonly(r.moment,false);
  if(r.gal)markReadonly(r.gal,false);
 });
 if(!useProfile)return;

 if(has(a,'emptyWt'))setVal('wbEmptyWt',val(a,'emptyWt'),1);
 if(has(a,'emptyArm'))setVal('wbEmptyArm',val(a,'emptyArm'),2);
 if(has(a,'frontArm')){
  setVal('wbPilotArm',val(a,'frontArm'),2);
  setVal('wbFrontRightArm',val(a,'frontArm'),2);
 }
 if(has(a,'rearArm'))setVal('wbRearArm',val(a,'rearArm'),2);
 if(has(a,'bagArm'))setVal('wbBagArm',val(a,'bagArm'),2);
 if(has(a,'fuelArm'))setVal('wbFuelArm',val(a,'fuelArm'),2);

 markReadonly('wbEmptyWt',true);
 markReadonly('wbEmptyArm',true);
 markReadonly('wbPilotArm',true);
 markReadonly('wbFrontRightArm',true);
 markReadonly('wbRearArm',true);
 markReadonly('wbBagArm',true);
 markReadonly('wbFuelArm',true);
}

function restoreFuelGallonsIfNeeded(a){
 if(localStorage.jp_wbFuelGallonsRestored)return;
 if(localStorage.jp_wbFuelWeightMigrated&&localStorage.jp_fuelGal&&has(a,'fuelPpg')){
  var maybePounds=parseFloat(localStorage.jp_fuelGal);
  if(isFinite(maybePounds))localStorage.jp_fuelGal=String(Number(maybePounds/val(a,'fuelPpg')).toFixed(2));
 }
 localStorage.jp_wbFuelGallonsRestored='1';
}

function syncFuel(a){
 var ppg=val(a,'fuelPpg')||6;
 var gallons=num('fuelGal'),weight=num('wbFuelWt');
 if(gallons==null&&weight==null){
  var fuelPageGallons=num('fuelOnboard');
  if(fuelPageGallons==null&&localStorage.jp_fuelOnboard!=null&&localStorage.jp_fuelOnboard!==''){
   var saved=parseFloat(localStorage.jp_fuelOnboard);
   fuelPageGallons=isFinite(saved)?saved:null;
  }
  if(fuelPageGallons!=null){
   gallons=fuelPageGallons;
   setVal('fuelGal',gallons,2);
  }
 }
 if(activeInput==='wbFuelWt'&&weight!=null){
  gallons=weight/ppg;
  setVal('fuelGal',gallons,2);
 }else if(gallons!=null){
  weight=gallons*ppg;
  setVal('wbFuelWt',weight,1);
 }else if(weight!=null){
  gallons=weight/ppg;
  setVal('fuelGal',gallons,2);
 }
 return {gallons:gallons,weight:weight};
}

function rowValues(r,fmtFactor){
 var w=num(r.wt),arm=num(r.arm),displayMoment=num(r.moment),m=displayMoment==null?null:displayMoment*fmtFactor;
 if(activeInput===r.wt&&w==null){
  m=null;
  setVal(r.moment,null,2);
 }
 if(w!=null&&arm!=null){
  m=w*arm;
  setVal(r.moment,m/fmtFactor,2);
 }else if(w!=null&&m!=null&&w!==0){
  arm=m/w;
  setVal(r.arm,arm,2);
 }else if(arm!=null&&m!=null&&arm!==0){
  w=m/arm;
  setVal(r.wt,w,1);
 }
 return {weight:w==null?0:w,moment:m==null?0:m};
}

function convertMomentDisplay(oldFactor,newFactor){
 rows.forEach(function(r){
  var v=num(r.moment);
  if(v!=null)setVal(r.moment,(v*oldFactor)/newFactor,2);
 });
}

function renderProfileWarnings(a){
 var missing=mode()==='profile'?profileMissing(a):[];
 if(!missing.length){setText('wbProfileWarnings','');return}
 setText('wbProfileWarnings','<div class="result"><span class="pill warn">Missing profile data</span><div class="small">'+missing.join(', ')+'</div></div>');
}

export function calcWB(){
 if(!ctx||!e('wbMode'))return;
 var a=ac(),fmt=ctx.fmt,pill=ctx.pill,fmtFactor=factor();
 restoreFuelGallonsIfNeeded(a);
 setText('wbAcLabel','Selected aircraft: '+(a.n||'-')+' - '+(a.type||'-'));
 profileFill(a);
 var fuel=syncFuel(a);

 var label=formatLabel(fmtFactor);
 setText('wbModeHint',(mode()==='profile'?'Aircraft Profile mode is active. Available aircraft profile fields auto-fill the load sheet.':'Free-Fill mode is active. Enter any two values in a row to calculate the third.')+' Selected moment display: '+label+'.');
 renderProfileWarnings(a);

 var totalWeight=0,totalMoment=0;
 rows.forEach(function(r){
  var v=rowValues(r,fmtFactor);
  totalWeight+=v.weight;
  totalMoment+=v.moment;
 });
 var cg=totalWeight?totalMoment/totalWeight:0;
 var max=val(a,'maxWt')||0;
 var remain=max?max-totalWeight:0;
 var over=max&&totalWeight>max;
 var envelope=evaluateEnvelope(a,totalWeight,cg);

 setText('wbTotalWeightCell',fmt(totalWeight,1));
 setText('wbTotalArmCell',totalWeight?fmt(cg,2):'-');
 setText('wbTotalMomentCell',fmt(totalMoment/fmtFactor,2));
 setText('wbFuelSummary',fuel.gallons!=null||fuel.weight!=null?fmt(fuel.gallons||0,1)+' gal ('+fmt(fuel.weight||0,1)+' lb)':'-');
 setText('wbWeight',fmt(totalWeight,1)+' lb');
 setText('wbMoment',fmt(totalMoment/fmtFactor,2));
 setText('wbCg',totalWeight?fmt(cg,2)+' in':'-');
 setText('wbRemain',max?fmt(remain,1)+' lb':'-');
 setText('wbMaxGross',max?fmt(max,0)+' lb':'-');
 setText('wbWeightStatus',over?pill('🔴 Overweight by '+fmt(totalWeight-max,1)+' lb','bad'):pill('🟢 Within Limits','good'));
 setText('wbCgStatus',envelope.code==='missing'?pill('Envelope data missing','warn'):pill((envelope.code==='inside'?'🟢 ':'🔴 ')+envelope.label,envelope.code==='inside'?'good':'bad'));
 var graphRanges=null,graphError=null;
 try{graphRanges=renderEnvelope(a,totalWeight,cg,over,envelope)}catch(err){
  graphError=err;
  setText('wbEnvelopeStatus','CG graph unavailable');
  setText('wbEnvelopeGraph','<div class="cgPlotWarning">CG graph could not render. Weight and CG status calculations remain active.</div>');
 }
 renderDebug(a,totalWeight,cg,envelope,graphRanges,graphError);
 localStorage.jp_wbMode=mode();
 localStorage.jp_wbMomentFormat=String(fmtFactor);
 activeInput=null;
}

export function initWb(context){
 ctx=context;
 if(e('wbMode'))e('wbMode').value=localStorage.jp_wbMode||'profile';
 if(e('wbMomentFormat'))e('wbMomentFormat').value=localStorage.jp_wbMomentFormat||'1';
 if(e('wbMode'))e('wbMode').addEventListener('change',ctx.calcAll);
 if(e('wbMomentFormat'))e('wbMomentFormat').addEventListener('change',function(){
  var oldFactor=parseFloat(localStorage.jp_wbMomentFormat||'1')||1;
  var newFactor=factor();
  convertMomentDisplay(oldFactor,newFactor);
  ctx.calcAll();
 });
 rows.forEach(function(r){
  [r.gal,r.wt,r.arm,r.moment].forEach(function(id){
   if(e(id))e(id).addEventListener('input',function(){activeInput=id;ctx.calcAll()});
  });
 });
 ['wbCustom1Label','wbCustom2Label'].forEach(function(id){
  if(e(id))e(id).addEventListener('input',ctx.calcAll);
 });
}
