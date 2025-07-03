import { Agent } from './Agent';
import type { TickStats } from './ai/schemas';
import { rng } from './utils/random';
import { RunningStats, calculateGini } from './utils/stats';
import { SIM_CONFIG } from './config';
import { Hist } from './utils/hist';

export class World {
  public width: number;
  public height: number;
  public food: Float32Array; // Made public for renderer
  public agents: Agent[] = [];

  // Telemetry
  public tickCount = 0;
  public births = 0; // per-tick
  public deaths = 0; // per-tick
  public deathsTotal = 0; // running total
  public birthsTotal = 0; // running total
  public moveDebit = 0;
  public basalDebit = 0;
  public readonly energyHist = new Hist(SIM_CONFIG.histBins);
  public readonly forageLog: { tick: number, id: number, x: number, y: number, e: number }[];
  private foragePtr = 0;

  // CSV Buffers / History
  public history: TickStats[] = []; // For AI analysis - object format
  public readonly series: string[] = ['tick,pop,births,deaths,meanE,sdE,moveDebit,basalDebit,minFood,maxFood,foodGini,successRate,meanSteps'];
  public readonly histRows: string[] = [`tick,${Array.from({ length: SIM_CONFIG.histBins }, (_, i) => `b${i}`).join(',')}`];
  public readonly snapshots: string[] = ['tick,id,x,y,energy,age'];
  public readonly moveStatsRows: string[] = ['tick,totalSteps,totalDist,meanSteps,sdSteps,meanDist,sdDist'];
  public readonly searchRows: string[] = ['tick,successRate'];

  // Scratch buffers to avoid GC
  private stepBuf: number[] = [];

  constructor (width = 200, height = 200) {
    this.width = width;
    this.height = height;
    this.food = new Float32Array(width * height);
    this.food.fill(0.5); // init food per tile
    // Initialize forageLog with empty objects to avoid resizing
    this.forageLog = new Array(SIM_CONFIG.forageBuf).fill(null).map(() => ({ tick: 0, id: 0, x: 0, y: 0, e: 0 }));
  }

  // ───────── utilities
  private idx (x: number, y: number): number { return (y | 0) * this.width + (x | 0) }

  public consumeFood(tx: number, ty: number, units: number): number {
    const i = this.idx(tx, ty);
    const available = this.food[i];
    const eaten = Math.min(available, units);
    if (eaten > 0) {
      this.food[i] -= eaten;
    }
    return eaten;
  }

  public recordForage (tick: number, a: Agent, e: number): void {
    const entry = this.forageLog[this.foragePtr];
    entry.tick = tick;
    entry.id = a.id;
    entry.x = a.x;
    entry.y = a.y;
    entry.e = e;
    this.foragePtr = (this.foragePtr + 1) % SIM_CONFIG.forageBuf;
  }

  public getForageData(): readonly { tick: number, id: number, x: number, y: number, e: number }[] {
    // Return only the populated part of the ring buffer
    const populated = this.forageLog.slice(0, this.foragePtr).filter(e => e.tick > 0);
    return populated;
  }

  public markDeath (): void {
    this.deaths++;
  }

  private regrow(): void {
    const add = SIM_CONFIG.growthRate;
    for (let n = 0; n < 400; n++) {
      const i = Math.floor(rng() * this.food.length);
      this.food[i] = Math.min(SIM_CONFIG.foodValue, this.food[i] + add);
    }
  }

  // ───────── main update
  public step (): void {
    this.tickCount++;
    this.births = 0;
    this.deaths = 0;

    // Food regrowth
    this.regrow();

    // Tick agents
    const nextAgents: Agent[] = [];
    for (const agent of this.agents) {
      const result = agent.tick(this);
      
      if (result) {
        // Agent survived. Was it a birth?
        if (result !== agent) {
          // Yes, a new child was born.
          this.births++;
          nextAgents.push(result); // Add the child
        }
        // In all survival cases (birth or not), keep the original agent.
        nextAgents.push(agent);
      }
      // If result is null, the agent died and is not added to nextAgents.
    }

    this.agents = nextAgents;
    this.deathsTotal += this.deaths;
    this.birthsTotal += this.births;

    // Telemetry row
    this.pushSeriesRow();

    // Periodic snapshot
    if (this.tickCount % SIM_CONFIG.snapshotInterval === 0) this.pushSnapshots();
    
    // Reset agent counters for next tick
    for (const agent of this.agents) {
        agent.resetTickMetrics();
    }

    // Reset per‑tick world debit counters
    this.moveDebit = 0;
    this.basalDebit = 0;
  }

