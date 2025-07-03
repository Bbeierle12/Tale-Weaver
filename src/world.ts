
import { Agent } from './Agent';

export class World {
  public width: number;
  public height: number;
  public tiles: number[][];
  public agents: Agent[] = [];
  public dead = 0;
  public tick = 0;

  public readonly growthRate: number = 0.15;  // food regrowth per second (per regrowth event)
  private readonly growthCount: number = 400; // number of random tiles to regrow per second (approx)

  private _totalFood: number = 0;

  constructor(width = 200, height = 200) {
    this.width = width;
    this.height = height;
    // Initialize tiles with a moderate food level
    this.tiles = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => 0.5)
    );
    this._totalFood = 0.5 * width * height;
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

  /** Consume food from the specified tile. Returns the amount of food actually eaten. */
  public consumeFood(x: number, y: number, amount: number): number {
    const available = this.tiles[y][x];
    const eaten = available >= amount ? amount : available;
    if (eaten > 0) {
      this.tiles[y][x] = available - eaten;
      this._totalFood -= eaten;
    }
    return eaten;
  }
  
  /** World update: regrow food and update all agents */
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

  /** Regrow food on N random tiles, where N ≈ growthCount * dt (clamped by tile cap = 1) */
  private regrow(dt: number): void {
    if (dt <= 0 || this.growthRate <= 0) return;
    const events = Math.round(this.growthCount * dt);
    const increase = this.growthRate * dt;
    for (let i = 0; i < events; i++) {
      const x = Math.floor(Math.random() * this.width);
      const y = Math.floor(Math.random() * this.height);
      const current = this.tiles[y][x];
      if (current < 1) {
        let newValue = current + increase;
        if (newValue > 1) newValue = 1;
        this.tiles[y][x] = newValue;
        this._totalFood += (newValue - current);
      }
    }
  }
  
  /** Average food level across all tiles (0 if world is empty). */
  get avgTileFood(): number {
    if (this.width * this.height === 0) return 0;
    return this._totalFood / (this.width * this.height);
  }

  /** Average energy of all alive agents (0 if no agents). */
  get avgEnergy(): number {
    if (this.agents.length === 0) return 0;
    return this.agents.reduce((s, a) => s + a.energy, 0) / this.agents.length;
  }
}
