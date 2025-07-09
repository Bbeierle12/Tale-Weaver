// src/metrics.ts

/**
 * @fileoverview Data contracts for simulation telemetry.
 * Compact property names are used for memory efficiency in high-frequency logs.
 */

export interface ForageSample {
  t: number; // tick
  i: number; // agent id
  x: number;
  y: number;
  f: number; // foodEaten
}

export interface AgentSnapshot {
  tick: number;
  id: number;
  x: number;
  y: number;
  energy: number;
}

export interface TileEvent {
  tick: number;
  x: number;
  y: number;
  foodAfter: number;
  delta: number; // positive for regrowth, negative for depletion
}
