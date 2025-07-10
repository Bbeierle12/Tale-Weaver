// ────────────────────────────────────────────────────────────────
// --- src/Agent.ts ----------------------------------------------
// ────────────────────────────────────────────────────────────────
import type { SimConfig, World } from './world';
import type { SimulationEventBus } from './simulation/event-bus';
import type { SpeciesDefinition } from './species';

export class Agent {
  readonly id: number;
  lineageId: number;
  x: number;
  y: number;
  energy: number;
  readonly genome: Float32Array;
  age = 0; // ticks lived
  foodConsumed = 0; // aggregate E eaten
  private bus: SimulationEventBus;
  private config: SimConfig;
  public readonly speciesDef: SpeciesDefinition;

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
    speciesDef: SpeciesDefinition,
    energy = 5,
    genome?: Float32Array,
    lineageId = 0,
  ) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.bus = bus;
    this.config = config;
    this.speciesDef = speciesDef;
    this.energy = energy;

    // -- Genetics --
    this.genome =
      genome ?? new Float32Array(this.speciesDef.genomeLength).map(Math.random);
    this.lineageId = lineageId;
  }

  // ───────── per‑tick behaviour
  tick(world: World): void {
    this.age++;

    // Basal metabolic drain
    this.energy -= this.speciesDef.basalMetabolicRate;
    world.basalDebit += this.speciesDef.basalMetabolicRate;

    // Behaviors are now called directly from the World's step method
    this.speciesDef.behavior.move(this, world);

    const targetTile = world.getTile(this.x, this.y);
    this.speciesDef.behavior.eat(this, targetTile, world);

    // For predators, the World loop will check for agents on the same tile
    // and call eat again with the agent as the target.

    this.speciesDef.behavior.reproduce(this, world);

    // Universal death check, called from World after all actions
    if (this.energy < this.speciesDef.deathThreshold) {
      this.bus.emit({ type: 'death', payload: { agent: this } });
    }
  }

  moveToward(target: { x: number; y: number }, world: World): void {
    const dx = target.x - this.x;
    const dy = target.y - this.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      this.x += Math.sign(dx);
    } else {
      this.y += Math.sign(dy);
    }
    this.x = (this.x + world.width) % world.width;
    this.y = (this.y + world.height) % world.height;

    this.stepsTaken += 1;
    this.distanceTravelled += 1;
    this.energy -= this.speciesDef.movementCost;
    world.moveDebit += this.speciesDef.movementCost;
  }

  moveAway(target: { x: number; y: number }, world: World): void {
    const dx = this.x - target.x;
    const dy = this.y - target.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      this.x += Math.sign(dx);
    } else {
      this.y += Math.sign(dy);
    }
    this.x = (this.x + world.width) % world.width;
    this.y = (this.y + world.height) % world.height;

    this.stepsTaken += 1;
    this.distanceTravelled += 1;
    this.energy -= this.speciesDef.movementCost;
    world.moveDebit += this.speciesDef.movementCost;
  }

  /** World calls this after it has harvested the counters. */
  public resetTickMetrics(): void {
    this.stepsTaken = 0;
    this.distanceTravelled = 0;
    this.foundFood = false;
  }
}
