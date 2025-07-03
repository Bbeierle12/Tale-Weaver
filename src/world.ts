import { Agent } from './Agent';

const GROWTH_RATE = 0.15; // food units per second
const REGROWTH_SITES = 400;

export class World {
  public readonly width = 200;
  public readonly height = 200;
  public readonly tiles: number[][];
  public agents: Agent[] = [];
  public dead = 0;
  public tick = 0;

  constructor() {
    this.tiles = Array.from({ length: this.height }, () =>
      Array.from({ length: this.width }, () => Math.random())
    );
    // World starts empty, agents are spawned by the simulation controller.
  }

  public spawnAgent(
    x: number,
    y: number,
    genome?: Float32Array
  ): Agent {
    const agent = new Agent(x, y, genome, this);
    this.agents.push(agent);
    return agent;
  }

  // Called by Agent to keep them in‑bounds
  public clampPosition(a: Agent): void {
    a.x = Math.max(0, Math.min(this.width - 1, a.x));
    a.y = Math.max(0, Math.min(this.height - 1, a.y));
  }

  public kill(a: Agent): void {
    const idx = this.agents.indexOf(a);
    if (idx >= 0) {
      this.agents.splice(idx, 1);
      this.dead++;
    }
  }

  public consumeTileFood(x: number, y: number, amount: number): number {
    const avail = this.tiles[y][x];
    const eaten = Math.min(avail, amount);
    this.tiles[y][x] -= eaten;
    return eaten;
  }

  private regrow(dt: number) {
    const amount = GROWTH_RATE * dt;
    for (let i = 0; i < REGROWTH_SITES; i++) {
      const x = (Math.random() * this.width) | 0;
      const y = (Math.random() * this.height) | 0;
      this.tiles[y][x] = Math.min(1, this.tiles[y][x] + amount);
    }
  }

  public update(dt: number): void {
    this.tick++;
    this.regrow(dt);

    const agentsToUpdate = [...this.agents];
    for (const a of agentsToUpdate) {
      if (this.agents.includes(a)) {
        a.update(dt);
      }
    }
  }

  get avgTileFood(): number {
    if (this.width * this.height === 0) return 0;
    let sum = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        sum += this.tiles[y][x];
      }
    }
    return sum / (this.width * this.height);
  }

  get avgEnergy(): number {
    if (this.agents.length === 0) return 0;
    return this.agents.reduce((s, a) => s + a.energy, 0) / this.agents.length;
  }
}
