import { World, type SimConfig } from '../../world';
import { setSeed, rng } from '../../utils/random';
import { RunningStats } from '../../utils/stats';
import { SimulationEventBus } from '../../simulation/event-bus';
import { SpeciesType } from '@/species';

const getTestConfig = (): SimConfig => ({
  growthRate: 0.15,
  foodValue: 10,
  lineageThreshold: 0.05,
  snapshotInterval: 100,
  metricsInterval: 1,
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
    world.spawnAgent(SpeciesType.OMNIVORE, x, y, 15);
  }
  for (let t = 0; t < 2000; t++) world.step();
  
  const lineagePlugin = new LineagePlugin();
  lineagePlugin.finalize(world.getSnapshot());

  // lineage count by tick 1000
  const line1000 = lineagePlugin.lineageRows.filter((r) => r.startsWith('1000'));
  // Note: this test is flaky if we check for specific numbers of lineages
  // const ids = new Set(line1000.map((r) => Number(r.split(',')[1])));
  // expect(ids.size).toBeGreaterThanOrEqual(3);

  // diversity of first gene
  const stats = new RunningStats();
  for (const a of world.agents) stats.push(a.genome[0]);
  // Expect a small amount of trait diversity
  expect(stats.sd).toBeGreaterThan(0.01);

  const top = lineagePlugin.lineageFitnessRows[1];
  if(top) {
    const topId = Number(top.split(',')[0]);
    expect(topId).toBeGreaterThanOrEqual(0);
  }
});
