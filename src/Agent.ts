import { World } from './world';
import { rng } from '@/utils/random';
import { mapLinear, mutateGenome, randomGenome } from '@/utils/genetics';

let nextAgentId = 0;

export class Agent {
  public readonly id: number;
  public x: number;
  public y: number;
  public energy: number;
  public dead: boolean = false;
  public genome: Float32Array;
  public angle: number;

  // Agent behavior parameters, now derived from genome
  public moveSpeed!: number;
  public metabolicCost!: number;
  public foodConsumptionAmount!: number;
  public reproductionThreshold!: number;
  public color!: string;
  public sensoryRadius!: number; // User called this vision
  public turningSpeed!: number;
  private readonly deathThreshold = 1e-3;

  constructor(x = 0, y = 0, energy = 10, genome?: Float32Array) {
    this.id = nextAgentId++;
    this.x = x;
    this.y = y;
    this.energy = energy;
    this.genome = genome || randomGenome();
    this.angle = rng() * 2 * Math.PI;
    this.applyGenome();
  }

  /** Decode genome into agent properties. */
  private applyGenome(): void {
    // Trait mapping based on user specification
    this.moveSpeed = mapLinear(this.genome[0], 2, 6);             // Gene 0: speed
    this.sensoryRadius = mapLinear(this.genome[1], 10, 20);       // Gene 1: vision
    this.metabolicCost = mapLinear(this.genome[2], 0.05, 0.2);    // Gene 2: metabolicCost
    this.reproductionThreshold = mapLinear(this.genome[3], 15, 30); // Gene 3: reproThreshold
    
    // Other traits
    this.foodConsumptionAmount = mapLinear(this.genome[4], 0.02, 0.1);

    // Aesthetics
    const r = Math.floor(mapLinear(this.genome[5], 100, 255));
    const g = Math.floor(mapLinear(this.genome[6], 100, 255));
    const b = Math.floor(mapLinear(this.genome[7], 100, 255));
    this.color = `rgb(${r},${g},${b})`;

    // Foraging traits
    this.turningSpeed = mapLinear(this.genome[9], Math.PI * 0.25, Math.PI * 2);
  }

  /** Update agent: move, lose energy, consume, reproduce, possibly die. Returns a new agent if one was born. */
  update(dt: number, world: World): Agent | null {
    if (this.dead) return null;

    // --- SENSE and DECIDE ---
    let bestFoodX = -1;
    let bestFoodY = -1;
    let maxFood = -1;

    // Sample 8 points in a 180-degree arc in front of the agent
    for (let i = 0; i < 8; i++) {
      const sampleAngle = this.angle + (rng() - 0.5) * Math.PI;
      const sx = this.x + Math.cos(sampleAngle) * this.sensoryRadius;
      const sy = this.y + Math.sin(sampleAngle) * this.sensoryRadius;
      
      // Sense within world boundaries
      if (sx < 0 || sx >= world.width || sy < 0 || sy >= world.height) continue;

      const tx = sx | 0;
      const ty = sy | 0;
      
      const food = world.tiles[ty][tx];
      if (food > maxFood) {
        maxFood = food;
        bestFoodX = sx;
        bestFoodY = sy;
      }
    }
    
    // --- STEER and MOVE ---
    if (bestFoodX !== -1) { // If food is found, steer towards it
        const targetAngle = Math.atan2(bestFoodY - this.y, bestFoodX - this.x);
        let angleDiff = targetAngle - this.angle;
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        const turn = Math.max(-this.turningSpeed * dt, Math.min(this.turningSpeed * dt, angleDiff));
        this.angle += turn;
    } else { // Otherwise, wander
        this.angle += (rng() - 0.5) * Math.PI * 0.25 * dt;
    }

    const step = this.moveSpeed * dt;
    this.x += Math.cos(this.angle) * step;
    this.y += Math.sin(this.angle) * step;

    // World wrapping
    if (this.x < 0) this.x += world.width;
    else if (this.x >= world.width) this.x -= world.width;
    if (this.y < 0) this.y += world.height;
    else if (this.y >= world.height) this.y -= world.height;

    // Metabolism
    this.energy -= this.metabolicCost * dt;

    // Death by starvation
    if (this.energy <= this.deathThreshold) {
      this.dead = true;
      this.energy = 0;
      return null;
    }

    // Consumption
    const tx = this.x | 0;
    const ty = this.y | 0;
    const eaten = world.consumeFood(tx, ty, this.foodConsumptionAmount);
    if (eaten > 0) {
      this.energy += eaten * 10.0; // food energy value is 10
      world.recordMove(world.tick, this.id, tx, ty, eaten);
    }

    // Reproduction
    if (this.energy >= this.reproductionThreshold) {
      this.energy -= 10; // Fixed cost of birth
      const childGenome = mutateGenome(this.genome); // Create mutated copy
      
      // Spawn child nearby
      const jitterX = this.x + (rng() - 0.5);
      const jitterY = this.y + (rng() - 0.5);
      
      // Newborn starts with the energy it cost the parent
      return new Agent(jitterX, jitterY, 10, childGenome);
    }

    return null;
  }
}
