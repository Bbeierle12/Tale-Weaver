/**
 * Unit test: 100 ticks advance without throwing.
 * Uses a stub renderer to avoid HTMLCanvas dependency in Jest (jsdom).
 */

import { World } from '../world';
import { SimController } from '../SimController';
import { rng, setSeed } from '../utils/random';

class DummyRenderer {
  /* eslint-disable @typescript-eslint/no-empty-function */
  draw() {}
}

describe('SimController deterministic loop', () => {
  it('advances 100 ticks without error', () => {
    setSeed(1);
    const world = new World();
    // Populate world for test since constructor is now empty.
    for (let i = 0; i < 10; i++) {
      world.spawnAgent(rng() * world.width, rng() * world.height);
    }
    const render = new DummyRenderer() as any; // satisfies interface
    const sim = new SimController(world, render);

    // monkey‑patch internal loop to avoid RAF / use virtual time
    let now = 0;
    for (let i = 0; i < 100; i++) {
      now += 16; // 60 FPS ≈ 16 ms
      (sim as any).loop(now); // call private loop directly
    }
    expect(world.tick).toBe(100);
  });
});
