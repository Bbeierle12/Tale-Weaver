import { Agent } from './Agent';
import type { TickStats } from './ai/schemas';

export class World {
  public width: number;
  public height: number;
  public tiles: number[][];
  public agents: Agent[] = [];
  public dead = 0;
  public tick = 0;

  // Data logging for AI analysis
  public history: TickStats[] = [];
  public deathsThisTick = 0;
  public birthsThisTick = 0;

  public readonly growthRate: number = 0.15; // food regrowth per second (per regrowth event)
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
    y: number
  ): Agent {
    const agent = new Agent(x, y);
    this.agents.push(agent);
    return agent;
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
    this.deathsThisTick = 0;
    this.birthsThisTick = 0; // Reset for the new tick
    this.regrow(dt);

    // Update all agents
    for (const a of this.agents) {
      a.update(dt, this);
    }
    
    // Cull the dead
    let i = this.agents.length;
    while(i--) {
      if (this.agents[i].dead) {
        this.agents.splice(i, 1);
        this.dead++;
        this.deathsThisTick++;
      }
    }

    // Record history for this tick
    if (this.tick > 0) {
      this.logTickStats();
    }
  }

  /** Calculates all stats for the current tick and logs them to history. */
  private logTickStats(): void {
    // Agent-level stats
    let sumEnergy = 0;
    let minEnergy = this.agents.length > 0 ? Infinity : 0;
    let maxEnergy = this.agents.length > 0 ? -Infinity : 0;
    for (const agent of this.agents) {
      const e = agent.energy;
      sumEnergy += e;
      if (e < minEnergy) minEnergy = e;
      if (e > maxEnergy) maxEnergy = e;
    }
    const avgEnergy = this.agents.length > 0 ? sumEnergy / this.agents.length : 0;
    let sumSqDiffEnergy = 0;
    for (const agent of this.agents) {
        sumSqDiffEnergy += Math.pow(agent.energy - avgEnergy, 2);
    }
    const energySD = this.agents.length > 1 ? Math.sqrt(sumSqDiffEnergy / (this.agents.length - 1)) : 0;

    // Tile-level stats
    const flatTiles: number[] = [];
    let minTileFood = this.tiles.length > 0 ? Infinity : 0;
    let maxTileFood = this.tiles.length > 0 ? -Infinity : 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const food = this.tiles[y][x];
        flatTiles.push(food);
        if (food < minTileFood) minTileFood = food;
        if (food > maxTileFood) maxTileFood = food;
      }
    }
    const foodGini = this.calculateGini(flatTiles);

    this.history.push({
      tick: this.tick,
      liveAgents: this.agents.length,
      births: this.birthsThisTick,
      deaths: this.deathsThisTick,
      avgEnergy,
      energySD,
      minEnergy,
      maxEnergy,
      avgTileFood: this.avgTileFood,
      avgTileFoodSD: this.avgTileFoodSD,
      minTileFood,
      maxTileFood,
      foodGini,
    });
  }

  /**
   * Calculates the Gini coefficient for a set of values.
   * A measure of inequality, where 0 is perfect equality.
   * NOTE: This is computationally expensive (O(n log n)).
   */
  private calculateGini(values: number[]): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const totalSum = sorted.reduce((acc, val) => acc + val, 0);

    if (totalSum === 0) return 0;

    let lorenzSum = 0;
    for (let i = 0; i < n; i++) {
      lorenzSum += (i + 1) * sorted[i];
    }

    const gini = ((2 * lorenzSum) / (n * totalSum) - (n + 1) / n);
    return gini;
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

  /** Standard deviation of food level across all tiles. */
  get avgTileFoodSD(): number {
    const numTiles = this.width * this.height;
    if (numTiles === 0) return 0;
    
    const mean = this.avgTileFood;
    let sumSqDiff = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        sumSqDiff += Math.pow(this.tiles[y][x] - mean, 2);
      }
    }
    return Math.sqrt(sumSqDiff / numTiles);
  }

  /** Average energy of all alive agents (0 if no agents). */
  get avgEnergy(): number {
    if (this.agents.length === 0) return 0;
    let sumEnergy = 0;
    let aliveCount = 0;
    for (const agent of this.agents) {
      if (!agent.dead) {
        sumEnergy += agent.energy;
        aliveCount++;
      }
    }
    return aliveCount ? sumEnergy / aliveCount : 0;
  }
}
