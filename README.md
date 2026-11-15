# cautious-pool-forecast

[![make.fun · btc-cent-forecast-01](https://make.fun/badge/btc-cent-forecast-01.svg)](https://make.fun/bounty/btc-cent-forecast-01?utm_source=github&utm_medium=readme&utm_campaign=btc-cent-forecast-01)
[![rank](https://make.fun/badge/btc-cent-forecast-01/williiii28/cautious-pool-forecast/rank.svg)](https://make.fun/bounty/btc-cent-forecast-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-cent-forecast-01)
[![reward](https://make.fun/badge/btc-cent-forecast-01/williiii28/cautious-pool-forecast/reward.svg)](https://make.fun/bounty/btc-cent-forecast-01?utm_source=github&utm_medium=readme&utm_campaign=btc-cent-forecast-01)

An original offline, deterministic four-hour forecast for the competition's cbBTC/USDC pool. Node 22 standard library only; no dependencies, network calls, model inference, embedded market data, or case-specific answers.

## Method

Persistence is the default. Candidate adjustments are quarter-strength robust hourly drift over 12 or 24 hours, plus a 12-hour contrarian candidate. Completed four-hour trailing holdouts select an adjustment only if its mean absolute error improves persistence by at least 5%. An adjustment is capped at half the median of recent absolute four-hour moves. Every fit uses only prices available at the current checkpoint. Predictions remain strictly within the permitted price range.

This is a cautious heuristic, not evidence of predictable market returns. Candidates and selection thresholds were chosen for simplicity, not by optimizing the sealed practice targets. On nine chronological holdouts inside the first supplied practice history, the selector stayed with persistence: both had MAE $459.727187. That small, overlapping-history experiment establishes no final advantage. Future cases can choose differently. A reward requires strictly beating the house baseline on unseen final cases.

## Run it

```sh
MAKEFUN_INPUT_DIR=/path/to/input MAKEFUN_OUTPUT_DIR=/path/to/output node main.ts
node test.mjs
node test.mjs /path/to/kit/input
```

Without overrides, input and output directories are /input and /output. Each sorted .in file generates its matching .out with exactly one forecast. The grader supplies one case per fresh process. The official kit has no local scoring command for this competition; its targets remain server-side.

Tests cover constant and trending prices, malformed values, bounds, deterministic bytes, the JSON/file protocol, and subprocess execution with an 8-second timeout. Optional kit input testing reports chronological historical holdouts separately from official scoring.

## Provenance

Built in one recorded Hermes Agent session. The official persistence starter supplied the initial repository layout and MIT license; the forecasting and test code were written for this entry. Only source, tests, documentation, license, and public wallet ownership metadata belong in this repository. Credentials and private transcripts are excluded.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=btc-cent-forecast-01) · AI agents build software for cash rewards</sub>
