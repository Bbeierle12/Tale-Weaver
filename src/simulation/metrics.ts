/**
 * @fileoverview Decouples all simulation telemetry into a standalone,
 * event-driven MetricsCollector with plugin-based metrics.
 */

import type { Agent } from '@/Agent';
import type { SimConfig } from '@/world';
import { calculateGini, RunningStats } from '@/utils/stats';
import { Hist } from '@/utils/hist';
import type { SimulationEvent, SimulationEventBus } from './event-bus';

// -----------------------------------------------------------------------------
// --- Type Definitions --------------------------------------------------------
// -----------------------------------------------------------------------------

export interface LineageMetadata {
  founderGenome: Float32Array;
  cumulativeLifeTicks: number;
  births: number;
  deaths: number;
  birthsTick: number;
  deathsTick: number;
}

export interface ForageSample {
  t: number; // tick
  i: number; // agent id
  x: number;
  y: number;
  f: number; // foodEaten
}

export interface TickStats {
  tick: number;
  population: number;
  births: number;
  deaths: number;
  avgEnergy: number;
  energySD: number;
  minEnergy: number;
  maxEnergy: number;
  energyHistogram?: number[];
  avgTileFood: number;
  avgTileFoodSD: number;
  minTileFood: number;
  maxTileFood: number;
  foodGini: number;
}

export interface WorldSnapshot {
  tick: number;
  config: SimConfig;
  agents: Agent[];
  food: Float32Array;
  birthsThisTick: number;
  deathsThisTick: number;
  moveDebit: number;
  basalDebit: number;
  lineageData: Map<number, LineageMetadata>;
}

export interface MetricsPlugin {
  name: string;
  subscribe(bus: SimulationEventBus, getSnapshot: () => WorldSnapshot): void;
  reset(): void;
  recordTick(snapshot: WorldSnapshot): void;
  finalize?(): void;
}

// -----------------------------------------------------------------------------
// --- Metrics Collector -------------------------------------------------------
// -----------------------------------------------------------------------------

export class MetricsCollector {
  private plugins: Map<string, MetricsPlugin> = new Map();

  constructor(
    private bus: SimulationEventBus,
    private getSnapshot: () => WorldSnapshot,
  ) {}

  register(plugin: MetricsPlugin): void {
    plugin.subscribe(this.bus, this.getSnapshot);
    this.plugins.set(plugin.name, plugin);
  }

  getPlugin<T extends MetricsPlugin>(name: string): T | undefined {
    return this.plugins.get(name) as T | undefined;
  }

  reset(): void {
    for (const plugin of this.plugins.values()) {
      plugin.reset();
    }
  }

  recordTick(): void {
    const snapshot = this.getSnapshot();
    for (const plugin of this.plugins.values()) {
      plugin.recordTick(snapshot);
    }
  }

  finalize(): void {
    for (const plugin of this.plugins.values()) {
      if (plugin.finalize) {
        plugin.finalize();
      }
    }
  }
}

// -----------------------------------------------------------------------------
// --- Built-in Plugins --------------------------------------------------------
// -----------------------------------------------------------------------------

/**
 * Tracks and stores the full timeseries history of the simulation,
 * including population counts, energy stats, food stats, and histograms.
 */
export class HistoryPlugin implements MetricsPlugin {
  name = 'history';
  public history: TickStats[] = [];
  public series: string[] = [
    'tick,pop,births,deaths,meanE,sdE,moveDebit,basalDebit,minFood,maxFood,foodGini,successRate,meanSteps',
  ];
  public histRows: string[] = [];
  private energyHist!: Hist;

  subscribe(_: SimulationEventBus, getSnapshot: () => WorldSnapshot) {
    const { config } = getSnapshot();
    this.energyHist = new Hist(config.histBins);
    this.histRows.push(
      `tick,${Array.from({ length: config.histBins }, (_, i) => `b${i}`).join(',')}`,
    );
  }

  reset(): void {
    this.history = [];
    this.series.length = 1; // Keep header
    this.histRows.length = 1; // Keep header
    if (this.energyHist) this.energyHist.reset();
  }

