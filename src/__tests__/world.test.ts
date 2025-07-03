
/**
 * Unit tests for World food & agent mechanics.
 */

import { World } from '../world';
import { setSeed } from '../utils/random';
import { SIM_CONFIG } from '../config';

describe('World resource simulation', () => {
  beforeEach(() => {
    setSeed(1);
  });

  it('regrows food over time', () => {
    const world = new World();
    const initialFood = world.avgTileFood;
    world.step();
    expect(world.avgTileFood).toBeGreaterThan(initialFood);
  });

  it('allows agents to consume food', () => {
    const world = new World(1, 1);
    world.food[0] = 1.0;
    const eaten = world.eatAt(0, 0, 0.1);
    expect(eaten).toBe(0.1);
    expect(world.food[0]).toBeCloseTo(0.9);
  });

  it('returns less food than requested if unavailable', () => {
    const world = new World(1, 1);
    world.food[0] = 0.05;
    const eaten = world.eatAt(0, 0, 0.1);
    expect(eaten).toBe(0.05);
    expect(world.food[0]).toBe(0);
  });

  it('calculates average metrics correctly', () => {
    const world = new World();
    world.food.fill(SIM_CONFIG.foodValue);
    
    // Test avgTileFood
    expect(world.avgTileFood).toBeCloseTo(SIM_CONFIG.foodValue);

    // Test avgEnergy
    const agent1 = world.spawnAgent(0, 0);
    agent1.energy = 10;
    const agent2 = world.spawnAgent(0, 0);
    agent2.energy = 20;

    expect(world.avgEnergy).toBe(15);
  });
});
