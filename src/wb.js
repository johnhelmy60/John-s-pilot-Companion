import { ac } from './aircraft.js';

var ctx=null;
var fuelMigrated=false;

var rows=[
 {key:'empty',wt:'wbEmptyWt',arm:'wbEmptyArm',moment:'wbEmptyMoment',profile:function(a){return {weight:a.emptyWt||0,arm:a.emptyArm||0}}},
 {key:'pilot',wt:'frontWt',arm:'wbPilotArm',moment:'wbPilotMoment',profile:function(a){return {arm:a.frontArm||0}}},
 {key:'frontRight',wt:'wbFrontRightWt',arm:'wbFrontRightArm',moment:'wbFrontRightMoment',profile:function(a){return {arm:a.frontArm||0}}},
 {key:'rear',wt:'rearWt',arm:'wbRearArm',moment:'wbRearMoment',profile:function(a){return {arm:a.rearArm||0}}},
 {key:'bag',wt:'bagWt',arm:'wbBagArm',moment:'wbBagMoment',profile:function(a){return {arm:a.bagArm||0}}},
 {key:'fuel',wt:'fuelGal',arm:'wbFuelArm',moment:'wbFuelMoment',profile:function(a){return {arm:a.fuelArm||0}}},
 {key:'custom1',wt:'wbCustom1Wt',arm:'wbCustom1Arm',moment:'wbCustom1Moment'},
 {key:'custom2',wt:'wbCustom2Wt',arm:'wbCustom2Arm',moment:'wbCustom2Moment'}
];

function e(id){return ctx.el(id)}
function num(id){var n=e(id),x=n?parseFloat(n.value):NaN;return isFinite(x)?x:null}
function setVal(id,value,d){
 var n=e(id);
 if(!n)return;
 n.value=value==null||!isFinite(value)?'':Number(value).toFixed(d).replace(/\.0+$/,'').replace(/(\.\d*?)0+$/,'$1');
}
function setText(id,value){if(e(id))e(id).innerHTML=value}
function mode(){return e('wbMode')?e('wbMode').value:'profile'}
function factor(){return parseFloat(e('wbMomentFormat')?e('wbMomentFormat').value:'1')||1}
function formatLabel(fmtFactor){return fmtFactor===1?'Moment':fmtFactor===100?'Moment / 100':'Moment / 1000'}

function migrateFuelGallons(a){
 if(fuelMigrated||localStorage.jp_wbFuelWeightMigrated)return;
 var n=e('fuelGal'),saved=localStorage.jp_fuelGal;
 if(n&&saved!=null&&saved!==''&&isFinite(parseFloat(saved))){
  var gallons=parseFloat(saved);
  var pounds=gallons*(a.fuelPpg||6);
  n.value=Number(pounds).toFixed(1);
  localStorage.jp_fuelGal=n.value;
 }
 localStorage.jp_wbFuelWeightMigrated='1';
 fuelMigrated=true;
}

function applyProfile(a){
 rows.forEach(function(r){
  var p=r.profile?r.profile(a):null;
  var arm=e(r.arm),wt=e(r.wt);
  if(arm)arm.readOnly=false;
  if(wt)wt.readOnly=false;
  if(mode()==='profile'&&p){
   if(p.weight!=null)setVal(r.wt,p.weight,1);
   if(p.arm!=null)setVal(r.arm,p.arm,2);
   if(r.key==='empty'&&wt)wt.readOnly=true;
   if(arm)arm.readOnly=true;
  }
 });
 var label=formatLabel(factor());
 setText('wbModeHint',(mode()==='profile'?'Aircraft profile mode auto-fills empty weight and station arms from the selected aircraft profile. Fuel is entered as weight in pounds.':'Free-Fill mode lets you manually enter weight, arm, and moment values.')+' Selected moment display: '+label+'.');
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
  var n=e(r.moment),v=num(r.moment);
  if(n&&v!=null)setVal(r.moment,(v*oldFactor)/newFactor,2);
 });
}

export function calcWB(){
 if(!ctx||!e('wbMode'))return;
 var a=ac(),fmt=ctx.fmt,pill=ctx.pill,fmtFactor=factor();
 setText('wbAcLabel','Selected aircraft: '+(a.n||'-')+' - '+(a.type||'-'));
 migrateFuelGallons(a);
 applyProfile(a);

 var totalWeight=0,totalMoment=0;
 rows.forEach(function(r){
  var v=rowValues(r,fmtFactor);
  totalWeight+=v.weight;
  totalMoment+=v.moment;
 });
 var cg=totalWeight?totalMoment/totalWeight:0;
 var max=a.maxWt||0;
 var remain=max?max-totalWeight:0;
 var over=max&&totalWeight>max;
 var hasCgRange=a.cgMin!=null&&a.cgMax!=null;
 var cgOut=hasCgRange&&totalWeight&&(cg<a.cgMin||cg>a.cgMax);

 setText('wbTotalWeightCell',fmt(totalWeight,1));
 setText('wbTotalArmCell',totalWeight?fmt(cg,2):'-');
 setText('wbTotalMomentCell',fmt(totalMoment/fmtFactor,2));
 setText('wbWeight',fmt(totalWeight,1)+' lb');
 setText('wbMoment',fmt(totalMoment/fmtFactor,2));
 setText('wbCg',totalWeight?fmt(cg,2)+' in':'-');
 setText('wbRemain',max?fmt(remain,1)+' lb':'-');
 setText('wbMaxGross',max?fmt(max,0)+' lb':'-');
 setText('wbStatus',(over?pill('OVER GROSS','bad'):pill('Weight OK','good'))+(cgOut?pill('CG OUT OF RANGE','bad'):pill('Verify CG envelope','warn')));
 localStorage.jp_wbMode=mode();
 localStorage.jp_wbMomentFormat=String(fmtFactor);
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
  [r.wt,r.arm,r.moment].forEach(function(id){
   if(e(id))e(id).addEventListener('input',ctx.calcAll);
  });
 });
 ['wbCustom1Label','wbCustom2Label'].forEach(function(id){
  if(e(id))e(id).addEventListener('input',ctx.calcAll);
 });
}
