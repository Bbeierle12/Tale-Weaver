import { SimController } from '../SimController';
import { World, type SimConfig } from '../world';
import { Renderer } from '../renderer';
import { setSeed } from '../utils/random';
import { SimulationEventBus } from '../simulation/event-bus';

// Mock the Renderer class since we don't need to test its functionality here.
jest.mock('../renderer', () => {
  return {
    Renderer: jest.fn().mockImplementation(() => {
      return {
        draw: jest.fn(),
        dispose: jest.fn(),
      };
    }),
  };
});

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

describe('SimController deterministic loop', () => {
  beforeEach(() => {
    // Reset the mock before each test
    (Renderer as jest.Mock).mockClear();
    setSeed(1);
  });

  it('advances 100 ticks without error', () => {
    const bus = new SimulationEventBus();
    const config = getTestConfig();
    const world = new World(bus, config);
    const renderer = new Renderer(null as any, world); // The canvas is null in a test environment.
    const sim = new SimController(world, renderer);

    // The main loop is private, so we can't call it directly.
    // Instead, we can check the tickCount after a certain amount of time has passed.
    for (let i = 0; i < 100; i++) {
      sim.tick();
    }
    expect(world.tickCount).toBe(100);
  });
});
