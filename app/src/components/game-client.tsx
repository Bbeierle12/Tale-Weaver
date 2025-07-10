'use client';

import { Hud } from './hud';
import { SimController } from '@/SimController';
import { World, resetAgentId, type SimConfig } from '@/world';
import { Renderer } from '@/renderer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Pause,
  Play,
  RotateCcw,
  Download,
  MessageSquare,
  BrainCircuit,
  FileText,
  StepForward,
  Database,
  BarChart,
} from 'lucide-react';
import {
  analyzeSimulationAction,
  generateSpeciesNameAction,
} from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { rng, setSeed } from '@/utils/random';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChatView } from './chat-view';
import { AnalysisDialog } from './analysis-dialog';
import { summarizeHistory } from '@/utils/history';
import { SimulationEventBus } from '@/simulation/event-bus';
import {
  HistoryPlugin,
  LineagePlugin,
  MetricsCollector,
  ForagePlugin,
  SnapshotPlugin,
} from '@/simulation/metrics';
import { SpeciesType } from '@/species';

const INITIAL_AGENT_COUNT = 50;

const getDefaultConfig = (): SimConfig => ({
  growthRate: 0.15,
  foodValue: 10,
  lineageThreshold: 0.05,
  snapshotInterval: 100,
  metricsInterval: 1,
  histogramInterval: 100,
});

interface SpeciesInfo {
  name: {
    genus: string;
    species: string;
  };
  color: string;
}

