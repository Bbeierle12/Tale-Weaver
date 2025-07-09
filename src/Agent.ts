// ────────────────────────────────────────────────────────────────
// --- src/Agent.ts ----------------------------------------------
// ────────────────────────────────────────────────────────────────
import type { SimConfig } from './world';
import type { World } from './world';
import { rng } from './utils/random';
import { mapLinear } from './utils/genetics';
import type { SimulationEventBus } from './simulation/event-bus';

export class Agent {
  readonly id: number;
  lineageId: number;
  x: number;
  y: number;
  energy: number;
  readonly genome: Float32Array;
  age = 0; // ticks lived
  foodConsumed = 0; // aggregate E eaten
  color: string;
  private bus: SimulationEventBus;
  private config: SimConfig;

  // Phenotype
  get speed(): number {
    return mapLinear(this.genome[0], 0.5, 2);
  }
  get vision(): number {
    return mapLinear(this.genome[1], 1, 10);
  }
  get basalRateTrait(): number {
    return mapLinear(this.genome[2], 0.5, 2) * this.config.basalRate;
  }

  // Per-tick metrics, reset by World
  stepsTaken = 0;
  distanceTravelled = 0;
  foundFood = false;

  constructor(
    id: number,
    x: number,
    y: number,
    bus: SimulationEventBus,
    config: SimConfig,
    energy = 5,
    genome?: Float32Array,
    lineageId = 0,
  ) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.bus = bus;
    this.config = config;
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

  // ───────── per‑tick behaviour
  tick(world: World): void {
    this.age++;

    // Basal metabolic drain
    this.energy -= this.config.basalRate;
    world.basalDebit += this.config.basalRate;

    // Random walk (von Neumann)
    const dir = Math.floor(rng() * 4);
    this.move(dir, world);

    // Forage
    this.eat(world);

    // Reproduction
    if (this.energy >= this.config.birthThreshold) {
      this.energy -= this.config.birthCost;
      this.bus.emit({ type: 'birth', payload: { parent: this } });
    }

    // Death check
    if (this.energy < this.config.deathThreshold) {
      this.bus.emit({ type: 'death', payload: { agent: this } });
    }
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
    this.energy -= this.config.moveCostPerStep;
    world.moveDebit += this.config.moveCostPerStep;
  }

  /** Called once per tick after move */
  private eat(world: World) {
    const foodUnits = this.config.biteEnergy / this.config.foodValue;
    const eaten = world.consumeFood(this.x, this.y, foodUnits);
    if (eaten > 0) {
      const gained = eaten * this.config.foodValue;
      this.energy += gained;
      this.foodConsumed += gained;
      this.bus.emit({
        type: 'food-consumed',
        payload: { agent: this, amount: gained, x: this.x, y: this.y },
      });
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
