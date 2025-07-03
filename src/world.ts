import { Agent } from './Agent';
import type { TickStats } from './ai/schemas';
import { rng } from './utils/random';
import { RunningStats, calculateGini } from './utils/stats';
import { SIM_CONFIG } from './config';
import { Histogram } from './utils/hist';

export class World {
  public width: number;
  public height: number;
  public tiles: number[][];
  public agents: Agent[] = [];
  public deathsTotal = 0;
  public birthsTotal = 0;
  public tick = 0;

  // Telemetry
  public births = 0;
  public deaths = 0;
  private forageBuf: string[] = new Array(SIM_CONFIG.forageBuf);
  private fp = 0;
  private snapshots: string[] = [];
  private hist = new Histogram(SIM_CONFIG.histBins);
  private histRows: string[] = [];

  // Data logging for AI analysis (kept for existing features)
  public history: TickStats[] = [];

  public readonly growthRate: number; // food regrowth per second (per regrowth event)
  private readonly growthCount: number = 400; // number of random tiles to regrow per second (approx)
  private _totalFood: number = 0;

  constructor(width = 200, height = 200, growthRate?: number) {
    this.width = width;
    this.height = height;
    this.growthRate = growthRate ?? SIM_CONFIG.growthRate;
    // Initialize tiles with a moderate food level
    this.tiles = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => 0.5)
    );
    this._totalFood = 0.5 * width * height;
  }

  public recordForage(t: number, a: Agent, x: number, y: number, gain: number) {
    this.forageBuf[this.fp++] = `${t},${a.id},${x},${y},${gain.toFixed(2)}`;
    if (this.fp === this.forageBuf.length) this.fp = 0;
  }

  // Getters for CSV download
  public getForageLog(): readonly string[] {
    // Return only the populated part of the ring buffer
    return this.forageBuf.slice(0, this.fp);
  }
  public getSnapshots(): readonly string[] {
    return this.snapshots;
  }
  public getHistRows(): readonly string[] {
    return this.histRows;
  }

  public spawnAgent(x: number, y: number, energy = 10, genome?: Float32Array): void {
    const agent = new Agent(x, y, energy, genome);
    this.agents.push(agent);
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
    this.births = 0;
    this.deaths = 0;
    this.regrow(dt);

    // Update all agents. They will directly modify world.births, world.deaths,
    // and call world.spawnAgent for newborns.
    for (const a of this.agents) {
      a.update(dt, this);
    }

    this.birthsTotal += this.births;

    // Cull the dead
    let i = this.agents.length;
    while (i--) {
      if (this.agents[i].dead) {
        this.agents.splice(i, 1);
        this.deathsTotal++;
      }
    }

    // Agent Snapshot
    if (this.tick % SIM_CONFIG.snapshotInterval === 0) {
      this.agents.forEach((a) => {
        this.snapshots.push(
          `${this.tick},${a.id},${a.x | 0},${a.y | 0},${a.energy.toFixed(
            2
          )},${a.age.toFixed(1)}`
        );
      });
    }

    // Histogram
    this.hist.accumulate(this.agents.map((a) => a.energy));
    this.histRows.push(this.hist.toCSV(this.tick));
    this.hist.reset();

    // Record history for this tick for AI analysis
    if (this.tick > 0) {
      this.logTickStats();
    }
  }

  /** Calculates all stats for the current tick and logs them to history. */
  private logTickStats(): void {
    const hasAgents = this.agents.length > 0;
    // Agent stats
    const energyStats = new RunningStats();
    for (const agent of this.agents) {
      energyStats.push(agent.energy);
    }

    // World food stats
    const tileFoodStats = new RunningStats();
    // For Gini, use reservoir sampling for performance on large worlds.
    const foodSample: number[] = [];
    const sampleSize = Math.floor(this.width * this.height * 0.1); // 10% sample
    let itemsSeen = 0;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const food = this.tiles[y][x];
        tileFoodStats.push(food);
        itemsSeen++;
        // Reservoir sampling:
        if (foodSample.length < sampleSize) {
          foodSample.push(food);
        } else {
          const replaceIndex = Math.floor(rng() * itemsSeen);
          if (replaceIndex < sampleSize) {
            foodSample[replaceIndex] = food;
          }
        }
      }
    }

    const foodGini = calculateGini(foodSample);

    this.history.push({
      tick: this.tick,
      population: this.agents.length,
      births: this.births,
      deaths: this.deaths,
      avgEnergy: hasAgents ? energyStats.avg : 0,
      energySD: hasAgents ? energyStats.sd : 0,
      minEnergy: hasAgents ? energyStats.min : 0,
      maxEnergy: hasAgents ? energyStats.max : 0,
      avgTileFood: tileFoodStats.avg,
      avgTileFoodSD: tileFoodStats.sd,
      minTileFood: tileFoodStats.min,
      maxTileFood: tileFoodStats.max,
      foodGini,
      // Obsolete fields, kept for schema compatibility until AI prompt is updated
      totalBasalCost: 0,
      totalMoveCost: 0,
    });
  }

  /** Regrow food on N random tiles, where N ≈ growthCount * dt (clamped by tile cap = 1) */
  private regrow(dt: number): void {
    if (dt <= 0 || this.growthRate <= 0) return;
    const events = Math.round(this.growthCount * dt);
    const increase = this.growthRate * dt;
    for (let i = 0; i < events; i++) {
      const x = Math.floor(rng() * this.width);
      const y = Math.floor(rng() * this.height);
      const current = this.tiles[y][x];
      if (current < 1) {
        let newValue = current + increase;
        if (newValue > 1) newValue = 1;
        const delta = newValue - current;
        this.tiles[y][x] = newValue;
        this._totalFood += delta;
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
    let sumEnergy = 0;
    for (const agent of this.agents) {
      if (!agent.dead) {
        sumEnergy += agent.energy;
      }
    }
    return this.agents.length ? sumEnergy / this.agents.length : 0;
  }
}
