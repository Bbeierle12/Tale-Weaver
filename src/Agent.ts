// --- src/Agent.ts ---
import { World } from './world';

export class Agent {
  public x: number;
  public y: number;
  public energy: number;
  public dead: boolean = false;
  // Agent behavior parameters
  private static readonly MOVE_SPEED: number = 1.0;        // movement speed (units per second)
  private static readonly METABOLIC_COST: number = 1.0;    // energy drained per second
  private static readonly FOOD_CONSUMPTION_AMOUNT: number = 0.05;
  private static readonly FOOD_ENERGY_VALUE: number = 10.0;

  constructor(x = 0, y = 0, energy = 10) {
    this.x = x;
    this.y = y;
    this.energy = energy;
  }

  /** Update agent: move randomly, lose energy, consume food, possibly die. */
  update(dt: number, world: World): void {
    if (this.dead) return;  // skip update if already dead

    // Random-walk movement: small step in a random direction
    const angle = Math.random() * 2 * Math.PI;
    const step = Agent.MOVE_SPEED * dt;
    this.x += Math.cos(angle) * step;
    this.y += Math.sin(angle) * step;
    // Wrap around world boundaries
    if (this.x < 0) this.x += world.width;
    else if (this.x >= world.width) this.x -= world.width;
    if (this.y < 0) this.y += world.height;
    else if (this.y >= world.height) this.y -= world.height;

    // Metabolic energy cost for existing (starvation pressure)
    this.energy -= Agent.METABOLIC_COST * dt;

    // Consume food from current tile to regain energy
    const tx = this.x | 0;   // fast floor
    const ty = this.y | 0;
    const eaten = world.consumeFood(tx, ty, Agent.FOOD_CONSUMPTION_AMOUNT);
    if (eaten > 0) {
      this.energy += eaten * Agent.FOOD_ENERGY_VALUE;
    }

    // Check for death by starvation
    if (this.energy <= 0) {
      this.dead = true;
      this.energy = 0;
    }
  }
}
