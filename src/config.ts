export const SIM_CONFIG = {
  // food dynamics
  growthRate: 0.15, // regrowth per tick (scaled elsewhere)
  biteEnergy: 8, // energy gained per bite (food removed = biteEnergy / foodValue)
  foodValue: 10, // energy per 1 food unit (used in bite calc)

  // life‑cycle
  birthThreshold: 20, // parent must have ≥ this E
  birthCost: 9, // energy removed from parent when reproducing
  deathThreshold: 1e-3, // E < deathThreshold ⇒ dead

  // energy costs
  moveCostPerStep: 0, // In v0.2.1, this is disabled.
  basalRate: 0, // In v0.2.1, this is disabled.

  // logging / telemetry
  histBins: 10, // energy‑histogram bins
  snapshotInterval: 100, // ticks between agent snapshots
  forageBuf: 20_000, // ring buffer rows for forage events
};