export function SimulationClient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<SimController | null>(null);
  const eventBusRef = useRef<SimulationEventBus | null>(null);
  const metricsCollectorRef = useRef<MetricsCollector | null>(null);

  const { toast } = useToast();

  const [world, setWorld] = useState<World | null>(null);
  const [isPaused, setIsPaused] = useState(true);
  const [hudData, setHudData] = useState({
    tick: 0,
    alive: 0,
    deathsTotal: 0,
    avgTileFood: 0,
    avgEnergy: 0,
  });

  const [peakAgentCount, setPeakAgentCount] = useState(0);
  const [seed, setSeedValue] = useState(1);
  const [simConfig] = useState(getDefaultConfig());
  const [lineageSpecies, setLineageSpecies] = useState<Map<number, SpeciesInfo>>(
    new Map(),
  );
  const [pendingNameRequests, setPendingNameRequests] = useState<Set<number>>(
    new Set(),
  );
  const [lineageCounts, setLineageCounts] = useState(new Map<number, number>());

  const [isAnalysisDialogOpen, setIsAnalysisDialogOpen] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);

  const resetSimulation = useCallback(
    (seedToUse: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (controllerRef.current) {
        controllerRef.current.stop();
        controllerRef.current.renderer.dispose();
      }

      setSeed(seedToUse);
      setSeedValue(seedToUse);

      resetAgentId();

      // Setup event bus and metrics collector
      if (!eventBusRef.current) {
        eventBusRef.current = new SimulationEventBus();
      } else {
        eventBusRef.current.off();
      }
      const bus = eventBusRef.current;

      const newWorld = new World(bus, simConfig);
      const metrics = new MetricsCollector(bus, () => newWorld.getSnapshot());
      metrics.register(new HistoryPlugin());
      metrics.register(new LineagePlugin());
      metrics.register(new ForagePlugin());
      metrics.register(new SnapshotPlugin());
      metricsCollectorRef.current = metrics;

      // Seed world
      for (let i = 0; i < INITIAL_AGENT_COUNT; i++) {
        newWorld.spawnAgent(
          SpeciesType.OMNIVORE,
          rng() * newWorld.width,
          rng() * newWorld.height,
        );
      }
      setWorld(newWorld);
      setPeakAgentCount(INITIAL_AGENT_COUNT);
      setLineageSpecies(new Map());
      setPendingNameRequests(new Set());
      setLineageCounts(new Map());

      const updateHud = () => {
        setHudData({
          tick: newWorld.tickCount,
          alive: newWorld.agents.length,
          deathsTotal: newWorld.deathsTotal,
          avgTileFood: newWorld.avgTileFood,
          avgEnergy: newWorld.avgEnergy,
        });
      };
      updateHud();

      const renderer = new Renderer(canvas, newWorld);
      const controller = new SimController(newWorld, renderer);
      controllerRef.current = controller;

      controller.onTick = () => {
        metrics.recordTick(); // Centralized metrics update
        updateHud();
        setPeakAgentCount((p) => Math.max(p, newWorld.agents.length));

        const newCounts = new Map<number, number>();
        for (const agent of newWorld.agents) {
          newCounts.set(
            agent.lineageId,
            (newCounts.get(agent.lineageId) || 0) + 1,
          );
        }
        setLineageCounts(newCounts);
      };

      controller.start();
      if (!controller.paused) {
        controller.togglePause();
      }
      setIsPaused(true);
      renderer.draw();
    },
    [simConfig],
  );

  const handleTogglePause = useCallback(() => {
    controllerRef.current?.togglePause();
    setIsPaused((p) => !p);
  }, []);

  const handleStep = useCallback(() => {
    if (isPaused && controllerRef.current) {
      // Manually advance one tick
      controllerRef.current.tick();
      // HUD update will be triggered by the onTick callback
    }
  }, [isPaused]);

  const createCsvBlob = (header: string, data: string[]) => {
    return new Blob([header + '\n' + data.join('\n')], { type: 'text/csv' });
  };

  const downloadCsv = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadLog = useCallback(() => {
    const historyPlugin = metricsCollectorRef.current?.getPlugin<HistoryPlugin>(
      'history',
    );
    if (!historyPlugin || historyPlugin.series.length <= 1) {
      toast({ variant: 'destructive', title: 'No Data to Download' });
      return;
    }
    const [header, ...rows] = historyPlugin.series;
    const blob = createCsvBlob(header, rows);
    downloadCsv(blob, `timeseries-seed-${seed}.csv`);
  }, [seed, toast]);

  const handleDownloadForageLog = useCallback(() => {
    const foragePlugin = metricsCollectorRef.current?.getPlugin<ForagePlugin>(
      'forage',
    );
    if (!foragePlugin) return;
    const forageData = foragePlugin.getForageData();
    if (forageData.length === 0) {
      toast({ variant: 'destructive', title: 'No Data to Download' });
      return;
    }
    const header = 't,i,x,y,f';
    const csvRows = forageData.map(
      (d) => `${d.t},${d.i},${d.x},${d.y},${d.f.toFixed(2)}`,
    );
    const blob = createCsvBlob(header, csvRows);
    downloadCsv(blob, `forage-log-seed-${seed}.csv`);
  }, [seed, toast]);

  const handleDownloadSnapshotLog = useCallback(() => {
    const snapshotPlugin = metricsCollectorRef.current?.getPlugin<SnapshotPlugin>(
      'snapshot',
    );
    if (!snapshotPlugin || snapshotPlugin.snapshots.length <= 1) {
      toast({ variant: 'destructive', title: 'No Data to Download' });
      return;
    }
    const [header, ...rows] = snapshotPlugin.snapshots;
    const blob = createCsvBlob(header, rows);
    downloadCsv(blob, `agent-snapshots-seed-${seed}.csv`);
  }, [seed, toast]);

  const handleDownloadHistLog = useCallback(() => {
    const historyPlugin = metricsCollectorRef.current?.getPlugin<HistoryPlugin>(
      'history',
    );
    if (!historyPlugin || historyPlugin.histRows.length <= 1) {
      toast({ variant: 'destructive', title: 'No Data to Download' });
      return;
    }
    const [header, ...rows] = historyPlugin.histRows;
    const blob = createCsvBlob(header, rows);
    downloadCsv(blob, `hist-log-seed-${seed}.csv`);
  }, [seed, toast]);

  const handleAnalyze = useCallback(async () => {
    const historyPlugin = metricsCollectorRef.current?.getPlugin<HistoryPlugin>(
      'history',
    );
    if (!world || !isPaused || !historyPlugin || historyPlugin.history.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Not Ready for Analysis',
        description:
          'Please pause the simulation after some data has been generated.',
      });
      return;
    }

    setIsAnalysisDialogOpen(true);
    setIsAnalysisLoading(true);
    setAnalysisResult(null);

    const { history: prunedHistory, truncated } = summarizeHistory(
      historyPlugin.history,
    );

    if (truncated) {
      toast({
        title: 'History Truncated',
        description: 'Simulation history was downsampled to fit size limits.',
      });
    }

    const analysisInput = {
      ticks: world.tickCount,
      peakAgentCount,
      initialAgentCount: INITIAL_AGENT_COUNT,
      initialFoodPerTile: world.config.foodValue,
      regrowthRate: world.config.growthRate,
      simulationHistory: prunedHistory,
    };

    const result = await analyzeSimulationAction(analysisInput);
    setAnalysisResult(result.analysis);
    setIsAnalysisLoading(false);
  }, [world, isPaused, peakAgentCount, toast]);

  useEffect(() => {
    resetSimulation(Date.now() % 1_000_000);

    return () => {
      if (controllerRef.current) {
        controllerRef.current.stop();
        // Clean up renderer event listeners
        controllerRef.current.renderer.dispose();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect to generate names for new lineages
  useEffect(() => {
    if (!world) return;

    for (const lineageId of lineageCounts.keys()) {
      if (!lineageSpecies.has(lineageId) && !pendingNameRequests.has(lineageId)) {
        const agent = world.agents.find((a) => a.lineageId === lineageId);
        if (agent) {
          const color = agent.speciesDef.color;
          setPendingNameRequests((prev) => new Set(prev).add(lineageId));

          generateSpeciesNameAction({ color })
            .then((name) => {
              if (name.genus && name.species) {
                setLineageSpecies((prev) =>
                  new Map(prev).set(lineageId, { name, color }),
                );
              }
            })
            .catch((err) => {
              console.error(
                `Failed to generate name for lineage ${lineageId}:`,
                err,
              );
            })
            .finally(() => {
              setPendingNameRequests((prev) => {
                const next = new Set(prev);
                next.delete(lineageId);
                return next;
              });
            });
        }
      }
    }
  }, [world, lineageCounts, lineageSpecies, pendingNameRequests]);

  const historyPlugin = metricsCollectorRef.current?.getPlugin<HistoryPlugin>(
    'history',
  );

  return (
    <div className="relative h-screen w-full bg-gray-900">
      <Hud {...hudData} />

      <Tabs
        defaultValue="species"
        className="absolute top-16 right-4 bg-gray-900/80 backdrop-blur-sm border border-gray-700 p-1 rounded-lg w-80 z-10 flex flex-col"
        style={{ height: 'calc(100vh - 9rem)' }}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="species">
            <BrainCircuit className="mr-2" />
            Species
          </TabsTrigger>
          <TabsTrigger value="chat">
            <MessageSquare className="mr-2" />
            Chat
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="species"
          className="flex-1 overflow-y-auto mt-2 pr-1 font-mono text-white text-sm"
        >
          <h3 className="font-bold mb-2 text-base px-2">Lineages on Board</h3>
          {lineageCounts.size === 0 && (
            <p className="text-xs text-gray-400 px-2">No agents yet.</p>
          )}
          <ul className="space-y-2">
            {Array.from(lineageCounts.entries())
              .sort(([, a], [, b]) => b - a)
              .map(([lineageId, count]) => {
                const speciesInfo = lineageSpecies.get(lineageId);
                return (
                  <li
                    key={lineageId}
                    className="flex items-start justify-between gap-3 px-2"
                  >
                    <div className="flex items-start gap-2 pt-1">
                      <div
                        className="w-4 h-4 shrink-0 rounded-full border border-white/20"
                        style={{ backgroundColor: speciesInfo?.color ?? '#888' }}
                      />
                      <div className="flex-1 text-xs">
                        {speciesInfo ? (
                          <>
                            <span className="font-bold italic display-block">
                              {speciesInfo.name.genus} {speciesInfo.name.species}
                            </span>
                            <span className="text-gray-400 block">
                              Lineage #{lineageId}
                            </span>
                          </>
                        ) : pendingNameRequests.has(lineageId) ? (
                          <span className="text-gray-400">naming...</span>
                        ) : (
                          <span>Lineage #{lineageId}</span>
                        )}
                      </div>
                    </div>
                    <span className="font-bold text-base">{count}</span>
                  </li>
                );
              })}
          </ul>
        </TabsContent>
        <TabsContent value="chat" className="flex-1 mt-0 -mx-1 -mb-1">
          <ChatView
            isPaused={isPaused}
            simulationData={{
              ticks: hudData.tick,
              peakAgentCount: peakAgentCount,
              initialAgentCount: INITIAL_AGENT_COUNT,
              initialFoodPerTile: world?.config.foodValue ?? 0,
              regrowthRate: world?.config.growthRate ?? 0,
              simulationHistory: historyPlugin?.history ?? [],
            }}
          />
        </TabsContent>
      </Tabs>

      <canvas ref={canvasRef} className="h-full w-full" />
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
        {/* Left-aligned controls */}
        <div className="flex items-center gap-2">
          <Button onClick={handleTogglePause} className="w-28">
            {isPaused ? (
              <Play className="mr-2 h-4 w-4" />
            ) : (
              <Pause className="mr-2 h-4 w-4" />
            )}
            {isPaused ? (hudData.tick === 0 ? 'Start' : 'Resume') : 'Pause'}
          </Button>
          <Button
            onClick={handleStep}
            variant="outline"
            size="icon"
            disabled={!isPaused}
            title="Step Forward"
          >
            <StepForward className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => resetSimulation(seed)}
            variant="outline"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <div className="flex items-center gap-2 pl-4">
            <Label
              htmlFor="seed-input"
              className="text-white font-mono text-sm"
            >
              Seed
            </Label>
            <Input
              id="seed-input"
              type="number"
              value={seed}
              onChange={(e) => setSeedValue(Number(e.target.value) || 0)}
              className="w-24 bg-gray-800 border-gray-700"
              disabled={!isPaused}
            />
          </div>
        </div>

        {/* Right-aligned controls */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleAnalyze}
            variant="outline"
            disabled={!isPaused || hudData.tick === 0}
          >
            <FileText className="mr-2 h-4 w-4" />
            Analyze
          </Button>
          <Button
            onClick={handleDownloadLog}
            variant="outline"
            size="icon"
            disabled={!isPaused || hudData.tick === 0}
            title="Download Timeseries (CSV)"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleDownloadForageLog}
            variant="outline"
            size="icon"
            disabled={!isPaused || hudData.tick === 0}
            title="Download Forage Log (CSV)"
          >
            <Database className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleDownloadSnapshotLog}
            variant="outline"
            size="icon"
            disabled={!isPaused || hudData.tick === 0}
            title="Download Snapshots (CSV)"
          >
            <Database className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleDownloadHistLog}
            variant="outline"
            size="icon"
            disabled={!isPaused || hudData.tick === 0}
            title="Download Histogram Log (CSV)"
          >
            <BarChart className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <AnalysisDialog
        open={isAnalysisDialogOpen}
        onOpenChange={setIsAnalysisDialogOpen}
        analysis={analysisResult}
        isLoading={isAnalysisLoading}
      />
    </div>
  );
}
