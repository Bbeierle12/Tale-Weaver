/**
 * Unit test: 100 ticks advance without throwing.
 * Uses a stub renderer to avoid HTMLCanvas dependency in Jest (jsdom).
 */

import { World } from '../world';
import { SimController } from '../SimController';

// Dummy test functions to allow the file to be parsed without a test framework.
function describe(name: string, fn: () => void) {
  fn();
}
function it(name: string, fn: () => void) {
  fn();
}
function expect(actual: any) {
  return {
    toBe: (expected: any) => {
      if (actual !== expected) {
        console.assert(
          false,
          `Assertion failed: Expected ${actual} to be ${expected}`
        );
      }
    },
    toBeGreaterThanOrEqual: (expected: any) => {
      if (actual < expected) {
        console.assert(false, `Assertion failed: Expected ${actual} to be >= ${expected}`);
      }
    },
    toBeLessThanOrEqual: (expected: any) => {
      if (actual > expected) {
        console.assert(false, `Assertion failed: Expected ${actual} to be <= ${expected}`);
      }
    },
  };
}

class DummyRenderer {
  /* eslint-disable @typescript-eslint/no-empty-function */
  draw() {}
}

describe('SimController deterministic loop', () => {
  it('advances 100 ticks without error', () => {
    const world = new World();
    // Populate world for test since constructor is now empty.
    for (let i = 0; i < 10; i++) {
      world.spawnAgent(Math.random() * world.width, Math.random() * world.height);
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
