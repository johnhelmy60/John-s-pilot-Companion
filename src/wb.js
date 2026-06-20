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
 var required=[['maxWt','Max Gross Weight']];
 rows.forEach(function(r){(r.required||[]).forEach(function(pair){required.push(pair)})});
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
 return {weight:w||0,moment:m||0};
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
 var hasCgRange=has(a,'cgMin')&&has(a,'cgMax');
 var cgOut=hasCgRange&&totalWeight&&(cg<val(a,'cgMin')||cg>val(a,'cgMax'));

 setText('wbTotalWeightCell',fmt(totalWeight,1));
 setText('wbTotalArmCell',totalWeight?fmt(cg,2):'-');
 setText('wbTotalMomentCell',fmt(totalMoment/fmtFactor,2));
 setText('wbFuelSummary',fuel.gallons!=null||fuel.weight!=null?fmt(fuel.gallons||0,1)+' gal ('+fmt(fuel.weight||0,1)+' lb)':'-');
 setText('wbWeight',fmt(totalWeight,1)+' lb');
 setText('wbMoment',fmt(totalMoment/fmtFactor,2));
 setText('wbCg',totalWeight?fmt(cg,2)+' in':'-');
 setText('wbRemain',max?fmt(remain,1)+' lb':'-');
 setText('wbMaxGross',max?fmt(max,0)+' lb':'-');
 setText('wbStatus',(over?pill('OVER GROSS','bad'):pill('Weight OK','good'))+(cgOut?pill('CG OUT OF RANGE','bad'):pill('Verify CG envelope','warn')));
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