  // ───────── telemetry helpers
  private pushSeriesRow (): void {
    const pop = this.agents.length;
    
    // --- Existing Stats ---
    const energyStats = new RunningStats();
    this.energyHist.reset();
    for (const agent of this.agents) {
      energyStats.push(agent.energy);
      this.energyHist.add(agent.energy);
    }
    const foodStats = new RunningStats();
    const foodValues: number[] = [];
    for (const f of this.food) {
        foodStats.push(f);
        foodValues.push(f);
    }
    const foodGini = calculateGini(foodValues);

    // ---- New Search & Movement Stats ----
    this.stepBuf.length = pop;
    let sumSteps = 0;
    let sumDist = 0;
    let success = 0;
    
    for (let i = 0; i < pop; i++) {
      const a = this.agents[i];
      this.stepBuf[i] = a.stepsTaken;
      sumSteps += a.stepsTaken;
      sumDist += a.distanceTravelled;
      if (a.foundFood) success++;
    }
    
    const meanSteps = pop > 0 ? sumSteps / pop : 0;
    const meanDist = pop > 0 ? sumDist / pop : 0;
    const successRate = pop > 0 ? success / pop : 0;

    let varSteps = 0;
    for (const steps of this.stepBuf) {
        const dStep = steps - meanSteps;
        varSteps += dStep * dStep;
    }
    const sdSteps = pop > 0 ? Math.sqrt(varSteps / pop) : 0;
    
    let varDist = 0;
    for (const steps of this.stepBuf) {
        const dDist = steps - meanDist; // Using steps as proxy for distance
        varDist += dDist * dDist;
    }
    const sdDist = pop > 0 ? Math.sqrt(varDist / pop) : 0;

    if (this.tickCount % SIM_CONFIG.metricsInterval === 0) {
        this.moveStatsRows.push(
            `${this.tickCount},${sumSteps},${sumDist.toFixed(2)},${meanSteps.toFixed(2)},${sdSteps.toFixed(2)},${meanDist.toFixed(2)},${sdDist.toFixed(2)}`
        );
        this.searchRows.push(`${this.tickCount},${successRate.toFixed(3)}`);
    }

    const tickStats: TickStats = {
        tick: this.tickCount,
        population: pop,
        births: this.births,
        deaths: this.deaths,
        avgEnergy: energyStats.avg,
        energySD: energyStats.sd,
        minEnergy: energyStats.min,
        maxEnergy: energyStats.max,
        energyHistogram: this.tickCount % 50 === 0 ? this.energyHist.toArray() : undefined,
        avgTileFood: foodStats.avg,
        avgTileFoodSD: foodStats.sd,
        minTileFood: foodStats.min,
        maxTileFood: foodStats.max,
        foodGini,
    };
    this.history.push(tickStats);

    const row = [
      this.tickCount, pop, this.births, this.deaths,
      energyStats.avg.toFixed(3), energyStats.sd.toFixed(3),
      this.moveDebit.toFixed(3), this.basalDebit.toFixed(3),
      foodStats.min.toFixed(2), foodStats.max.toFixed(2), foodGini.toFixed(3),
      successRate.toFixed(3), meanSteps.toFixed(2)
    ].join(',');
    this.series.push(row);
    this.histRows.push(`${this.tickCount},${this.energyHist.toArray().join(',')}`);
  }

  private pushSnapshots (): void {
    for (const a of this.agents) {
      this.snapshots.push(`${this.tickCount},${a.id},${a.x},${a.y},${a.energy.toFixed(3)},${a.age}`);
    }
  }

  // Getters for HUD
  get avgTileFood(): number {
    if (this.food.length === 0) return 0;
    let sumFood = 0;
    for (const f of this.food) sumFood += f;
    return sumFood / this.food.length;
  }

  get avgEnergy(): number {
    if (this.agents.length === 0) return 0;
    let sumEnergy = 0;
    for (const agent of this.agents) {
      sumEnergy += agent.energy;
    }
    return this.agents.length ? sumEnergy / this.agents.length : 0;
  }

  public spawnAgent(x: number, y: number, energy = 10, genome?: Float32Array): Agent {
    const agent = new Agent(x, y, energy, genome);
    this.agents.push(agent);
    return agent;
  }
}
