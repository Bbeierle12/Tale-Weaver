// ────────────────────────────────────────────────────────────────
// --- benchmarks/run.ts -----------------------------------------
// Headless 500‑tick demo that writes ≤ 200 kB gzipped logs
// ────────────────────────────────────────────────────────────────
import { Agent } from '../src/Agent';
import { World, type SimConfig } from '../src/world';
import { rng, setSeed } from '../src/utils/random';
import { saveLogs } from './save';
import { SimulationEventBus } from '../src/simulation/event-bus';

const getConfig = (): SimConfig => ({
  growthRate: 0.15,
  biteEnergy: 1,
  foodValue: 10,
  birthThreshold: 20,
  birthCost: 9,
  deathThreshold: 1e-3,
  moveCostPerStep: 0.02,
  basalRate: 0.01,
  histBins: 10,
  snapshotInterval: 100,
  forageBuf: 20_000,
  metricsInterval: 1,
  hotspotCount: 5,
  hotspotRadius: 20,
  mutationRates: {
    speed: 0.01,
    vision: 0.01,
    basal: 0.01,
  },
  lineageThreshold: 0.05,
  histogramInterval: 100,
});

async function main(): Promise<void> {
  setSeed(1); // for deterministic runs
  const bus = new SimulationEventBus();
  const config = getConfig();
  const world = new World(bus, config);

  // Seed population
  for (let i = 0; i < 25; i++) {
    world.spawnAgent(
      Math.floor(rng() * world.width),
      Math.floor(rng() * world.height),
    );
  }

  // Simulate 500 ticks
  for (let t = 0; t < 500; t++) world.step();

  await saveLogs(world);

  const last = world.series[world.series.length - 1].split(',');
  const [moveDebit, basalDebit] = [Number(last[6]), Number(last[7])];
  if (moveDebit <= basalDebit) {
    throw new Error(
      'Acceptance check failed: moveDebit must exceed basalDebit',
    );
  }
  console.log('✓ EcoSysX v0.3 run complete — logs written');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
