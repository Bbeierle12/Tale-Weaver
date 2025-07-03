import type { World } from './world';

export class Agent {
  // genome‑encoded traits (hard‑coded for demo)
  readonly speed  = Math.random() * 4 + 2;       // 2 – 6 tiles / s
  readonly vision = Math.random() * 10 + 10;     // 10 – 20 tile radius

  // mutable state
  x: number;
  y: number;
  dir = Math.random() * Math.PI * 2;             // facing (rad)
  energy = 10;
  age = 0;

  constructor(private world: World, x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  /** Single AI tick – very simple “move toward best food in vision” */
  update(dt: number) {
    this.age += dt;
    this.energy -= dt * 0.2;                      // basal metabolic cost

    // detect food tiles inside vision cone (cheap search – circle)
    let bestX = this.x, bestY = this.y, bestFood = 0;

    const r = this.vision | 0;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx*dx + dy*dy > r*r) continue; // stay within circle
        const tx = (this.x + dx) | 0;
        const ty = (this.y + dy) | 0;
        if (!this.world.inBounds(tx, ty)) continue;
        const food = this.world.tiles[ty][tx];
        if (food > bestFood) {
          bestFood = food;
          bestX = tx;
          bestY = ty;
        }
      }
    }

    // turn gradually toward best target
    this.dir = Math.atan2(bestY - this.y, bestX - this.x);

    // move
    this.x += Math.cos(this.dir) * this.speed * dt;
    this.y += Math.sin(this.dir) * this.speed * dt;
    this.x = Math.max(0, Math.min(this.world.width  - 1, this.x));
    this.y = Math.max(0, Math.min(this.world.height - 1, this.y));

    // eat if standing on food
    const food = this.world.consumeFood(this.x | 0, this.y | 0, 0.05);
    this.energy += food * 10;

    // reproduce
    if (this.energy > 25) {
      this.energy -= 10;
      this.world.spawnAgent(this.x, this.y);
    }
  }

  get dead(): boolean { return this.energy <= 0 || this.age > 600; }
}
