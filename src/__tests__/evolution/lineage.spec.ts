import { World, type SimConfig } from '../../world';
import { setSeed, rng } from '../../utils/random';
import { RunningStats } from '../../utils/stats';
import { SimulationEventBus } from '../../simulation/event-bus';

const getTestConfig = (): SimConfig => ({
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

test('lineage diversification and fitness', () => {
  setSeed(42);
  const bus = new SimulationEventBus();
  const config = getTestConfig();
  const world = new World(bus, config);
  for (let i = 0; i < 5; i++) {
    // Use the deterministic RNG to avoid flakey tests
    const x = Math.floor(rng() * world.width);
    const y = Math.floor(rng() * world.height);
    world.spawnAgent(x, y, 15);
  }
  for (let t = 0; t < 2000; t++) world.step();
  world.finalizeLineages();

  // lineage count by tick 1000
  const line1000 = world.lineageRows.filter((r) => r.startsWith('1000'));
  const ids = new Set(line1000.map((r) => Number(r.split(',')[1])));
  expect(ids.size).toBeGreaterThanOrEqual(3);

  // diversity of speed
  const stats = new RunningStats();
  for (const a of world.agents) stats.push(a.speed);
  // Expect a small amount of trait diversity
  expect(stats.sd).toBeGreaterThan(0.01);

  const top = world.lineageFitnessRows[1];
  const topId = Number(top.split(',')[0]);
  expect(topId).toBeGreaterThanOrEqual(0);
});
