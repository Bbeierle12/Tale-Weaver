// CLI: tsx bench/stress.ts --ticks=1000
// Runs a small grid‑sweep over growthRate × moveCostPerStep × startPop.
// Outputs stress-summary.csv in project root.

import fs from 'fs';
import { World } from '../src/world';
import { SIM_CONFIG } from '../src/config';
import { rng, setSeed } from '../src/utils/random';

interface ParamSet {
  growthRate: number;
  moveCost: number;
  startPop: number;
  id: string;
}

// Allow overriding ticks via command line argument, e.g., --ticks=1000
const ticksArg = process.argv.find(arg => arg.startsWith('--ticks='));
const ticks = ticksArg ? Number(ticksArg.split('=')[1]) : 1000;

console.log(`Running stress test for ${ticks} ticks per run.`);

const growthRates = [0.05, 0.10, 0.15];
const moveCosts   = [0.01, 0.02, 0.04];
const startPops   = [50, 200];

const header = [
  'id','growthRate','moveCost','startPop',
  'peakPop','tickPeak','finalPop',
  'minMeanFood','tickMinFood',
  'finalGini'
].join(',');
const rows: string[] = [header];

function cloneConfig() { return JSON.parse(JSON.stringify(SIM_CONFIG)); }

function runOne(ps: ParamSet) {
  // Set a unique seed for each run for determinism
  setSeed(ps.growthRate * 1000 + ps.moveCost * 1000 + ps.startPop);

  const originalConfig = cloneConfig();
  const cfg = cloneConfig();
  cfg.growthRate = ps.growthRate;
  cfg.moveCostPerStep = ps.moveCost;
  // inject config overrides
  Object.assign(SIM_CONFIG, cfg);

  const world = new World();
  // seed agents
  for(let i=0; i < ps.startPop; i++) {
    world.spawnAgent(rng() * world.width, rng() * world.height);
  }

  let peakPop = world.agents.length;
  let tickPeak = 0;
  let minMeanFood = world.avgTileFood;
  let tickMinFood = 0;

  for(let t=0; t < ticks; t++){
    world.step();
    const pop = world.agents.length;
    if(pop > peakPop){ peakPop = pop; tickPeak = t; }
    const mf = world.avgTileFood;
    if(mf < minMeanFood){ minMeanFood = mf; tickMinFood = t; }
    if (pop === 0) break; // End early if population dies out
  }
  
  const lastHistory = world.history[world.history.length-1];
  rows.push([
    ps.id,
    ps.growthRate,
    ps.moveCost,
    ps.startPop,
    peakPop,
    tickPeak,
    world.agents.length,
    minMeanFood.toFixed(4),
    tickMinFood,
    lastHistory ? lastHistory.foodGini.toFixed(4) : '0.0000'
  ].join(','));

  // Restore original config
  Object.assign(SIM_CONFIG, originalConfig);
}

let count = 0;
const totalRuns = growthRates.length * moveCosts.length * startPops.length;
for(const g of growthRates){
  for(const m of moveCosts){
    for(const p of startPops){
      runOne({growthRate:g, moveCost:m, startPop:p, id:`run${++count}`});
      console.log(`✔︎ run ${count}/${totalRuns} done`);
    }
  }
}

fs.writeFileSync('stress-summary.csv', rows.join('\n'));
console.log(`\nSaved stress-summary.csv with ${rows.length - 1} rows.`);
