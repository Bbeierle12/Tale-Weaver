import { Agent } from './Agent';
import type { TickStats } from './ai/schemas';
import { rng } from './utils/random';
import { RunningStats, calculateGini } from './utils/stats';
import { SIM_CONFIG } from './config';
import { Hist } from './utils/hist';

export class World {
  public width: number;
  public height: number;
  public tiles: number[][];
  public agents: Agent[] = [];
  public deathsTotal = 0;
  public birthsTotal = 0;
  public tick = 0;

  // Per-tick accumulators
  public births = 0;
  public deaths = 0;
  public moveDebit = 0;
  public basalDebit = 0;

  // Telemetry
  private forageBuf: string[] = new Array(SIM_CONFIG.forageBuf);
  private fp = 0;
  private snapshots: string[] = [];
  private hist = new Hist(SIM_CONFIG.histBins);
  private histRows: string[] = [];
  public history: TickStats[] = [];

  public readonly growthRate: number;
  private readonly growthCount: number = 400;
  private _totalFood: number = 0;

  constructor(width = 200, height = 200, growthRate?: number) {
    this.width = width;
    this.height = height;
    this.growthRate = growthRate ?? SIM_CONFIG.growthRate;
    this.tiles = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => 0.5)
    );
    this._totalFood = 0.5 * width * height;
  }

  public eatAt(x: number, y: number, biteEnergy: number): number {
    const foodUnits = biteEnergy / SIM_CONFIG.foodValue;
    const available = this.tiles[y][x];
    const eatenUnits = available >= foodUnits ? foodUnits : available;
    if (eatenUnits > 0) {
      this.tiles[y][x] = available - eatenUnits;
      this._totalFood -= eatenUnits;
    }
    return eatenUnits * SIM_CONFIG.foodValue;
  }

  public markDeath() {
    this.deaths++;
  }

  public recordForage(t: number, a: Agent, gain: number) {
    this.forageBuf[this.fp++] = `${t},${a.id},${a.x},${a.y},${gain.toFixed(2)}`;
    if (this.fp === this.forageBuf.length) this.fp = 0;
  }

  public getForageLog(): readonly string[] { return this.forageBuf.slice(0, this.fp); }
  public getSnapshots(): readonly string[] { return this.snapshots; }
  public getHistRows(): readonly string[] { return this.histRows; }

  public spawnAgent(x: number, y: number, energy = 10, genome?: Float32Array): Agent {
    const agent = new Agent(x, y, energy, genome);
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
  public update(): void {
    this.tick++;
    this.births = 0;
    this.deaths = 0;
    this.basalDebit = 0;
    this.moveDebit = 0;

    this.regrow(1); // dt is now 1 tick

    const newChildren: Agent[] = [];
    for (const a of this.agents) {
      const child = a.tick(this);
      if (child) {
        newChildren.push(child);
      }
    }

    const aliveAgents = this.agents.filter(a => a.energy >= SIM_CONFIG.deathThreshold);

    this.agents = aliveAgents;
    this.agents.push(...newChildren);

    this.births = newChildren.length;
    this.birthsTotal += this.births;
    this.deathsTotal += this.deaths;

    if (this.tick % SIM_CONFIG.snapshotInterval === 0) {
      this.snapshots.push(
        ...this.agents.map(a => `${this.tick},${a.id},${a.x | 0},${a.y | 0},${a.energy.toFixed(2)},${a.age.toFixed(1)}`)
      );
    }

    this.hist.reset();
    this.agents.forEach(a => this.hist.add(a.energy));
    this.histRows.push(`${this.tick},${this.hist.toArray().join(',')}`);

    if (this.tick > 0) {
      this.logTickStats();
    }
  }

  private logTickStats(): void {
    const hasAgents = this.agents.length > 0;
    const energyStats = new RunningStats();
    for (const agent of this.agents) {
      energyStats.push(agent.energy);
    }

    const tileFoodStats = new RunningStats();
    const foodSample: number[] = [];
    const sampleSize = Math.floor(this.width * this.height * 0.1);
    let itemsSeen = 0;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const food = this.tiles[y][x];
        tileFoodStats.push(food);
        itemsSeen++;
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
      energyHistogram: this.tick % 50 === 0 ? this.hist.toArray() : undefined,
      avgTileFood: tileFoodStats.avg,
      avgTileFoodSD: tileFoodStats.sd,
      minTileFood: tileFoodStats.min,
      maxTileFood: tileFoodStats.max,
      foodGini,
    });
  }

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

  get avgTileFood(): number {
    if (this.width * this.height === 0) return 0;
    return this._totalFood / (this.width * this.height);
  }

  get avgEnergy(): number {
    if (this.agents.length === 0) return 0;
    let sumEnergy = 0;
    for (const agent of this.agents) {
      sumEnergy += agent.energy;
    }
    return this.agents.length ? sumEnergy / this.agents.length : 0;
  }
}
