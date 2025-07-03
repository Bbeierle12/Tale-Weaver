// src/metrics.ts
export interface MoveSample {
  tick: number;
  id: number;
  x: number;
  y: number;
  food: number; // eaten this tick
}
