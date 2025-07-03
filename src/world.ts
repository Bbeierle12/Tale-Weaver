import { Agent } from './Agent';
import type { MoveSample, TileEvent } from './metrics';
import type { TickStats } from './ai/schemas';
import { rng } from './utils/random';
import { RunningStats, calculateGini } from './utils/stats';

export class World {
  public width: number;
  public height: number;
  public tiles: number[][];
  public agents: Agent[] = [];
  public deathsTotal = 0;
  public birthsTotal = 0;
  public tick = 0;

  // Data logging for AI analysis
  public history: TickStats[] = [];
  private deaths = 0;
  private births = 0;

  // Spatial telemetry
  private static readonly FORAGE_LOG_CAP = 32_768;
  private forageLog: MoveSample[] = new Array<MoveSample>(World.FORAGE_LOG_CAP);
  private foragePtr = 0;

  private static readonly TILE_LOG_CAP = 32_768;
  private tileLog: TileEvent[] = new Array<TileEvent>(World.TILE_LOG_CAP);
  private tileLogPtr = 0;

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

  public recordForage(tick: number, id: number, x: number, y: number, food: number) {
    this.forageLog[this.foragePtr++] = { tick, id, x, y, food };
    if (this.foragePtr === World.FORAGE_LOG_CAP) this.foragePtr = 0; // overwrite oldest
  }

  // expose snapshot for analysis or CSV dump
  public getForageLog(): readonly MoveSample[] {
    return this.forageLog.slice(0, this.foragePtr);
  }

  public recordTileEvent(tick: number, x: number, y: number, foodAfter: number, delta: number) {
    this.tileLog[this.tileLogPtr++] = { tick, x, y, foodAfter, delta };
    if (this.tileLogPtr === World.TILE_LOG_CAP) this.tileLogPtr = 0; // overwrite oldest
  }

  public getTileLog(): readonly TileEvent[] {
    return this.tileLog.slice(0, this.tileLogPtr);
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
      const newValue = available - eaten;
      this.tiles[y][x] = newValue;
      this._totalFood -= eaten;
      this.recordTileEvent(this.tick, x, y, newValue, -eaten);
    }
    return eaten;
  }
  
  /** World update: regrow food and update all agents */
  public update(dt: number): void {
    this.tick++;
    this.deaths = 0;
    this.births = 0;
    this.regrow(dt);

    const newborns: Agent[] = [];
    // Update all agents and collect any newborns
    for (const a of this.agents) {
      const newborn = a.update(dt, this);
      if (newborn) {
        newborns.push(newborn);
      }
    }
    
    // Add newborns to the population
    if (newborns.length > 0) {
      this.agents.push(...newborns);
      this.births = newborns.length;
      this.birthsTotal += newborns.length;
    }

    // Cull the dead
    let i = this.agents.length;
    while(i--) {
      if (this.agents[i].dead) {
        this.agents.splice(i, 1);
        this.deathsTotal++;
        this.deaths++;
      }
    }

    // Record history for this tick
    if (this.tick > 0) {
      this.logTickStats(dt);
    }
  }

  /** Calculates all stats for the current tick and logs them to history. */
  private logTickStats(dt: number): void {
    const hasAgents = this.agents.length > 0;
    // Agent stats
    const energyStats = new RunningStats();
    let totalBasalCost = 0;
    let totalMoveCost = 0;
    for (const agent of this.agents) {
      energyStats.push(agent.energy);
      totalBasalCost += agent.metabolicCost * dt;
      totalMoveCost += (agent.moveSpeed * agent.moveSpeed * 0.005) * dt;
    }

    // Energy Histogram (every 50 ticks)
    let energyHistogram: number[] | undefined = undefined;
    if (hasAgents && this.tick % 50 === 0) {
      const min = energyStats.min;
      const max = energyStats.max;
      const range = max - min;
      const binSize = range > 0 ? range / 10 : 1;
      energyHistogram = new Array(10).fill(0);

      for (const agent of this.agents) {
        let binIndex = range > 0 ? Math.floor((agent.energy - min) / binSize) : 0;
        if (binIndex >= 10) binIndex = 9; // Clamp to last bin
        if (binIndex < 0) binIndex = 0; // Clamp to first bin
        energyHistogram[binIndex]++;
      }
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
      totalBasalCost,
      totalMoveCost,
      avgEnergy: hasAgents ? energyStats.avg : 0,
      energySD: hasAgents ? energyStats.sd : 0,
      minEnergy: hasAgents ? energyStats.min : 0,
      maxEnergy: hasAgents ? energyStats.max : 0,
      energyHistogram,
      avgTileFood: tileFoodStats.avg,
      avgTileFoodSD: tileFoodStats.sd,
      minTileFood: tileFoodStats.min,
      maxTileFood: tileFoodStats.max,
      foodGini,
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
        this.recordTileEvent(this.tick, x, y, newValue, delta);
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
