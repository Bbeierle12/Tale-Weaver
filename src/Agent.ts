// ────────────────────────────────────────────────────────────────
// --- src/Agent.ts ----------------------------------------------
// ────────────────────────────────────────────────────────────────
import { SIM_CONFIG } from './config'
import type { World } from './world'
import { rng } from './utils/random';

let NEXT_ID = 0

export class Agent {
  readonly id = NEXT_ID++
  x: number
  y: number
  energy: number
  readonly genome: Float32Array
  age = 0                 // ticks lived
  foodConsumed = 0        // aggregate E eaten
  color: string;

  // Per-tick metrics, reset by World
  stepsTaken = 0
  distanceTravelled = 0
  foundFood = false

  constructor (x: number, y: number, energy = 5, genome?: Float32Array) {
    this.x = x
    this.y = y
    this.energy = energy
    this.genome = genome ? Agent.mutate(genome) : Agent.randomGenome()

    const r = Math.floor(this.genome[0] * 255);
    const g = Math.floor(this.genome[1] * 255);
    const b = Math.floor(this.genome[2] * 255);
    this.color = `rgb(${r},${g},${b})`;
  }

  // ───────── genetics
  private static randomGenome (): Float32Array {
    const g = new Float32Array(16)
    for (let i = 0; i < g.length; i++) g[i] = rng()
    return g
  }
  private static mutate (src: Float32Array): Float32Array {
    const child = new Float32Array(src)
    for (let i = 0; i < child.length; i++) {
      if (rng() < 0.01) {
        child[i] += (rng() * 2 - 1) * 0.1
        // Clamp the gene value to prevent it from going out of the [0, 1] range.
        child[i] = Math.max(0, Math.min(1, child[i]));
      }
    }
    return child
  }

  // ───────── per‑tick behaviour — returns a new child if birth occurs
  tick (world: World): Agent | null {
    this.age++

    // Basal metabolic drain
    this.energy -= SIM_CONFIG.basalRate
    world.basalDebit += SIM_CONFIG.basalRate

    // Random walk (von Neumann)
    const dir = Math.floor(rng() * 4)
    this.move(dir, world)

    // Forage
    const energyGained = world.eatAt(this.x, this.y, SIM_CONFIG.biteEnergy);

    if (energyGained > 0) {
      this.energy += energyGained
      this.foodConsumed += energyGained
      this.foundFood = true;
      world.recordForage(world.tickCount, this, energyGained)
    }

    // Reproduction
    if (this.energy >= SIM_CONFIG.birthThreshold) {
      this.energy -= SIM_CONFIG.birthCost
      return new Agent(this.x, this.y, SIM_CONFIG.birthCost, this.genome)
    }

    // Death check
    if (this.energy < SIM_CONFIG.deathThreshold) {
      world.markDeath();
      return null;
    }

    // Agent survives
    return this;
  }

  private move (dir: number, world: World): void {
    switch (dir) {
      case 0: this.x = (this.x + 1) % world.width; break
      case 1: this.x = (this.x + world.width - 1) % world.width; break
      case 2: this.y = (this.y + 1) % world.height; break
      case 3: this.y = (this.y + world.height - 1) % world.height; break
    }
    this.stepsTaken += 1;
    this.distanceTravelled += 1; // Cardinal moves have distance of 1
    this.energy -= SIM_CONFIG.moveCostPerStep
    world.moveDebit += SIM_CONFIG.moveCostPerStep
  }

  /** World calls this after it has harvested the counters. */
  public resetTickMetrics(): void {
    this.stepsTaken = 0;
    this.distanceTravelled = 0;
    this.foundFood = false;
  }
}
