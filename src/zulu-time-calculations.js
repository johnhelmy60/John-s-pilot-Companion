import { DateTime, IANAZone } from '../vendor/luxon.mjs';

function parts(date,time){var d=/^(\d{4})-(\d{2})-(\d{2})$/.exec(date||''),t=/^(\d{2}):(\d{2})$/.exec(time||'');if(!d||!t)return null;return {year:+d[1],month:+d[2],day:+d[3],hour:+t[1],minute:+t[2]}}
function sameWallTime(dt,p){return dt.year===p.year&&dt.month===p.month&&dt.day===p.day&&dt.hour===p.hour&&dt.minute===p.minute}
function dayRelation(input,output){var a=input.startOf('day'),b=output.startOf('day'),days=Math.round(b.diff(a,'days').days);return days<0?'previous':days>0?'next':''}
function offsetLabel(minutes){var sign=minutes<0?'-':'+',absolute=Math.abs(minutes),hours=String(Math.floor(absolute/60)).padStart(2,'0'),mins=String(absolute%60).padStart(2,'0');return 'UTC'+sign+hours+':'+mins}
function output(local,zulu,relation,ambiguous){return {ok:true,localDate:local.toFormat('dd LLL yyyy').toUpperCase(),localTime:local.toFormat('HHmm'),zuluDate:zulu.toFormat('dd LLL yyyy').toUpperCase(),zuluTime:zulu.toFormat('HHmm')+'Z',zoneAbbreviation:local.offsetNameShort||local.zoneName,offset:offsetLabel(local.offset),dayRelation:relation,ambiguous:ambiguous||false}}

export function convertZuluTime(input){
 var p=parts(input.date,input.time),zone=input.zone;
 if(!p)return {ok:false,code:'invalid-input',message:'Enter a valid date and time.'};
 if(!IANAZone.isValidZone(zone))return {ok:false,code:'invalid-zone',message:'Select a valid IANA timezone.'};
 if(input.direction==='zulu-to-local'){
  var zulu=DateTime.fromObject(p,{zone:'UTC'});
  if(!zulu.isValid)return {ok:false,code:'invalid-input',message:'Enter a valid date and time.'};
  var local=zulu.setZone(zone);
  return output(local,zulu,dayRelation(zulu,local));
 }
 var candidate=DateTime.fromObject(p,{zone:zone,setZone:true});
 if(!candidate.isValid||!sameWallTime(candidate,p))return {ok:false,code:'nonexistent',message:'That local time does not exist because the clock moves forward for daylight-saving time. Choose a valid local time.'};
 var choices=candidate.getPossibleOffsets().sort(function(a,b){return a.toMillis()-b.toMillis()});
 if(choices.length>1&&!['first','second'].includes(input.occurrence))return {ok:false,code:'ambiguous',message:'That local time occurs twice when the clock moves back. Choose the first or second occurrence.',choices:choices.map(function(dt,index){return {value:index?'second':'first',label:(index?'Second':'First')+' occurrence — '+(dt.offsetNameShort||dt.zoneName)+' ('+offsetLabel(dt.offset)+')'}})};
 var localChoice=choices.length>1?choices[input.occurrence==='second'?1:0]:candidate,zuluChoice=localChoice.toUTC();
 return output(localChoice,zuluChoice,dayRelation(localChoice,zuluChoice),choices.length>1);
}

export function currentInput(direction,zone,nowMillis){
 var instant=DateTime.fromMillis(nowMillis==null?Date.now():nowMillis,{zone:'UTC'}),shown=direction==='zulu-to-local'?instant:instant.setZone(IANAZone.isValidZone(zone)?zone:'UTC');
 return {date:shown.toISODate(),time:shown.toFormat('HH:mm')};
}

