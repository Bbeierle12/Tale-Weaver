import { SimController } from '../SimController';
import { World } from '../world';
import { Renderer } from '../renderer';
import { setSeed } from '../utils/random';

// Mock the Renderer class since we don't need to test its functionality here.
jest.mock('../renderer', () => {
  return {
    Renderer: jest.fn().mockImplementation(() => {
      return {
        draw: jest.fn(),
      };
    }),
  };
});

describe('SimController deterministic loop', () => {
  beforeEach(() => {
    // Reset the mock before each test
    (Renderer as jest.Mock).mockClear();
    setSeed(1);
  });

  it('advances 100 ticks without error', () => {
    const world = new World();
    const renderer = new Renderer(world, null); // The canvas is null in a test environment.
    const sim = new SimController(world, renderer);

    // The main loop is private, so we can't call it directly.
    // Instead, we can check the tickCount after a certain amount of time has passed.
    for (let i = 0; i < 100; i++) {
      sim.tick();
    }
    expect(world.tickCount).toBe(100);
  });
});
