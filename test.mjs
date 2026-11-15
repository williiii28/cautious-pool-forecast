import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { forecast, bounded, median } from './main.ts';

assert.equal(median([3, 1, 2]), 2);
assert.equal(median([4, 1, 2, 3]), 2.5);
assert.equal(bounded(-1), 0.00001);
assert.equal(bounded(1e10), 9999999.99999);
assert.equal(forecast([60000]), 60000);
assert.equal(forecast(Array(4320).fill(60000)), 60000);
assert.throws(() => forecast([]));
assert.throws(() => forecast([NaN]));
assert.throws(() => forecast([60000], 0));
const rising = Array.from({ length: 4320 }, (_, i) => 60000 + i);
const falling = rising.map(x => 130000 - x);
assert(forecast(rising) > rising.at(-1));
assert(forecast(falling) < falling.at(-1));
assert.equal(forecast(rising), forecast(rising));
const spike = Array(4320).fill(60000); spike[4319] = 61000;
assert(Number.isFinite(forecast(spike)));

const temp = mkdtempSync(join(tmpdir(), 'causal-forecast-test-'));
try {
  const input = join(temp, 'input'); mkdirSync(input);
  writeFileSync(join(input, 'NOTICE.txt'), 'ignored');
  for (const id of ['z', 'a']) writeFileSync(join(input, `${id}.in`), JSON.stringify({case:id,horizon_minutes:240,markets:[{prices:rising}]}));
  let elapsed = 0;
  for (const pass of ['one', 'two']) {
    const start = performance.now();
    const result = spawnSync(process.execPath, ['main.ts'], {cwd:import.meta.dirname,env:{...process.env,MAKEFUN_INPUT_DIR:input,MAKEFUN_OUTPUT_DIR:join(temp,pass)},encoding:'utf8',timeout:8000});
    elapsed = Math.max(elapsed, performance.now() - start);
    assert.equal(result.status, 0, result.stderr);
  }
  for (const id of ['a', 'z']) {
    const a = readFileSync(join(temp,'one',`${id}.out`),'utf8');
    assert.equal(a,readFileSync(join(temp,'two',`${id}.out`),'utf8'));
    const d = JSON.parse(a); assert.deepEqual(Object.keys(d),['forecasts']);
    assert.equal(d.forecasts.length,1); assert.equal(d.forecasts[0].case,id);
    assert(d.forecasts[0].price > 0 && d.forecasts[0].price < 1e7);
  }
  console.log(JSON.stringify({protocol:'passed',determinism:'byte-identical',max_two_case_process_ms:elapsed}));
} finally { rmSync(temp,{recursive:true}); }

if (process.argv[2]) {
  const files = readdirSync(process.argv[2]).filter(x=>x.endsWith('.in')).sort();
  const cases = files.map(f=>JSON.parse(readFileSync(join(process.argv[2],f),'utf8')));
  // Each case's internal targets are observed; no sealed answer is inferred.
  // The first case alone avoids repeated observations across overlapping cases.
  const prices = cases[0].markets[0].prices;
  const rows = [];
  for(let t=1920;t+240<prices.length;t+=240) {
    const history=prices.slice(0,t+1), target=prices[t+240];
    rows.push({checkpoint:t,prediction:forecast(history),target,baseline:prices[t]});
  }
  const mae = key=>rows.reduce((s,r)=>s+Math.abs(r[key]-r.target),0)/rows.length;
  console.log(JSON.stringify({chronological_holdout_cases:rows.length,forecast_mae_dollars:mae('prediction'),persistence_mae_dollars:mae('baseline'),rows},null,2));
  const predictions=cases.map(c=>({case:c.case,prediction:forecast(c.markets[0].prices),baseline:c.markets[0].prices.at(-1)}));
  console.log(JSON.stringify({practice_predictions:predictions,notice:'No local official score; targets are sealed.'},null,2));
}
