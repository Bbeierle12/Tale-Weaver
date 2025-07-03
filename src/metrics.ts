// src/metrics.ts
export interface ForageSample {
  tick: number;
  id: number;
  x: number;
  y: number;
  foodEaten: number;
}

export interface TileEvent {
  tick: number;
  x: number;
  y: number;
  foodAfter: number;
  delta: number; // positive for regrowth, negative for depletion
}
