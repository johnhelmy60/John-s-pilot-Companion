import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const plan=html.match(/<section id='plan'[\s\S]*?<\/section>/)?.[0]||'';
const planTools=[...plan.matchAll(/data-open='([^']+)'/g)].map(match=>match[1]);
assert.deepEqual(planTools,['wb','fuel','crosswind','performance','minimums','gono']);
assert.doesNotMatch(html,/<section id='aircraft'/);
assert.match(html,/<h2>Flight Math<\/h2>/);
assert.deepEqual([...html.matchAll(/data-math-tool='([^']+)'/g)].map(match=>match[1]),['density','toc','tod']);
for(const id of ['mathToolDensity','mathToolToc','mathToolTod'])assert.match(html,new RegExp(`id='${id}'`));
assert.deepEqual([...html.matchAll(/id='tab-([^']+)'/g)].map(match=>match[1]),['route','plan','airport','craft','more']);
assert.match(html,/<section id='more'[\s\S]*data-open='zulu'/);
assert.match(html,/<section id='zulu'/);
assert.doesNotMatch(html,/id='tab-zulu'/);
assert.match(html,/padding-bottom:calc\(var\(--nav-height\)/);
console.log('Plan and responsive navigation structure passed.');
