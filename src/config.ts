// ────────────────────────────────────────────────────────────────
// --- src/config.ts ---------------------------------------------
// Centralised, readonly sim parameters
// ────────────────────────────────────────────────────────────────
export interface SimConfig {
  growthRate: number        // food regrowth per tile per tick
  biteEnergy: number        // E gained per bite
  foodValue: number         // max E per tile
  birthThreshold: number    // E required before giving birth
  birthCost: number         // E transferred to child (and lost by parent)
  deathThreshold: number    // starvation boundary
  moveCostPerStep: number   // E lost per tile walked
  basalRate: number         // E lost per tick for being alive
  histBins: number          // energy‑histogram resolution
  snapshotInterval: number  // ticks between snapshots
  forageBuf: number         // ring‑buffer length
  metricsInterval: number   // how many ticks between flushing secondary metrics
}

export const SIM_CONFIG: SimConfig = {
  growthRate:         0.15,
  biteEnergy:         1,
  foodValue:          10,
  birthThreshold:     20,
  birthCost:          9,
  deathThreshold:     1e-3,
  moveCostPerStep:    0.02,
  basalRate:          0.01,
  histBins:           10,
  snapshotInterval:   100,
  forageBuf:          20_000,
  metricsInterval:    1
};
