// Jest tests for resource field regrowth, consumption, and metrics
import { World } from '../world';
import { Agent } from '../Agent';

describe('Resource Field', () => {
  it('F2: Regrowth adds food to tiles over time', () => {
    // Create a small world (1x1) for deterministic regrow
    const world = new World(1, 1);
    // Start with no food in the tile
    world.tiles[0][0] = 0;
    (world as any)._totalFood = 0;
    // Simulate 1 second of world update (regrow)
    world.update(1); // calls regrow internally
    const foodLevel = world.tiles[0][0];
    // The exact growth is probabilistic due to rounding `events`, so we check a range.
    expect(foodLevel).toBeGreaterThan(0);
  });

  it('F3: Consumption reduces tile food and returns eaten amount', () => {
    const world = new World(1, 1);
    world.tiles[0][0] = 0.5;
    (world as any)._totalFood = 0.5;
    const eaten = world.consumeFood(0, 0, 0.1);
    // It should consume the requested amount (0.1) since available was 0.5
    expect(eaten).toBeCloseTo(0.1, 5);
    // The tile's food should now be approximately 0.4
    expect(world.tiles[0][0]).toBeCloseTo(0.4, 5);
  });

  it('F5: HUD metrics (average food and energy) are computed correctly', () => {
    const world = new World(2, 2);
    // Manually set tile food levels
    world.tiles = [
      [1.0, 0.5],
      [0.2, 0.8]
    ];
    // Manually update the private _totalFood for the test
    (world as any)._totalFood = 1.0 + 0.5 + 0.2 + 0.8;
    
    // Create two agents with known energy values
    const agent1 = new Agent(0, 0, 5);
    const agent2 = new Agent(1, 1, 15);
    world.agents = [agent1, agent2];
    
    // Calculate expected averages
    const expectedAvgFood = (1.0 + 0.5 + 0.2 + 0.8) / 4;
    const expectedAvgEnergy = (5 + 15) / 2;
    
    // Check world metrics
    expect(world.avgTileFood).toBeCloseTo(expectedAvgFood, 5);
    expect(world.avgEnergy).toBeCloseTo(expectedAvgEnergy, 5);
  });
});
