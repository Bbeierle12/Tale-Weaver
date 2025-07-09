// ────────────────────────────────────────────────────────────────
// --- src/Agent.ts ----------------------------------------------
// ────────────────────────────────────────────────────────────────
import { SIM_CONFIG } from './config';
import type { World } from './world';
import { rng } from './utils/random';
import { mapLinear } from './utils/genetics';

let NEXT_ID = 0;

/** Reset the ID counter for new simulations */
export function resetAgentId(): void {
  NEXT_ID = 0;
}

export class Agent {
  readonly id = NEXT_ID++;
  lineageId: number;
  x: number;
  y: number;
  energy: number;
  readonly genome: Float32Array;
  age = 0; // ticks lived
  foodConsumed = 0; // aggregate E eaten
  color: string;

  // Phenotype
  get speed(): number {
    return mapLinear(this.genome[0], 0.5, 2);
  }
  get vision(): number {
    return mapLinear(this.genome[1], 1, 10);
  }
  get basalRateTrait(): number {
    return mapLinear(this.genome[2], 0.5, 2) * SIM_CONFIG.basalRate;
  }

  // Per-tick metrics, reset by World
  stepsTaken = 0;
  distanceTravelled = 0;
  foundFood = false;

  constructor(
    x: number,
    y: number,
    energy = 5,
    genome?: Float32Array,
    lineageId = 0,
  ) {
    this.x = x;
    this.y = y;
    this.energy = energy;

    // -- Genetics --
    this.genome = genome ? new Float32Array(genome) : Agent.randomGenome();
    this.lineageId = lineageId;

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

  /** Clone this agent with trait-specific mutation. */
  cloneWithMutation(
    world: World,
    mutationRates = SIM_CONFIG.mutationRates,
  ): Agent {
    const childGenome = new Float32Array(this.genome);
    const deltas = [0, 0, 0];
    if (rng() < mutationRates.speed) {
      const d = (rng() * 2 - 1) * 0.1;
      childGenome[0] = Math.min(1, Math.max(0, childGenome[0] + d));
      deltas[0] = Math.abs(d);
    }
    if (rng() < mutationRates.vision) {
      const d = (rng() * 2 - 1) * 0.1;
      childGenome[1] = Math.min(1, Math.max(0, childGenome[1] + d));
      deltas[1] = Math.abs(d);
    }
    if (rng() < mutationRates.basal) {
      const d = (rng() * 2 - 1) * 0.1;
      childGenome[2] = Math.min(1, Math.max(0, childGenome[2] + d));
      deltas[2] = Math.abs(d);
    }

    let lineageId = this.lineageId;
    if (deltas.some((d) => d >= SIM_CONFIG.lineageThreshold)) {
      lineageId = ++world.lineageCounter;
      world.registerLineage(lineageId, childGenome);
    }

    return new Agent(
      this.x,
      this.y,
      SIM_CONFIG.birthCost,
      childGenome,
      lineageId,
    );
  }

  // ───────── per‑tick behaviour — returns a new child if birth occurs
  tick(world: World): Agent | null {
    this.age++;

    // Basal metabolic drain (simplified for this model version)
    this.energy -= SIM_CONFIG.basalRate;
    world.basalDebit += SIM_CONFIG.basalRate;

    // Random walk (von Neumann)
    const dir = Math.floor(rng() * 4);
    this.move(dir, world);

    // Forage
    this.eat(world);

    // Reproduction
    if (this.energy >= SIM_CONFIG.birthThreshold) {
      this.energy -= SIM_CONFIG.birthCost;
      return this.cloneWithMutation(world);
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
    // Simplified move cost for this model version
    this.energy -= SIM_CONFIG.moveCostPerStep;
    world.moveDebit += SIM_CONFIG.moveCostPerStep;
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