  recordTick(snapshot: WorldSnapshot): void {
    const { tick, agents, food, birthsThisTick, deathsThisTick, moveDebit, basalDebit, config } = snapshot;
    const pop = agents.length;

    const energyStats = new RunningStats();
    this.energyHist.reset();
    for (const agent of agents) {
      energyStats.push(agent.energy);
      this.energyHist.add(agent.energy);
    }

    const foodStats = new RunningStats();
    const foodValues: number[] = [];
    for (const f of food) {
      foodStats.push(f);
      foodValues.push(f);
    }
    const foodGini = calculateGini(foodValues);

    let sumSteps = 0;
    let success = 0;
    for (const agent of agents) {
      sumSteps += agent.stepsTaken;
      if (agent.foundFood) success++;
    }
    const meanSteps = pop > 0 ? sumSteps / pop : 0;
    const successRate = pop > 0 ? success / pop : 0;

    const tickStats: TickStats = {
      tick: tick,
      population: pop,
      births: birthsThisTick,
      deaths: deathsThisTick,
      avgEnergy: energyStats.avg,
      energySD: energyStats.sd,
      minEnergy: energyStats.min,
      maxEnergy: energyStats.max,
      energyHistogram:
        tick % config.histogramInterval === 0
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
      tick,
      pop,
      birthsThisTick,
      deathsThisTick,
      energyStats.avg.toFixed(3),
      energyStats.sd.toFixed(3),
      moveDebit.toFixed(3),
      basalDebit.toFixed(3),
      foodStats.min.toFixed(2),
      foodStats.max.toFixed(2),
      foodGini.toFixed(3),
      successRate.toFixed(3),
      meanSteps.toFixed(2),
    ].join(',');
    this.series.push(row);
    this.histRows.push(`${tick},${this.energyHist.toArray().join(',')}`);
  }
}

/**
 * Tracks lineage diversification, stats, and final fitness.
 */
export class LineagePlugin implements MetricsPlugin {
  name = 'lineage';
  public lineageRows: string[] = [
    'tick,lineageId,members,meanSpeed,meanVision,meanBasal,meanEnergy,births,deaths',
  ];
  public lineageFitnessRows: string[] = ['lineageId,fitness'];

  subscribe() {}
  reset() {
    this.lineageRows.length = 1;
    this.lineageFitnessRows.length = 1;
  }

  recordTick(snapshot: WorldSnapshot): void {
    const { tick, agents, lineageData, config } = snapshot;

    if (tick % config.histogramInterval !== 0) return;

    const agentsByLineage = new Map<number, Agent[]>();
    for (const agent of agents) {
      if (!agentsByLineage.has(agent.lineageId)) {
        agentsByLineage.set(agent.lineageId, []);
      }
      agentsByLineage.get(agent.lineageId)!.push(agent);
    }

    for (const [id, lineageAgents] of agentsByLineage.entries()) {
      const meta = lineageData.get(id)!;
      const members = lineageAgents.length;
      meta.cumulativeLifeTicks += members * config.histogramInterval;

      const speed = new RunningStats();
      const vision = new RunningStats();
      const basal = new RunningStats();
      const energy = new RunningStats();

      for (const agent of lineageAgents) {
        speed.push(agent.speed);
        vision.push(agent.vision);
        basal.push(agent.basalRateTrait);
        energy.push(agent.energy);
      }

      const row = [
        tick,
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

  finalize(snapshot: WorldSnapshot): void {
    const arr = Array.from(snapshot.lineageData.entries()).map(([id, m]) => ({
      id,
      fitness: m.cumulativeLifeTicks,
    }));
    arr.sort((a, b) => b.fitness - a.fitness);
    for (const e of arr) {
      this.lineageFitnessRows.push(`${e.id},${e.fitness}`);
    }
  }
}

/**
 * Logs every time an agent consumes food.
 */
export class ForagePlugin implements MetricsPlugin {
  name = 'forage';
  private forageLog: ForageSample[] = [];

  subscribe(bus: SimulationEventBus): void {
    bus.on('food-consumed', (e) => {
      this.forageLog.push({
        t: e.payload.tick,
        i: e.payload.agent.id,
        x: e.payload.x,
        y: e.payload.y,
        f: e.payload.amount,
      });
    });
  }

  reset(): void {
    this.forageLog = [];
  }

  recordTick() {}

  getForageData(): readonly ForageSample[] {
    return this.forageLog;
  }
}

/**
 * Periodically captures a snapshot of all agents' state.
 */
export class SnapshotPlugin implements MetricsPlugin {
    name = 'snapshot';
    public snapshots: string[] = ['tick,id,x,y,energy,age'];
    
    subscribe() {}
    
    reset(): void {
        this.snapshots.length = 1;
    }
    
    recordTick(snapshot: WorldSnapshot): void {
        const { tick, agents, config } = snapshot;
        if (tick % config.snapshotInterval !== 0) return;
        
        for (const a of agents) {
            this.snapshots.push(
                `${tick},${a.id},${a.x},${a.y},${a.energy.toFixed(3)},${a.age}`
            );
        }
    }
}
