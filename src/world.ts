import { Agent } from './Agent';
import { rng } from './utils/random';
import type { LineageMetadata, WorldSnapshot } from './simulation/metrics';
import type {
  SimulationEvent,
  SimulationEventBus,
} from './simulation/event-bus';

let NEXT_ID = 0;
export function resetAgentId() {
  NEXT_ID = 0;
}

export interface SimConfig {
  growthRate: number; // food regrowth per tile per tick
  biteEnergy: number; // E gained per bite
  foodValue: number; // max E per tile
  birthThreshold: number; // E required before giving birth
  birthCost: number; // E transferred to child (and lost by parent)
  deathThreshold: number; // starvation boundary
  moveCostPerStep: number; // E lost per tile walked
  basalRate: number; // E lost per tick for being alive
  histBins: number; // energy‑histogram resolution
  snapshotInterval: number; // ticks between snapshots
  metricsInterval: number; // how many ticks between flushing secondary metrics
  hotspotCount: number; // number of Gaussian growth hotspots
  hotspotRadius: number; // sigma for hotspot Gaussian
  mutationRates: {
    speed: number;
    vision: number;
    basal: number;
  };
  lineageThreshold: number;
  histogramInterval: number;
}

export class World {
  public width: number;
  public height: number;
  public food: Float32Array;
  public agents: Agent[] = [];
  private bus: SimulationEventBus;
  private eventQueue: SimulationEvent[] = [];
  public config: SimConfig;

  // State
  public tickCount = 0;
  public birthsTotal = 0;
  public deathsTotal = 0;
  public moveDebit = 0;
  public basalDebit = 0;
  public birthsThisTick = 0;
  public deathsThisTick = 0;

  // Lineage tracking
  public lineageCounter = 0;
  public lineageData: Map<number, LineageMetadata> = new Map();
  private patchMap: Float32Array;

  constructor(
    bus: SimulationEventBus,
    config: SimConfig,
    width = 200,
    height = 200,
  ) {
    this.bus = bus;
    this.config = config;
    this.width = width;
    this.height = height;
    this.food = new Float32Array(width * height);
    this.food.fill(0.5); // init food per tile
    this.patchMap = new Float32Array(width * height);
    this.generatePatchMap();

    // Subscribe to events
    this.bus.on('birth', (e) => this.eventQueue.push(e));
    this.bus.on('death', (e) => this.eventQueue.push(e));
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
      this.bus.emit({
        type: 'food-consumed',
        payload: { tick: this.tickCount, amount: eaten, x: tx, y: ty, agent: null as any }, // Agent added in agent.ts
      });
    }
    return eaten;
  }

  private generatePatchMap(): void {
    const centers: { x: number; y: number }[] = [];
    for (let i = 0; i < this.config.hotspotCount; i++) {
      centers.push({
        x: Math.floor(rng() * this.width),
        y: Math.floor(rng() * this.height),
      });
    }
    const sigma = this.config.hotspotRadius;
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
    const rate = this.config.growthRate;
    const max = this.config.foodValue;
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
    this.birthsThisTick++;
    const childGenome = this.mutateGenome(parent.genome);
    let lineageId = parent.lineageId;

    const deltas = parent.genome.map((g, i) => Math.abs(g - childGenome[i]));
    if (deltas.some((d) => d >= this.config.lineageThreshold)) {
      lineageId = ++this.lineageCounter;
      this.registerLineage(lineageId, childGenome);
    }

    const child = this.spawnAgent(
      parent.x,
      parent.y,
      this.config.birthCost,
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
    this.deathsThisTick++;
    const meta = this.lineageData.get(agent.lineageId);
    if (meta) {
      meta.deaths++;
      meta.deathsTick++;
    }
  }

  private processEventQueue() {
    const agentsToCull = new Set<Agent>();
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
          // This event is handled by plugins, not the world directly
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
    this.birthsThisTick = 0;
    this.deathsThisTick = 0;
    this.moveDebit = 0;
    this.basalDebit = 0;

    for (const meta of this.lineageData.values()) {
      meta.birthsTick = 0;
      meta.deathsTick = 0;
    }

    this.regrow();

    for (const agent of this.agents) {
      agent.tick(this);
    }

    this.processEventQueue();

    this.deathsTotal += this.deathsThisTick;
    this.birthsTotal += this.birthsThisTick;

    for (const agent of this.agents) {
      agent.resetTickMetrics();
    }
  }

  private mutateGenome(src: Float32Array): Float32Array {
    const { speed, vision, basal } = this.config.mutationRates;
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

  public getSnapshot(): WorldSnapshot {
    return {
      tick: this.tickCount,
      config: this.config,
      agents: this.agents,
      food: this.food,
      birthsThisTick: this.birthsThisTick,
      deathsThisTick: this.deathsThisTick,
      moveDebit: this.moveDebit,
      basalDebit: this.basalDebit,
      lineageData: this.lineageData,
    };
  }

  public spawnAgent(
    x: number,
    y: number,
    energy = 10,
    genome?: Float32Array,
    lineageId?: number,
  ): Agent {
    const id = lineageId !== undefined ? lineageId : this.lineageCounter++;
    const agent = new Agent(
      NEXT_ID++,
      x,
      y,
      this.bus,
      this.config,
      energy,
      genome,
      id,
    );
    if (!this.lineageData.has(id)) {
      this.registerLineage(id, agent.genome);
    }
    this.agents.push(agent);
    return agent;
  }
}
