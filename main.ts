// Offline causal forecast: conservative drift chosen by trailing holdouts.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function median(values: number[]): number {
  const a = [...values].sort((a, b) => a - b);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

export function bounded(value: number): number {
  return Math.round(Math.max(0.00001, Math.min(9999999.99999, value)) * 100000) / 100000;
}

// Robust slopes use hourly changes; no clock, case ID, or future data enters.
export function drift(prices: number[], end: number, hours: number, horizon: number): number {
  const changes: number[] = [];
  for (let t = end; t >= Math.max(60, end - hours * 60 + 1); t -= 60) {
    changes.push(prices[t] - prices[t - 60]);
  }
  return changes.length ? median(changes) * horizon / 60 : 0;
}

export function forecast(prices: number[], horizon = 240): number {
  if (!Array.isArray(prices) || !prices.length || prices.some(x => !Number.isFinite(x) || x <= 0)) {
    throw new Error('Expected a nonempty sequence of positive finite prices');
  }
  if (!Number.isInteger(horizon) || horizon <= 0) throw new Error('Invalid horizon');
  const last = prices.length - 1;
  if (prices.length < 1440 + horizon) return bounded(prices[last]);
  // Fixed candidates, evaluated only against already observed targets.
  const candidates = [{ hours: 12, weight: 0 }, { hours: 12, weight: 0.25 },
    { hours: 24, weight: 0.25 }, { hours: 12, weight: -0.25 }];
  const errors = candidates.map(() => [] as number[]);
  for (let t = Math.max(1440, last - 1920); t + horizon <= last; t += horizon) {
    for (let j = 0; j < candidates.length; j++) {
      const c = candidates[j];
      const guess = prices[t] + c.weight * drift(prices, t, c.hours, horizon);
      errors[j].push(Math.abs(guess - prices[t + horizon]));
    }
  }
  if (errors[0].length < 4) return bounded(prices[last]);
  const means = errors.map(a => a.reduce((s, v) => s + v, 0) / a.length);
  let best = 0;
  for (let j = 1; j < means.length; j++) {
    // Demand an improvement over persistence before taking directional risk.
    if (means[j] < means[best] && means[j] < means[0] * 0.95) best = j;
  }
  const c = candidates[best];
  const raw = c.weight * drift(prices, last, c.hours, horizon);
  // Bound extrapolation by recent observed horizon moves, including shocks.
  const moves: number[] = [];
  for (let t = last; t >= Math.max(horizon, last - 1440); t -= horizon) {
    moves.push(Math.abs(prices[t] - prices[t - horizon]));
  }
  const cap = median(moves) * 0.5;
  const correction = Math.max(-cap, Math.min(cap, raw));
  return bounded(prices[last] + correction);
}

export function run(input: string, output: string): void {
  mkdirSync(output, { recursive: true });
  for (const file of readdirSync(input).filter(f => f.endsWith('.in')).sort()) {
    const c = JSON.parse(readFileSync(join(input, file), 'utf8'));
    const id = file.slice(0, -3);
    if (c.case !== id || c.markets?.length !== 1) throw new Error('Invalid case envelope');
    const price = forecast(c.markets[0].prices, c.horizon_minutes);
    writeFileSync(join(output, `${id}.out`), JSON.stringify({ forecasts: [{ case: id, price }] }) + '\n');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  run(process.env.MAKEFUN_INPUT_DIR ?? '/input', process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
}
