/**
 * Agent v0.1 — minimal organism for EcoSysX
 *  • Unique id (monotonic counter)
 *  • Position (x, y in tile coords)
 *  • Facing  (radians)
 *  • Energy  (<=0 → dead)
 *  • Behaviour: unbiased random walk
 */
export class Agent {
  /* static */ private static uid = 0;

  readonly id = Agent.uid++;
  x: number;
  y: number;
  facing = Math.random() * Math.PI * 2;
  energy = 10;                   // arbitrary starting energy
  dead  = false;

  private readonly speed = 3;    // tiles / second
  private readonly metabolicCost = 0.1; // energy / sec

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  /** random‑walk step */
  update(dt: number, worldW: number, worldH: number) {
    if (this.dead) return;

    // 1. random steering
    const turn = (Math.random() - 0.5) * Math.PI * 0.5; // ±25°
    this.facing += turn;

    // 2. move forward
    this.x += Math.cos(this.facing) * this.speed * dt;
    this.y += Math.sin(this.facing) * this.speed * dt;

    // 3. keep on map (bounce)
    if (this.x < 0 || this.x >= worldW) {
      this.facing = Math.PI - this.facing;
      this.x = Math.max(0, Math.min(worldW - 1, this.x));
    }
    if (this.y < 0 || this.y >= worldH) {
      this.facing = -this.facing;
      this.y = Math.max(0, Math.min(worldH - 1, this.y));
    }

    // 4. energy loss & death
    this.energy -= this.metabolicCost * dt;
    if (this.energy <= 0) this.dead = true;
  }
}
