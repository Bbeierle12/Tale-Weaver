import { Agent } from './Agent';
import type { TickStats } from './ai/schemas';
import { rng } from './utils/random';
import { RunningStats, calculateGini } from './utils/stats';
import { SIM_CONFIG } from './config';
import { Hist } from './utils/hist';
import type { LineageMetadata } from './LineageMetrics';
import type {
  SimulationEvent,
  SimulationEventBus,
} from './simulation/event-bus';

let NEXT_ID = 0;
export function resetAgentId() {
  NEXT_ID = 0;
}

export class World {
  public width: number;
  public height: number;
  public food: Float32Array;
  public agents: Agent[] = [];
  private bus: SimulationEventBus;
  private eventQueue: SimulationEvent[] = [];

  // Telemetry
  public tickCount = 0;
  public births = 0; // per-tick
  public deaths = 0; // per-tick
  public deathsTotal = 0; // running total
  public birthsTotal = 0; // running total
  public moveDebit = 0;
  public basalDebit = 0;
  public readonly energyHist = new Hist(SIM_CONFIG.histBins);
  public readonly forageLog: {
    tick: number;
    id: number;
    x: number;
    y: number;
    e: number;
  }[];
  private foragePtr = 0;
  private patchMap: Float32Array;

  // CSV Buffers / History
  public history: TickStats[] = []; // For AI analysis - object format
  public readonly series: string[] = [
    'tick,pop,births,deaths,meanE,sdE,moveDebit,basalDebit,minFood,maxFood,foodGini,successRate,meanSteps',
  ];
  public readonly histRows: string[] = [
    `tick,${Array.from({ length: SIM_CONFIG.histBins }, (_, i) => `b${i}`).join(
      ',',
    )}`,
  ];
  public readonly snapshots: string[] = ['tick,id,x,y,energy,age'];
  public readonly moveStatsRows: string[] = [
    'tick,totalSteps,totalDist,meanSteps,sdSteps,meanDist,sdDist',
  ];
  public readonly searchRows: string[] = ['tick,successRate'];
  public readonly lineageRows: string[] = [
    'tick,lineageId,members,meanSpeed,meanVision,meanBasal,meanEnergy,births,deaths',
  ];
  public readonly lineageFitnessRows: string[] = ['lineageId,fitness'];

  // Lineage tracking
  public lineageCounter = 0;
  private lineageData: Map<number, LineageMetadata> = new Map();

  // Scratch buffers to avoid GC
  private stepBuf: number[] = [];

  constructor(bus: SimulationEventBus, width = 200, height = 200) {
    this.bus = bus;
    this.width = width;
    this.height = height;
    this.food = new Float32Array(width * height);
    this.food.fill(0.5); // init food per tile
    this.patchMap = new Float32Array(width * height);
    this.generatePatchMap();
    this.forageLog = new Array(SIM_CONFIG.forageBuf)
      .fill(null)
      .map(() => ({ tick: 0, id: 0, x: 0, y: 0, e: 0 }));

    // Subscribe to events
    this.bus.on('birth', (e) => this.eventQueue.push(e));
    this.bus.on('death', (e) => this.eventQueue.push(e));
    this.bus.on('food-consumed', (e) => this.eventQueue.push(e));
  }

  // ───────── utilities
  private idx(x: number, y: number): number {
    return (y | 0) * this.width + (x | 0);
  }

  public consumeFood(tx: number, ty: number, units: number): number {
    const i = this.idx(tx, ty);
    const available = this.food[i];
    const eaten = Math.min(available, units);
    if (eaten > 0) {
      this.food[i] -= eaten;
    }
    return eaten;
  }

