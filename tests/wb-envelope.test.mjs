import assert from 'node:assert/strict';
import { evaluateEnvelope } from '../src/wb.js';

const profile={cgEnvelope:[
 {weight:1600,forward:82,aft:93},
 {weight:2000,forward:84,aft:93},
 {weight:2400,forward:86,aft:92}
]};
assert.equal(evaluateEnvelope(profile,2000,88).code,'inside');
assert.equal(evaluateEnvelope(profile,2000,88).label,'Inside full envelope');
assert.equal(evaluateEnvelope(profile,2000,80).code,'forward');
assert.equal(evaluateEnvelope(profile,2000,95).code,'aft');
assert.equal(evaluateEnvelope(profile,2500,88).code,'outside');
assert.equal(evaluateEnvelope({cgEnvelope:[]},2000,88).code,'missing');
console.log('Full W&B envelope checks passed.');
