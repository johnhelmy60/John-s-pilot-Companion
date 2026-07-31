import assert from 'node:assert/strict';
import { convertZuluTime } from '../src/zulu-time-calculations.js';

function convert(overrides){return convertZuluTime({direction:'local-to-zulu',date:'2026-07-30',time:'17:05',zone:'America/Denver',...overrides})}

const daylight=convert();
assert.equal(daylight.ok,true);
assert.equal(daylight.zuluTime,'2305Z');
assert.equal(daylight.zoneAbbreviation,'MDT');
assert.equal(daylight.offset,'UTC-06:00');

const standard=convert({date:'2026-01-15'});
assert.equal(standard.zuluTime,'0005Z');
assert.equal(standard.zuluDate,'16 JAN 2026');
assert.equal(standard.zoneAbbreviation,'MST');
assert.equal(standard.offset,'UTC-07:00');
assert.equal(standard.dayRelation,'next');

const utcToLocal=convert({direction:'zulu-to-local',date:'2026-07-30',time:'02:05'});
assert.equal(utcToLocal.localDate,'29 JUL 2026');
assert.equal(utcToLocal.localTime,'2005');
assert.equal(utcToLocal.dayRelation,'previous');

const leapDay=convert({date:'2024-02-29',time:'23:30',zone:'Pacific/Honolulu'});
assert.equal(leapDay.ok,true);
assert.equal(leapDay.zuluDate,'01 MAR 2024');
assert.equal(leapDay.zuluTime,'0930Z');

const gap=convert({date:'2026-03-08',time:'02:30'});
assert.equal(gap.ok,false);
assert.equal(gap.code,'nonexistent');

const overlap=convert({date:'2026-11-01',time:'01:30'});
assert.equal(overlap.ok,false);
assert.equal(overlap.code,'ambiguous');
assert.equal(overlap.choices.length,2);

const first=convert({date:'2026-11-01',time:'01:30',occurrence:'first'});
const second=convert({date:'2026-11-01',time:'01:30',occurrence:'second'});
assert.equal(first.zuluTime,'0730Z');
assert.equal(second.zuluTime,'0830Z');
assert.equal(first.zoneAbbreviation,'MDT');
assert.equal(second.zoneAbbreviation,'MST');

const invalidZone=convert({zone:'Not/A_Timezone'});
assert.equal(invalidZone.code,'invalid-zone');
console.log('Zulu time conversions and DST transitions passed.');

