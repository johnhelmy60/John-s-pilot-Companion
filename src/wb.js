import { ac } from './aircraft.js';

var ctx=null;

export function calcWB(){
 var el=ctx.el,nv=ctx.nv,fmt=ctx.fmt,pill=ctx.pill,a=ac();el('wbAcLabel').innerHTML='Selected aircraft: '+a.n+' • '+a.type;
 var f=nv('frontWt')||0,r=nv('rearWt')||0,b=nv('bagWt')||0,fg=nv('fuelGal')||0,fw=fg*(a.fuelPpg||6),tot=(a.emptyWt||0)+f+r+b+fw,m=(a.emptyWt||0)*(a.emptyArm||0)+f*(a.frontArm||0)+r*(a.rearArm||0)+b*(a.bagArm||0)+fw*(a.fuelArm||0),cg=tot?m/tot:0,rem=(a.maxWt||0)-tot;
 el('wbWeight').innerHTML=fmt(tot,1)+' lb';el('wbCg').innerHTML=fmt(cg,2)+' in';el('wbRemain').innerHTML=fmt(rem,1)+' lb';el('wbStatus').innerHTML=(tot>(a.maxWt||0)?pill('OVER GROSS','bad'):pill('Weight OK','good'))+pill('Verify CG envelope','warn');
}

export function initWb(context){
 ctx=context;
}
