import { World } from '../../world';
import { setSeed } from '../../utils/random';
import { RunningStats } from '../../utils/stats';

test('lineage diversification and fitness', () => {
  setSeed(42);
  const world = new World();
  for (let i = 0; i < 5; i++) {
    world.spawnAgent(
      Math.floor(Math.random() * world.width),
      Math.floor(Math.random() * world.height),
      15,
    );
  }
  for (let t = 0; t < 20000; t++) world.step();
  world.finalizeLineages();

  // lineage count by tick 10000
  const line10000 = world.lineageRows.filter((r) => r.startsWith('10000'));
  const ids = new Set(line10000.map((r) => Number(r.split(',')[1])));
  expect(ids.size).toBeGreaterThanOrEqual(3);

  // diversity of speed
  const stats = new RunningStats();
  for (const a of world.agents) stats.push(a.speed);
  expect(stats.sd).toBeGreaterThan(0.2);

  const top = world.lineageFitnessRows[1];
  const topId = Number(top.split(',')[0]);
  expect(topId).not.toBe(0);
});
