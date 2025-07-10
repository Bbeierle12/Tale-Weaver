import { World } from '../world';
import { Agent } from '../Agent';
import { RunningStats } from '../utils/stats';
import { SimulationEventBus } from '../simulation/event-bus';
import { SpeciesType } from '../species';

const TEST_CONFIG = {
  growthRate: 0.1,
  foodValue: 10,
  birthThreshold: 10,
  birthCost: 5,
  deathThreshold: 0,
  moveCostPerStep: 0.1,
  basalRate: 0.2,
  histBins: 10,
  snapshotInterval: 1000,
  forageBuf: 100,
  metricsInterval: 100,
  hotspotCount: 1,
  hotspotRadius: 10,
  mutationRates: {
    speed: 0,
    vision: 0,
    basal: 0,
  },
  lineageThreshold: 0.1,
  histogramInterval: 100,
};

describe('World resource simulation', () => {
  let world: World;
  let bus: SimulationEventBus;

  beforeEach(() => {
    bus = new SimulationEventBus();
    world = new World(bus, TEST_CONFIG, 10, 10);
  });

  test('food grows back over time', () => {
    // Manually set a tile's food to 0
    const x = 5,
      y = 5;
    const idx = world.idx(x, y);
    world.food[idx] = 0;

    // Simulate a few steps
    for (let i = 0; i < 5; i++) {
      world.step();
    }

    // Expect food to have regrown
    expect(world.food[idx]).toBeGreaterThan(0);
  });

  test('agents consume food', () => {
    const agent = world.spawnAgent(SpeciesType.OMNIVORE, 5, 5, 10);
    const idx = world.idx(5, 5);
    world.food[idx] = 5;

    agent.energy = 5; // Set energy low to trigger eating
    world.step();

    // Agent should have eaten and gained energy
    expect(agent.energy).toBeGreaterThan(5);
    expect(world.food[idx]).toBeLessThan(5);
  });

  test('calculates average metrics correctly', () => {
    world.spawnAgent(SpeciesType.OMNIVORE, 0, 0, 10);
    world.spawnAgent(SpeciesType.OMNIVORE, 1, 1, 20);
    world.spawnAgent(SpeciesType.OMNIVORE, 2, 2, 30);

    expect(world.avgEnergy).toBeCloseTo(20);
  });

  test('agents are removed after death', () => {
    const agent = world.spawnAgent(SpeciesType.OMNIVORE, 5, 5, 1);
    agent.energy = 0; // Set energy to a value that will cause death
    world.step();
    expect(world.agents.length).toBe(0);
  });
});

describe('Agent Interactions', () => {
  let world: World;
  let bus: SimulationEventBus;

  beforeEach(() => {
    bus = new SimulationEventBus();
    world = new World(bus, TEST_CONFIG, 20, 20);
  });

  test('finds nearest agent correctly', () => {
    const agentA = world.spawnAgent(SpeciesType.OMNIVORE, 10, 10);
    const agentB = world.spawnAgent(SpeciesType.OMNIVORE, 12, 10);
    const agentC = world.spawnAgent(SpeciesType.OMNIVORE, 15, 10);

    const nearest = world.findNearestAgent(agentA, (a) => a !== agentA, 10);
    expect(nearest).toBe(agentB);
  });

  test('returns null when no agent is in radius', () => {
    const agentA = world.spawnAgent(SpeciesType.OMNIVORE, 10, 10);
    world.spawnAgent(SpeciesType.OMNIVORE, 25, 10);

    const nearest = world.findNearestAgent(agentA, (a) => a !== agentA, 10);
    expect(nearest).toBeNull();
  });
});
