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
    // Delegate all behavior to the species definition
    this.speciesDef.behavior(this, world, this.bus, this.config);
  }

  /** World calls this after it has harvested the counters. */
  public resetTickMetrics(): void {
    this.stepsTaken = 0;
    this.distanceTravelled = 0;
    this.foundFood = false;
  }
}
