import { World, type SimConfig } from '../world';
import { setSeed } from '../utils/random';
import { Agent } from '../Agent';
import { SimulationEventBus } from '../simulation/event-bus';
import { SpeciesType } from '../species';

const getTestConfig = (): SimConfig => ({
  growthRate: 0.15,
  foodValue: 10,
  birthThreshold: 20,
  birthCost: 9,
  deathThreshold: 1e-3,
  moveCostPerStep: 0.02,
  basalRate: 0.01,
  histBins: 10,
  snapshotInterval: 1000,
  forageBuf: 20_000,
  metricsInterval: 1,
  hotspotCount: 5,
  hotspotRadius: 20,
  mutationRates: {
    speed: 0.0,
    vision: 0.0,
    basal: 0.0,
  },
  lineageThreshold: 0.05,
  histogramInterval: 100,
});

test('population grows and agents die from starvation over time', () => {
  setSeed(42);
  const bus = new SimulationEventBus();
  const world = new World(bus, getTestConfig());
  for (let i = 0; i < 5; i++) {
    const x = Math.floor(Math.random() * world.width);
    const y = Math.floor(Math.random() * world.height);
    world.spawnAgent(SpeciesType.OMNIVORE, x, y, 15);
  }

  let initialPop = world.agents.length;
  expect(initialPop).toBe(5);

  // Run for enough ticks to expect births
  for (let t = 0; t < 500; t++) world.step();

  expect(world.agents.length).toBeGreaterThan(initialPop);

  // Run for a long time to observe starvation
  for (let t = 0; t < 5000; t++) world.step();
  expect(world.agents.length).toBe(0);
});
