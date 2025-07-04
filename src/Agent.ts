// ────────────────────────────────────────────────────────────────
// --- src/Agent.ts ----------------------------------------------
// ────────────────────────────────────────────────────────────────
import { SIM_CONFIG } from './config';
import type { World } from './world';
import { rng } from './utils/random';
import { mapLinear } from './utils/genetics';

let NEXT_ID = 0;
let NEXT_LINEAGE_ID = 0;

/** Reset the ID counter for new simulations */
export function resetAgentId(): void {
  NEXT_ID = 0;
  NEXT_LINEAGE_ID = 0;
}

export class Agent {
  readonly id = NEXT_ID++;
  readonly lineageId: number;
  x: number;
  y: number;
  energy: number;
  readonly genome: Float32Array;
  age = 0; // ticks lived
  foodConsumed = 0; // aggregate E eaten
  color: string;

  // Phenotype
  readonly speed: number;
  readonly vision: number;
  readonly basalRate: number;

  // Per-tick metrics, reset by World
  stepsTaken = 0;
  distanceTravelled = 0;
  foundFood = false;

  constructor(
    x: number,
    y: number,
    energy = 5,
    genome?: Float32Array,
    lineageId?: number
  ) {
    this.x = x;
    this.y = y;
    this.energy = energy;

    // -- Genetics --
    this.genome = genome ? Agent.mutate(genome) : Agent.randomGenome();
    this.lineageId = lineageId ?? NEXT_LINEAGE_ID++;

    // -- Phenotype from genes --
    this.speed = mapLinear(this.genome[3], 0.5, 2); // 0.5-2x base speed
    this.vision = mapLinear(this.genome[4], 1, 10); // 1-10 tile radius
    this.basalRate =
      mapLinear(this.genome[5], 0.5, 2) * SIM_CONFIG.basalRate; // 0.5-2x base BMR

    // -- Color from genes --
    const r = Math.floor(this.genome[0] * 255);
    const g = Math.floor(this.genome[1] * 255);
    const b = Math.floor(this.genome[2] * 255);
    this.color = `rgb(${r},${g},${b})`;
  }

  // ───────── genetics
  private static randomGenome(): Float32Array {
    const g = new Float32Array(16);
    for (let i = 0; i < g.length; i++) g[i] = rng();
    return g;
  }
  private static mutate(src: Float32Array): Float32Array {
    const child = new Float32Array(src);
    for (let i = 0; i < child.length; i++) {
      if (rng() < 0.01) {
        child[i] += (rng() * 2 - 1) * 0.1;
        // Clamp the gene value to prevent it from going out of the [0, 1] range.
        child[i] = Math.max(0, Math.min(1, child[i]));
      }
    }
    return child;
  }

  // ───────── per‑tick behaviour — returns a new child if birth occurs
  tick(world: World): Agent | null {
    this.age++;

    // Basal metabolic drain
    this.energy -= this.basalRate;
    world.basalDebit += this.basalRate;

    // Random walk (von Neumann)
    const dir = Math.floor(rng() * 4);
    this.move(dir, world);

    // Forage
    this.eat(world);

    // Reproduction
    if (this.energy >= SIM_CONFIG.birthThreshold) {
      this.energy -= SIM_CONFIG.birthCost;
      return new Agent(this.x, this.y, SIM_CONFIG.birthCost, this.genome, this.lineageId);
    }

    // Death check
    if (this.energy < SIM_CONFIG.deathThreshold) {
      world.markDeath(this);
      return null;
    }

    // Agent survives
    return this;
  }

  private move(dir: number, world: World): void {
    switch (dir) {
      case 0:
        this.x = (this.x + 1) % world.width;
        break;
      case 1:
        this.x = (this.x + world.width - 1) % world.width;
        break;
      case 2:
        this.y = (this.y + 1) % world.height;
        break;
      case 3:
        this.y = (this.y + world.height - 1) % world.height;
        break;
    }
    this.stepsTaken += 1;
    this.distanceTravelled += 1; // Cardinal moves have distance of 1
    const moveCost = SIM_CONFIG.moveCostPerStep * (this.speed * this.speed);
    this.energy -= moveCost;
    world.moveDebit += moveCost;
  }

  /** Called once per tick after move */
  private eat(world: World) {
    const foodUnits = SIM_CONFIG.biteEnergy / SIM_CONFIG.foodValue;
    const eaten = world.consumeFood(this.x, this.y, foodUnits);
    if (eaten > 0) {
      const gained = eaten * SIM_CONFIG.foodValue;
      this.energy += gained;
      this.foodConsumed += gained;
      world.recordForage(world.tickCount, this, gained);
      this.foundFood = true;
    }
  }

  /** World calls this after it has harvested the counters. */
  public resetTickMetrics(): void {
    this.stepsTaken = 0;
    this.distanceTravelled = 0;
    this.foundFood = false;
  }
}
