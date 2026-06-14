import { ac } from './aircraft.js';

var ctx=null;
var lastReserveHours=null;

export function getLastReserveHours(){return lastReserveHours}

export function calcFuel(){
 var el=ctx.el,nv=ctx.nv,fmt=ctx.fmt,pill=ctx.pill,a=ac();el('fuelAcLabel').innerHTML='Selected aircraft: '+a.n+' • '+a.type;
 var on=nv('fuelOnboard'),hrs=nv('flightHours'),burn=nv('fuelBurn')||(a.fuelBurn||9);
 if(on==null||hrs==null){lastReserveHours=null;return}
 var used=hrs*burn,rem=on-used,res=rem/burn;lastReserveHours=res;
 el('fuelUsed').innerHTML=fmt(used,1)+' gal';el('fuelRem').innerHTML=fmt(rem,1)+' gal';el('reserveTime').innerHTML=fmt(res,2)+' hr';el('fuelStatus').innerHTML=res<.75?pill('LOW RESERVE','bad'):res<1.25?pill('Caution','warn'):pill('Good reserve','good');
}

export function initFuel(context){
 ctx=context;
}
