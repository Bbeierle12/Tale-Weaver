import { Agent } from './Agent';
import type { TickStats } from './ai/schemas';
import { rng } from './utils/random';
import { RunningStats, calculateGini } from './utils/stats';
import { SIM_CONFIG } from './config';
import { Hist } from './utils/hist';

interface LineageStats {
  id: number;
  members: number;
  births: number;
  deaths: number;
  speed: RunningStats;
  vision: RunningStats;
  basal: RunningStats;
  energy: RunningStats;
  founder: Agent;
}

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
  private patchMap: Float32Array;

  // CSV Buffers / History
  public history: TickStats[] = []; // For AI analysis - object format
  public readonly series: string[] = ['tick,pop,births,deaths,meanE,sdE,moveDebit,basalDebit,minFood,maxFood,foodGini,successRate,meanSteps'];
  public readonly histRows: string[] = [`tick,${Array.from({ length: SIM_CONFIG.histBins }, (_, i) => `b${i}`).join(',')}`];
  public readonly snapshots: string[] = ['tick,id,x,y,energy,age'];
  public readonly moveStatsRows: string[] = ['tick,totalSteps,totalDist,meanSteps,sdSteps,meanDist,sdDist'];
  public readonly searchRows: string[] = ['tick,successRate'];

  // Lineage properties
  public lineageCounter = 0;
  private lineages = new Map<number, LineageStats>();
  public readonly lineageRows: string[] = ['tick,lineageId,members,meanSpeed,meanVision,meanBasal,meanEnergy,births,deaths'];
  private lineageFitness = new Map<number, number>();

  // Scratch buffers to avoid GC
  private stepBuf: number[] = [];

  constructor (width = 200, height = 200) {
    this.width = width;
    this.height = height;
    this.food = new Float32Array(width * height);
    this.food.fill(0.5); // init food per tile
    this.patchMap = new Float32Array(width * height);
    this.generatePatchMap();
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

  public markDeath (agent: Agent): void {
    this.deaths++;
    if (this.lineages.has(agent.lineageId)) {
      this.lineages.get(agent.lineageId)!.deaths++;
    }
  }

  private generatePatchMap(): void {
    const centers: {x: number; y: number;}[] = [];
    for (let i = 0; i < SIM_CONFIG.hotspotCount; i++) {
      centers.push({
        x: Math.floor(rng() * this.width),
        y: Math.floor(rng() * this.height)
      });
    }
    const sigma = SIM_CONFIG.hotspotRadius;
    const denom = 2 * sigma * sigma;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        let val = 0;
        for (const c of centers) {
          const dx = x - c.x;
          const dy = y - c.y;
          const g = Math.exp(-(dx * dx + dy * dy) / denom);
          if (g > val) val = g;
        }
        this.patchMap[this.idx(x, y)] = val;
      }
    }
  }

  private regrow(): void {
    const rate = SIM_CONFIG.growthRate;
    const max = SIM_CONFIG.foodValue;
    for (let n = 0; n < 400; n++) {
      const i = Math.floor(rng() * this.food.length);
      const patch = this.patchMap[i];
      if (patch <= 0) continue;
      const current = this.food[i];
      const growth = rate * patch * (1 - current / max);
      if (growth > 0) {
        this.food[i] = Math.min(max, current + growth);
      }
    }
  }

  // ───────── main update
  public step (): void {
    this.tickCount++;
    this.births = 0;
    this.deaths = 0;
    this.resetLineageTickStats();

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
          if (this.lineages.has(result.lineageId)) {
            this.lineages.get(result.lineageId)!.births++;
          }
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

    this.updateLineageStats();

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

  // ───────── lineage helpers
  private resetLineageTickStats(): void {
    for (const ls of this.lineages.values()) {
      ls.births = 0;
      ls.deaths = 0;
    }
  }

  private updateLineageStats(): void {
    // Reset member counts and stats collectors
    for (const ls of this.lineages.values()) {
      ls.members = 0;
      ls.speed.reset();
      ls.vision.reset();
      ls.basal.reset();
      ls.energy.reset();
    }
    // Recalculate based on current agent population
    for (const agent of this.agents) {
      if (!this.lineages.has(agent.lineageId)) {
        // This should not happen if registerLineage is called correctly
        // but as a safeguard:
        this.registerLineage(agent.lineageId, agent.genome);
      }
      const ls = this.lineages.get(agent.lineageId)!;
      ls.members++;
      ls.speed.push(agent.speed);
      ls.vision.push(agent.vision);
      ls.basal.push(agent.basalRateTrait);
      ls.energy.push(agent.energy);
    }

    // Write row and update fitness
    for (const ls of this.lineages.values()) {
      if (ls.members > 0) {
        this.lineageRows.push(`${this.tickCount},${ls.id},${ls.members},${ls.speed.avg.toFixed(3)},${ls.vision.avg.toFixed(3)},${ls.basal.avg.toFixed(3)},${ls.energy.avg.toFixed(3)},${ls.births},${ls.deaths}`);
        this.lineageFitness.set(ls.id, (this.lineageFitness.get(ls.id) || 0) + ls.members);
      }
    }
  }

  /**
   * Registers a new lineage. Called from Agent.ts when a mutation
   * crosses the speciation threshold.
   */
  public registerLineage(id: number, founderGenome: Float32Array): void {
    if (this.lineages.has(id)) return;
    // Create a representative founder agent to store its initial traits.
    // This agent doesn't "exist" in the world, it's just a data record.
    const founder = new Agent(-1, -1, 0, founderGenome, id);
    this.lineages.set(id, {
      id: id,
      members: 0,
      births: 0,
      deaths: 0,
      speed: new RunningStats(),
      vision: new RunningStats(),
      basal: new RunningStats(),
      energy: new RunningStats(),
      founder: founder,
    });
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
    if (!this.lineages.has(agent.lineageId)) {
      this.registerLineage(agent.lineageId, agent.genome);
    }
    return agent;
  }
}
