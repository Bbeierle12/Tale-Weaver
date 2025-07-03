// --- src/Agent.ts ---
import { World } from './world';
import { rng } from '@/utils/random';
import { mapLinear, mutateGenome, randomGenome } from '@/utils/genetics';

export class Agent {
  public x: number;
  public y: number;
  public energy: number;
  public dead: boolean = false;
  public genome: Float32Array;

  // Agent behavior parameters, now derived from genome
  public moveSpeed!: number;
  public metabolicCost!: number;
  public foodConsumptionAmount!: number;
  public reproductionThreshold!: number;
  public offspringEnergyRatio!: number;
  public color!: string;

  constructor(x = 0, y = 0, energy = 10, genome?: Float32Array) {
    this.x = x;
    this.y = y;
    this.energy = energy;
    this.genome = genome || randomGenome();
    this.applyGenome();
  }

  /** Decode genome into agent properties. */
  private applyGenome(): void {
    // Basic traits
    this.moveSpeed = mapLinear(this.genome[0], 0.5, 1.5);
    this.metabolicCost = mapLinear(this.genome[1], 0.5, 2.0);
    this.foodConsumptionAmount = mapLinear(this.genome[2], 0.02, 0.1);

    // Reproduction traits
    this.reproductionThreshold = mapLinear(this.genome[3], 20, 50);
    this.offspringEnergyRatio = mapLinear(this.genome[4], 0.3, 0.7);

    // Aesthetics
    const r = Math.floor(mapLinear(this.genome[5], 100, 255));
    const g = Math.floor(mapLinear(this.genome[6], 100, 255));
    const b = Math.floor(mapLinear(this.genome[7], 100, 255));
    this.color = `rgb(${r},${g},${b})`;
  }

  /** Update agent: move, lose energy, consume, reproduce, possibly die. Returns a new agent if one was born. */
  update(dt: number, world: World): Agent | null {
    if (this.dead) return null;

    // Movement
    const angle = rng() * 2 * Math.PI;
    const step = this.moveSpeed * dt;
    this.x += Math.cos(angle) * step;
    this.y += Math.sin(angle) * step;
    if (this.x < 0) this.x += world.width;
    else if (this.x >= world.width) this.x -= world.width;
    if (this.y < 0) this.y += world.height;
    else if (this.y >= world.height) this.y -= world.height;

    // Metabolism
    this.energy -= this.metabolicCost * dt;

    // Consumption
    const tx = this.x | 0;
    const ty = this.y | 0;
    const eaten = world.consumeFood(tx, ty, this.foodConsumptionAmount);
    this.energy += eaten * 10.0; // food energy value is 10

    // Reproduction
    let newborn: Agent | null = null;
    if (this.energy >= this.reproductionThreshold) {
      const offspringEnergy = this.energy * this.offspringEnergyRatio;
      this.energy -= offspringEnergy;

      const childGenome = this.genome.slice(); // inherit
      mutateGenome(childGenome); // mutate
      
      newborn = new Agent(this.x, this.y, offspringEnergy, childGenome);
    }

    // Death
    if (this.energy <= 0) {
      this.dead = true;
      this.energy = 0;
    }

    return newborn;
  }
}
