import { Agent } from './Agent';
import { rng } from './utils/random';
import type { LineageMetadata, WorldSnapshot } from './simulation/metrics';
import type {
  SimulationEvent,
  SimulationEventBus,
} from './simulation/event-bus';
import {
  SPECIES_REGISTRY,
  SpeciesType,
  type SpeciesDefinition,
} from './species';

let NEXT_ID = 0;
export function resetAgentId() {
  NEXT_ID = 0;
}

export interface SimConfig {
  growthRate: number; // food regrowth per tile per tick
  foodValue: number; // max E per tile
  lineageThreshold: number;
  snapshotInterval: number; // ticks between snapshots
  metricsInterval: number; // how many ticks between flushing secondary metrics
  histogramInterval: number;
}

export interface Tile {
  x: number;
  y: number;
  food: number;
  corpse?: number;
}

export class World {
  public width: number;
  public height: number;
  public food: Float32Array;
  public corpses: Float32Array;
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
    this.corpses = new Float32Array(width * height);
    this.food.fill(0.5); // init food per tile
    this.patchMap = new Float32Array(width * height);
    this.generatePatchMap();

    // Subscribe to events
    this.bus.on('birth', (e) => this.eventQueue.push(e));
    this.bus.on('death', (e) => this.eventQueue.push(e));
  }

  // ───────── utilities
  public getBus(): SimulationEventBus {
    return this.bus;
  }

  public idx(x: number, y: number): number {
    return (y | 0) * this.width + (x | 0);
  }

  public getTile(x: number, y: number): Tile {
    const i = this.idx(x, y);
    return { x, y, food: this.food[i], corpse: this.corpses[i] };
  }

  public consumeFood(tx: number, ty: number, units: number, agent: Agent): number {
    const i = this.idx(tx, ty);
    const available = this.food[i];
    const eaten = Math.min(available, units);
    if (eaten > 0) {
      this.food[i] -= eaten;
      const gained = eaten * this.config.foodValue;
      this.bus.emit({
        type: 'food-consumed',
        payload: { tick: this.tickCount, agent, amount: gained, x: tx, y: ty },
      });
    }
    return eaten;
  }

  public consumeCorpse(tx: number, ty: number, units: number): number {
    const i = this.idx(tx, ty);
    const available = this.corpses[i];
    const eaten = Math.min(available, units);
    if (eaten > 0) {
      this.corpses[i] -= eaten;
      // Note: We don't emit a food-consumed event for corpses to keep logs clean
    }
    return eaten;
  }

  private generatePatchMap(): void {
    // Simplified for now, can be species-specific later
    const hotspotCount = 5;
    const hotspotRadius = 20;

    const centers: { x: number; y: number }[] = [];
    for (let i = 0; i < hotspotCount; i++) {
      centers.push({
        x: Math.floor(rng() * this.width),
        y: Math.floor(rng() * this.height),
      });
    }
    const sigma = hotspotRadius;
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
    const { speciesDef } = parent;

    const childGenome = speciesDef.mutationFn(parent.genome);

    let lineageId = parent.lineageId;
    const deltas = parent.genome.map((g, i) => Math.abs(g - childGenome[i]));
    if (deltas.some((d) => d >= this.config.lineageThreshold)) {
      lineageId = ++this.lineageCounter;
      this.registerLineage(lineageId, childGenome);
    }

    const child = this.spawnAgent(
      speciesDef.key,
      parent.x,
      parent.y,
      speciesDef.birthCost,
      childGenome,
      lineageId,
    );

    const meta = this.lineageData.get(child.lineageId);
    if (meta) {
      meta.births++;
      meta.birthsTick++;
    }
  }

  public killAgent(agent: Agent) {
    this.bus.emit({ type: 'death', payload: { agent } });
  }

  public findNearestAgent(
    sourceAgent: Agent,
    filter: (agent: Agent) => boolean,
    radius: number,
  ): Agent | null {
    let nearestAgent: Agent | null = null;
    let minDistanceSq = radius * radius;

    for (const agent of this.agents) {
      if (agent.id === sourceAgent.id || !filter(agent)) {
        continue;
      }

      const dx = agent.x - sourceAgent.x;
      const dy = agent.y - sourceAgent.y;
      const distanceSq = dx * dx + dy * dy;

      if (distanceSq < minDistanceSq) {
        minDistanceSq = distanceSq;
        nearestAgent = agent;
      }
    }

    return nearestAgent;
  }

  public randomAdjacent(agent: Agent) {
    return {
      x: (agent.x + Math.floor(rng() * 3) - 1 + this.width) % this.width,
      y: (agent.y + Math.floor(rng() * 3) - 1 + this.height) % this.height,
    };
  }

  private handleDeath(agent: Agent) {
    this.deathsThisTick++;
    const meta = this.lineageData.get(agent.lineageId);
    if (meta) {
      meta.deaths++;
      meta.deathsTick++;
    }
    // Add agent's energy to the corpse layer
    const idx = this.idx(agent.x, agent.y);
    this.corpses[idx] += agent.energy;
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

    // Create a map of agent locations for efficient lookup
    const agentGrid = new Map<string, Agent[]>();
    for (const agent of this.agents) {
      const key = `${agent.x},${agent.y}`;
      if (!agentGrid.has(key)) {
        agentGrid.set(key, []);
      }
      agentGrid.get(key)!.push(agent);
    }

    // Main agent loop
    for (const agent of this.agents) {
      agent.age++;
      agent.energy -= agent.speciesDef.basalMetabolicRate;
      this.basalDebit += agent.speciesDef.basalMetabolicRate;

      const { behavior } = agent.speciesDef;
      behavior.move(agent, this);

      // Handle eating based on what's on the agent's new tile
      const currentTile = this.getTile(agent.x, agent.y);
      behavior.eat(agent, currentTile, this); // Attempt to eat ground food/corpses

      const agentsOnTile = agentGrid.get(`${agent.x},${agent.y}`) || [];
      for (const other of agentsOnTile) {
        if (agent.id !== other.id) {
          behavior.eat(agent, other, this); // Attempt to eat other agent
        }
      }

      behavior.reproduce(agent, this);

      if (agent.energy < agent.speciesDef.deathThreshold) {
        this.bus.emit({ type: 'death', payload: { agent } });
      }
    }

    this.processEventQueue();

    this.deathsTotal += this.deathsThisTick;
    this.birthsTotal += this.birthsThisTick;

    for (const agent of this.agents) {
      agent.resetTickMetrics();
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
    speciesKey: SpeciesType,
    x: number,
    y: number,
    energy = 10,
    genome?: Float32Array,
    lineageId?: number,
  ): Agent {
    const speciesDef = SPECIES_REGISTRY.get(speciesKey);
    if (!speciesDef) {
      throw new Error(`Species with key "${speciesKey}" not found in registry.`);
    }

    const id = lineageId !== undefined ? lineageId : this.lineageCounter++;
    const agent = new Agent(
      NEXT_ID++,
      x,
      y,
      this.bus,
      this.config,
      speciesDef,
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
