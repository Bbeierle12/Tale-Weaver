/**
 * Unit tests for World food & agent mechanics.
 */

import { World, type SimConfig } from '../world';
import { setSeed } from '../utils/random';
import { SimulationEventBus } from '../simulation/event-bus';

const getTestConfig = (): SimConfig => ({
  growthRate: 0.1,
  biteEnergy: 1,
  foodValue: 10,
  birthThreshold: 20,
  birthCost: 10,
  deathThreshold: 0,
  moveCostPerStep: 0.01,
  basalRate: 0.01,
  histBins: 10,
  snapshotInterval: 100,
  forageBuf: 1000,
  metricsInterval: 1,
  hotspotCount: 3,
  hotspotRadius: 15,
  mutationRates: {
    speed: 0.01,
    vision: 0.01,
    basal: 0.01,
  },
  lineageThreshold: 0.05,
  histogramInterval: 100,
});

describe('World resource simulation', () => {
  let bus: SimulationEventBus;
  let config: SimConfig;

  beforeEach(() => {
    setSeed(1);
    bus = new SimulationEventBus();
    config = getTestConfig();
  });

  it('regrows food over time', () => {
    const world = new World(bus, config, 1, 1);
    world.food.fill(config.foodValue - 1);
    const initialFood = world.avgTileFood;
    world.step();
    expect(world.avgTileFood).toBeGreaterThan(initialFood);
  });

  it('allows agents to consume food', () => {
    const world = new World(bus, config, 1, 1);
    world.food[0] = 1.0;
    const eaten = world.consumeFood(0, 0, 0.1);
    expect(eaten).toBe(0.1);
    expect(world.food[0]).toBeCloseTo(0.9);
  });

  it('returns less food than requested if unavailable', () => {
    const world = new World(bus, config, 1, 1);
    world.food[0] = 0.05;
    const eaten = world.consumeFood(0, 0, 0.1);
    expect(eaten).toBeCloseTo(0.05);
    expect(world.food[0]).toBe(0);
  });

  it('calculates average metrics correctly', () => {
    const world = new World(bus, config);
    world.food.fill(config.foodValue);

    // Test avgTileFood
    expect(world.avgTileFood).toBeCloseTo(config.foodValue);

    // Test avgEnergy
    const agent1 = world.spawnAgent(0, 0);
    agent1.energy = 10;
    const agent2 = world.spawnAgent(0, 0);
    agent2.energy = 20;

    expect(world.avgEnergy).toBe(15);
  });
});
