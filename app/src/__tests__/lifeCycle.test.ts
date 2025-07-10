import { World, type SimConfig } from '../world';
import { setSeed, rng } from '../utils/random';
import { SimulationEventBus } from '../simulation/event-bus';
import { SpeciesType } from '@/species';

const getTestConfig = (): SimConfig => ({
  growthRate: 0.1,
  foodValue: 10,
  lineageThreshold: 0.05,
  snapshotInterval: 100,
  metricsInterval: 1,
  histogramInterval: 1000,
});

test('population grows and agents die from starvation over time', () => {
  // Set a seed for deterministic random numbers
  setSeed(1);
  const bus = new SimulationEventBus();
  const config = getTestConfig();
  const world = new World(bus, config);

  // Spawn initial agents to kickstart the simulation, same as the UI.
  for (let i = 0; i < 50; i++) {
    world.spawnAgent(
        SpeciesType.OMNIVORE,
        rng() * world.width, 
        rng() * world.height, 
        15
    );
  }

  // Run the simulation for enough ticks to observe the full life cycle.
  for (let t = 0; t < 3000; t++) {
    world.step();
  }

  // After many ticks, we expect that some agents have had enough energy to
  // reproduce, and some will have run out of energy and died.
  expect(world.birthsTotal).toBeGreaterThan(0);
  expect(world.deathsTotal).toBeGreaterThan(0);
});
