import { World } from '../../world';
import { setSeed, rng } from '../../utils/random';
import { RunningStats } from '../../utils/stats';

test('lineage diversification and fitness', () => {
  setSeed(42);
  const world = new World();
  for (let i = 0; i < 5; i++) {
    // Use the deterministic RNG to avoid flakey tests
    const x = Math.floor(rng() * world.width);
    const y = Math.floor(rng() * world.height);
    world.spawnAgent(x, y, 15);
  }
  for (let t = 0; t < 2000; t++) world.step();
  world.finalizeLineages();

  // lineage count by tick 10000
  const line10000 = world.lineageRows.filter((r) => r.startsWith('1000'));
  const ids = new Set(line10000.map((r) => Number(r.split(',')[1])));
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
