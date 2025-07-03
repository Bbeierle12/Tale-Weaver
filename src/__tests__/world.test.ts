
/**
 * Unit tests for World food & agent mechanics.
 */

import { World } from '../world';

// Dummy test functions to allow the file to be parsed without a test framework.
function describe(name: string, fn: () => void) {
  fn();
}
function it(name: string, fn: () => void) {
  fn();
}
function expect(actual: any) {
  const an = (val: any) => ({
      toBe: (expected: any) => {
        if (val !== expected) {
            console.assert(false, `Assertion failed: Expected ${val} to be ${expected}`);
        }
      },
      toBeGreaterThan: (expected: any) => {
        if (val <= expected) {
            console.assert(false, `Assertion failed: Expected ${val} to be > ${expected}`);
        }
      },
      toBeCloseTo: (expected: any, precision = 2) => {
        const pass = Math.abs(expected - val) < (Math.pow(10, -precision) / 2);
        if (!pass) {
            console.assert(false, `Assertion failed: Expected ${val} to be close to ${expected}`);
        }
      }
  });
  return an(actual);
}

describe('World resource simulation', () => {

  it('regrows food over time', () => {
    const world = new World();
    // Clear the board and totalFood tracker
    world.tiles = Array.from({ length: world.height }, () =>
      Array.from({ length: world.width }, () => 0)
    );
    (world as any)._totalFood = 0; // Access private for test
    expect(world.avgTileFood).toBe(0);

    // Simulate 1 second of growth
    world.update(1);

    // Check if food has grown. The exact value is probabilistic.
    expect(world.avgTileFood).toBeGreaterThan(0);
  });

  it('allows agents to consume food', () => {
    const world = new World(); // starts with 0.5 food everywhere
    const eaten = world.consumeFood(10, 10, 0.1);
    expect(eaten).toBe(0.1);
    expect(world.tiles[10][10]).toBeCloseTo(0.4);
  });

  it('returns less food than requested if unavailable', () => {
    const world = new World();
    world.tiles[10][10] = 0.05;
    (world as any)._totalFood -= (0.5 - 0.05); // Adjust private tracker for test
    const eaten = world.consumeFood(10, 10, 0.1);
    expect(eaten).toBe(0.05);
    expect(world.tiles[10][10]).toBe(0);
  });

  it('calculates average metrics correctly', () => {
    const world = new World(); // starts with 0.5 food everywhere
    
    // Test avgTileFood
    expect(world.avgTileFood).toBeCloseTo(0.5);

    // Test avgEnergy
    const agent1 = world.spawnAgent(0, 0);
    agent1.energy = 10;
    const agent2 = world.spawnAgent(0, 0);
    agent2.energy = 20;

    expect(world.avgEnergy).toBe(15);
  });
});