  private generatePatchMap(): void {
    const centers: { x: number; y: number }[] = [];
    for (let i = 0; i < SIM_CONFIG.hotspotCount; i++) {
      centers.push({
        x: Math.floor(rng() * this.width),
        y: Math.floor(rng() * this.height),
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

  // ───────── Event Handlers
  private handleBirth(parent: Agent) {
    this.births++;
    const childGenome = this.mutateGenome(parent.genome);
    let lineageId = parent.lineageId;

    // Simple delta check for lineage branching
    const deltas = parent.genome.map((g, i) => Math.abs(g - childGenome[i]));
    if (deltas.some((d) => d >= SIM_CONFIG.lineageThreshold)) {
      lineageId = ++this.lineageCounter;
      this.registerLineage(lineageId, childGenome);
    }

    const child = this.spawnAgent(
      parent.x,
      parent.y,
      SIM_CONFIG.birthCost,
      childGenome,
      lineageId,
    );

    const meta = this.lineageData.get(child.lineageId);
    if (meta) {
      meta.births++;
      meta.birthsTick++;
    }
  }

  private handleDeath(agent: Agent) {
    this.deaths++;
    const meta = this.lineageData.get(agent.lineageId);
    if (meta) {
      meta.deaths++;
      meta.deathsTick++;
    }
  }

  private handleFoodConsumed(
    agent: Agent,
    amount: number,
    x: number,
    y: number,
  ) {
    const entry = this.forageLog[this.foragePtr];
    entry.tick = this.tickCount;
    entry.id = agent.id;
    entry.x = x;
    entry.y = y;
    entry.e = amount;
    this.foragePtr = (this.foragePtr + 1) % SIM_CONFIG.forageBuf;
  }

  private processEventQueue() {
    const agentsToCull = new Set<Agent>();
    // Make a copy to prevent mutation while iterating
    const queue = [...this.eventQueue];
    this.eventQueue = [];

    for (const event of queue) {
      switch (event.type) {
        case 'birth':
          this.handleBirth(event.payload.parent);
          break;
        case 'death':
          this.handleDeath(event.payload.agent);
          agentsToCull.add(event.payload.agent);
          break;
        case 'food-consumed':
          this.handleFoodConsumed(
            event.payload.agent,
            event.payload.amount,
            event.payload.x,
            event.payload.y,
          );
          break;
      }
    }
    if (agentsToCull.size > 0) {
      this.agents = this.agents.filter((a) => !agentsToCull.has(a));
    }
  }

  // ───────── main update
  public step(): void {
    this.tickCount++;
    this.births = 0;
    this.deaths = 0;

    for (const meta of this.lineageData.values()) {
      meta.birthsTick = 0;
      meta.deathsTick = 0;
    }

    this.regrow();

    // Agents emit events
    for (const agent of this.agents) {
      agent.tick(this);
    }

    // World processes queued events
    this.processEventQueue();

    this.deathsTotal += this.deaths;
    this.birthsTotal += this.births;

    this.pushSeriesRow();

    if (this.tickCount % SIM_CONFIG.histogramInterval === 0) {
      this.pushLineageStats();
    }
    if (this.tickCount % SIM_CONFIG.snapshotInterval === 0) {
      this.pushSnapshots();
    }

    for (const agent of this.agents) {
      agent.resetTickMetrics();
    }

    this.moveDebit = 0;
    this.basalDebit = 0;
  }

  // ───────── Getters for data that might be needed by agents but managed by world
  public getForageData(): readonly {
    tick: number;
    id: number;
    x: number;
    y: number;
    e: number;
  }[] {
    const populated = this.forageLog
      .slice(0, this.foragePtr)
      .filter((e) => e.tick > 0);
    return populated;
  }

  private mutateGenome(src: Float32Array): Float32Array {
    const { speed, vision, basal } = SIM_CONFIG.mutationRates;
    const childGenome = new Float32Array(src);

    if (rng() < speed) {
      const d = (rng() * 2 - 1) * 0.1;
      childGenome[0] = Math.min(1, Math.max(0, childGenome[0] + d));
    }
    if (rng() < vision) {
      const d = (rng() * 2 - 1) * 0.1;
      childGenome[1] = Math.min(1, Math.max(0, childGenome[1] + d));
    }
    if (rng() < basal) {
      const d = (rng() * 2 - 1) * 0.1;
      childGenome[2] = Math.min(1, Math.max(0, childGenome[2] + d));
    }
    return childGenome;
  }

  private pushLineageStats(): void {
    const agentsByLineage = new Map<number, Agent[]>();
    for (const agent of this.agents) {
      if (!agentsByLineage.has(agent.lineageId)) {
        agentsByLineage.set(agent.lineageId, []);
      }
      agentsByLineage.get(agent.lineageId)!.push(agent);
    }

    for (const [id, agents] of agentsByLineage.entries()) {
      const meta = this.lineageData.get(id)!;
      const members = agents.length;
      meta.cumulativeLifeTicks += members * SIM_CONFIG.histogramInterval;

      const speed = new RunningStats();
      const vision = new RunningStats();
      const basal = new RunningStats();
      const energy = new RunningStats();

      for (const agent of agents) {
        speed.push(agent.speed);
        vision.push(agent.vision);
        basal.push(agent.basalRateTrait);
        energy.push(agent.energy);
      }

      const row = [
        this.tickCount,
        id,
        members,
        speed.avg.toFixed(3),
        vision.avg.toFixed(3),
        basal.avg.toFixed(5),
        energy.avg.toFixed(3),
        meta.birthsTick,
        meta.deathsTick,
      ].join(',');
      this.lineageRows.push(row);
    }
  }

  public finalizeLineages(): void {
    const arr = Array.from(this.lineageData.entries()).map(([id, m]) => ({
      id,
      fitness: m.cumulativeLifeTicks,
    }));
    arr.sort((a, b) => b.fitness - a.fitness);
    for (const e of arr) {
      this.lineageFitnessRows.push(`${e.id},${e.fitness}`);
    }
  }

  private pushSeriesRow(): void {
    const pop = this.agents.length;

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
      const dDist = steps - meanDist;
      varDist += dDist * dDist;
    }
    const sdDist = pop > 0 ? Math.sqrt(varDist / pop) : 0;

    if (this.tickCount % SIM_CONFIG.metricsInterval === 0) {
      this.moveStatsRows.push(
        `${this.tickCount},${sumSteps},${sumDist.toFixed(
          2,
        )},${meanSteps.toFixed(2)},${sdSteps.toFixed(2)},${meanDist.toFixed(
          2,
        )},${sdDist.toFixed(2)}`,
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
      energyHistogram:
        this.tickCount % SIM_CONFIG.histogramInterval === 0
          ? this.energyHist.toArray()
          : undefined,
      avgTileFood: foodStats.avg,
      avgTileFoodSD: foodStats.sd,
      minTileFood: foodStats.min,
      maxTileFood: foodStats.max,
      foodGini,
    };
    this.history.push(tickStats);

    const row = [
      this.tickCount,
      pop,
      this.births,
      this.deaths,
      energyStats.avg.toFixed(3),
      energyStats.sd.toFixed(3),
      this.moveDebit.toFixed(3),
      this.basalDebit.toFixed(3),
      foodStats.min.toFixed(2),
      foodStats.max.toFixed(2),
      foodGini.toFixed(3),
      successRate.toFixed(3),
      meanSteps.toFixed(2),
    ].join(',');
    this.series.push(row);
    this.histRows.push(
      `${this.tickCount},${this.energyHist.toArray().join(',')}`,
    );
  }

  private pushSnapshots(): void {
    for (const a of this.agents) {
      this.snapshots.push(
        `${this.tickCount},${a.id},${a.x},${a.y},${a.energy.toFixed(3)},${
          a.age
        }`,
      );
    }
  }

  public registerLineage(id: number, genome: Float32Array): void {
    if (!this.lineageData.has(id)) {
      this.lineageData.set(id, {
        founderGenome: genome,
        cumulativeLifeTicks: 0,
        births: 0,
        deaths: 0,
        birthsTick: 0,
        deathsTick: 0,
      });
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

  public spawnAgent(
    x: number,
    y: number,
    energy = 10,
    genome?: Float32Array,
    lineageId?: number,
  ): Agent {
    const id = lineageId !== undefined ? lineageId : this.lineageCounter++;
    const agent = new Agent(NEXT_ID++, x, y, this.bus, energy, genome, id);
    if (!this.lineageData.has(id)) {
      this.registerLineage(id, agent.genome);
    }
    this.agents.push(agent);
    return agent;
  }
}
