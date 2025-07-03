// src/metrics.ts
export interface MoveSample {
  tick: number;
  id: number;
  x: number;
  y: number;
  food: number; // eaten this tick
}

export interface TileEvent {
  tick: number;
  x: number;
  y: number;
  foodAfter: number;
  delta: number; // positive for regrowth, negative for depletion
}
