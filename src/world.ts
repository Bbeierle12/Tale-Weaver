import { Agent } from './Agent';

export class World {
  // tile grid – each cell holds food 0‑1
  public tiles: number[][] = [];
  public readonly width  = 200;
  public readonly height = 200;

  /** live agent list */
  public agents: Agent[] = [];

  public tick = 0;
  public deadCount = 0;

  constructor() {
    this.reset();
  }

  public reset(): void {
      this.tick = 0;
      this.deadCount = 0;
      this.agents = [];
      // seed food field
      this.tiles = Array.from({ length: this.height }, () =>
        Array.from({ length: this.width }, () => Math.random())
      );
      // initial population
      for (let i = 0; i < 300; i++) {
        this.spawnAgent(Math.random() * this.width, Math.random() * this.height);
      }
  }

  public inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  /** food consumption – returns amount eaten */
  public consumeFood(x: number, y: number, amount: number): number {
    const ix = x | 0;
    const iy = y | 0;
    if (!this.inBounds(ix, iy)) return 0;

    const avail = this.tiles[iy][ix];
    const eaten = Math.min(avail, amount);
    this.tiles[iy][ix] -= eaten;
    return eaten;
  }

  public spawnAgent(x: number, y: number, genome?: Float32Array): Agent {
    const agent = new Agent(x, y, genome, this);
    this.agents.push(agent);
    this.clampPosition(agent);
    return agent;
  }

  public kill(agent: Agent): void {
    const index = this.agents.indexOf(agent);
    if (index > -1) {
      this.agents.splice(index, 1);
      this.deadCount++;
    }
  }

  public clampPosition(agent: Agent): void {
    agent.x = Math.max(0, Math.min(this.width - 1, agent.x));
    agent.y = Math.max(0, Math.min(this.height - 1, agent.y));
  }

  public update(dt: number): void {
    this.tick += 1;

    // grow food slowly
    for (let i = 0; i < 400; i++) {
      const x = (Math.random() * this.width) | 0;
      const y = (Math.random() * this.height) | 0;
      this.tiles[y][x] = Math.min(1, this.tiles[y][x] + 0.002);
    }

    // Update agents. Iterate over a copy because the agent list can be modified
    // during the loop (reproduction, death).
    const agentsToUpdate = [...this.agents];
    for (const a of agentsToUpdate) {
      // Check if agent is still alive before updating
      if (this.agents.includes(a)) {
        a.update(dt);
      }
    }
  }

  // metrics for HUD
  public get avgEnergy(): number {
    if (!this.agents.length) return 0;
    return this.agents.reduce((s, a) => s + a.energy, 0) / this.agents.length;
  }

  get alive(): number { return this.agents.length; }
  get deadTotal(): number { return this.deadCount; }

  public getStats() {
    const totalFood = this.tiles.flat().reduce((sum, tile) => sum + tile, 0);
    return {
      population: this.agents.length,
      food: Math.floor(totalFood),
    };
  }
}
