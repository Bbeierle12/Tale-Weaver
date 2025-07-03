'use client';

import { Hud } from './hud';
import { SimController } from '@/SimController';
import { World } from '@/world';
import { Renderer } from '@/renderer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Pause, Play, RotateCcw, Download, MessageSquare, BrainCircuit, FileText, StepForward, Database } from 'lucide-react';
import { analyzeSimulationAction, generateSpeciesNameAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { rng, setSeed } from '@/utils/random';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChatView } from './chat-view';
import { AnalysisDialog } from './analysis-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const INITIAL_AGENT_COUNT = 50;
const INITIAL_FOOD_PER_TILE = 0.5; // Must match default in world.ts

interface SpeciesName {
  genus: string;
  species: string;
}

export function SimulationClient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<SimController | null>(null);
  const hudIntervalRef = useRef<NodeJS.Timeout>();
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
  const [regrowthRate, setRegrowthRate] = useState(0.15);
  const [colorCounts, setColorCounts] = useState(new Map<string, number>());
  const [speciesNames, setSpeciesNames] = useState<Map<string, SpeciesName>>(new Map());
  const [pendingNameRequests, setPendingNameRequests] = useState<Set<string>>(new Set());

  const [isAnalysisDialogOpen, setIsAnalysisDialogOpen] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);

  const resetSimulation = useCallback((seedToUse: number, regrowthRateToUse: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (controllerRef.current) {
      controllerRef.current.stop();
    }
    if (hudIntervalRef.current) {
      clearInterval(hudIntervalRef.current);
    }
    
    setSeed(seedToUse);
    setSeedValue(seedToUse);

    const newWorld = new World(undefined, undefined, regrowthRateToUse);
    for (let i = 0; i < INITIAL_AGENT_COUNT; i++) {
      newWorld.spawnAgent(
        rng() * newWorld.width,
        rng() * newWorld.height
      );
    }
    setWorld(newWorld);
    setPeakAgentCount(INITIAL_AGENT_COUNT);
    setColorCounts(new Map());
    setSpeciesNames(new Map());
    setPendingNameRequests(new Set());
    
    setHudData({
      tick: newWorld.tick,
      alive: newWorld.agents.length,
      deathsTotal: newWorld.deathsTotal,
      avgTileFood: newWorld.avgTileFood,
      avgEnergy: newWorld.avgEnergy,
    });


    const renderer = new Renderer(canvas, newWorld);
    const controller = new SimController(newWorld, renderer);
    controllerRef.current = controller;

    controller.start();
    if (!controller.paused) {
      controller.togglePause();
    }
    setIsPaused(true);
    renderer.draw();

    hudIntervalRef.current = setInterval(() => {
      if (!controllerRef.current || controllerRef.current.paused) return;
      setHudData({
        tick: newWorld.tick,
        alive: newWorld.agents.length,
        deathsTotal: newWorld.deathsTotal,
        avgTileFood: newWorld.avgTileFood,
        avgEnergy: newWorld.avgEnergy,
      });
      setPeakAgentCount((p) => Math.max(p, newWorld.agents.length));

      const newColorCounts = new Map<string, number>();
      for (const agent of newWorld.agents) {
        newColorCounts.set(agent.color, (newColorCounts.get(agent.color) || 0) + 1);
      }
      setColorCounts(newColorCounts);

    }, 400);
  }, [toast]);

  const handleTogglePause = useCallback(() => {
    controllerRef.current?.togglePause();
    setIsPaused((p) => !p);
  }, []);
  
  const handleStep = useCallback(() => {
    // If we're at tick 0, we need to ensure the simulation is ready,
    // but without starting the continuous loop.
    if (hudData.tick === 0 && isPaused) {
       controllerRef.current?.togglePause(); // Start it
       controllerRef.current?.togglePause(); // then pause it immediately.
    }
    controllerRef.current?.step();
    // Manually update HUD after a step since the interval won't run.
    if (world) {
        setHudData({
            tick: world.tick,
            alive: world.agents.length,
            deathsTotal: world.deathsTotal,
            avgTileFood: world.avgTileFood,
            avgEnergy: world.avgEnergy,
        });
    }
  }, [hudData.tick, isPaused, world]);

  const handleDownloadLog = useCallback(() => {
    if (!world || world.history.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Data to Download',
        description: 'Run the simulation to generate data first.',
      });
      return;
    }

    const jsonl = world.history.map((tick) => JSON.stringify(tick)).join('\n');
    const blob = new Blob([jsonl], {type: 'application/jsonl'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simulation-log-seed-${seed}.jsonl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [world, seed, toast]);

  const handleDownloadForageLog = useCallback(() => {
    if (!world || world.getForageLog().length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Data to Download',
        description: 'Run the simulation to generate forage data first.',
      });
      return;
    }

    const header = 't,i,x,y,f\n';
    const csv = world.getForageLog().map(s => `${s.t},${s.i},${s.x},${s.y},${s.f.toFixed(3)}`).join('\n');
    const blob = new Blob([header + csv], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forage-log-seed-${seed}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [world, seed, toast]);

  const handleDownloadSnapshotLog = useCallback(() => {
    if (!world || world.getAgentSnapshotLog().length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Data to Download',
        description: 'Run the simulation to generate snapshot data first (runs every 100 ticks).',
      });
      return;
    }

    const header = 'tick,id,x,y,energy\n';
    const csv = world.getAgentSnapshotLog().map(s => `${s.tick},${s.id},${s.x},${s.y},${s.energy}`).join('\n');
    const blob = new Blob([header + csv], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-snapshots-seed-${seed}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [world, seed, toast]);

  const handleAnalyze = useCallback(async () => {
    if (!world || !isPaused || world.history.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Not Ready for Analysis',
        description: 'Please pause the simulation after some data has been generated.',
      });
      return;
    }

    setIsAnalysisDialogOpen(true);
    setIsAnalysisLoading(true);
    setAnalysisResult(null);

    const analysisInput = {
      ticks: world.tick,
      peakAgentCount,
      initialAgentCount: INITIAL_AGENT_COUNT,
      initialFoodPerTile: INITIAL_FOOD_PER_TILE,
      regrowthRate: world.growthRate,
      simulationHistory: world.history,
    };

    const result = await analyzeSimulationAction(analysisInput);
    setAnalysisResult(result.analysis);
    setIsAnalysisLoading(false);
  }, [world, isPaused, peakAgentCount, toast]);

  useEffect(() => {
    resetSimulation(Date.now() % 1_000_000, 0.15);

    return () => {
      if (controllerRef.current) {
        controllerRef.current.stop();
      }
      if (hudIntervalRef.current) {
        clearInterval(hudIntervalRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!colorCounts) return;
  
    const newColors = Array.from(colorCounts.keys());
  
    for (const color of newColors) {
      if (!speciesNames.has(color) && !pendingNameRequests.has(color)) {
        setPendingNameRequests(prev => new Set(prev).add(color));
        
        generateSpeciesNameAction({ color })
          .then(name => {
            if (name.genus && name.species) {
              setSpeciesNames(prev => new Map(prev).set(color, name));
            }
          })
          .catch(err => {
            console.error(`Failed to generate name for color ${color}:`, err);
          })
          .finally(() => {
            setPendingNameRequests(prev => {
              const next = new Set(prev);
              next.delete(color);
              return next;
            });
          });
      }
    }
  }, [colorCounts, speciesNames, pendingNameRequests]);

  return (
    <div className="relative h-screen w-full bg-gray-900">
      <Hud {...hudData} />

      <Tabs defaultValue="species" className="absolute top-16 right-4 bg-gray-900/80 backdrop-blur-sm border border-gray-700 p-1 rounded-lg w-80 z-10 flex flex-col" style={{height: 'calc(100vh - 9rem)'}}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="species"><BrainCircuit className="mr-2"/>Species</TabsTrigger>
          <TabsTrigger value="chat"><MessageSquare className="mr-2"/>Chat</TabsTrigger>
        </TabsList>
        <TabsContent value="species" className="flex-1 overflow-y-auto mt-2 pr-1 font-mono text-white text-sm">
          <h3 className="font-bold mb-2 text-base px-2">Species on Board</h3>
          {colorCounts.size === 0 && <p className="text-xs text-gray-400 px-2">No agents yet.</p>}
          <ul className="space-y-2">
            {Array.from(colorCounts.entries())
              .sort(([, a], [, b]) => b - a)
              .map(([color, count]) => {
                const speciesInfo = speciesNames.get(color);
                return (
                <li key={color} className="flex items-start justify-between gap-3 px-2">
                  <div className="flex items-start gap-2 pt-1">
                    <div className="w-4 h-4 shrink-0 rounded-full border border-white/20" style={{ backgroundColor: color }} />
                    <div className="flex-1 text-xs">
                      {speciesInfo ? (
                        <>
                          <span className="font-bold italic display-block">{speciesInfo.genus} {speciesInfo.species}</span>
                          <span className="text-gray-400 block">{color}</span>
                        </>
                      ) : pendingNameRequests.has(color) ? (
                        <span className="text-gray-400">naming...</span>
                      ) : (
                        <span>{color}</span>
                      )}
                    </div>
                  </div>
                  <span className="font-bold text-base">{count}</span>
                </li>
              )})}
          </ul>
        </TabsContent>
        <TabsContent value="chat" className="flex-1 mt-0 -mx-1 -mb-1">
           <ChatView 
            isPaused={isPaused}
            simulationData={{
              ticks: hudData.tick,
              peakAgentCount: peakAgentCount,
              initialAgentCount: INITIAL_AGENT_COUNT,
              initialFoodPerTile: INITIAL_FOOD_PER_TILE,
              regrowthRate: world?.growthRate ?? regrowthRate,
              simulationHistory: world?.history ?? [],
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
          <Button onClick={handleStep} variant="outline" size="icon" disabled={!isPaused} title="Step Forward">
            <StepForward className="h-4 w-4" />
          </Button>
          <Button onClick={() => resetSimulation(seed, regrowthRate)} variant="outline">
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <div className="flex items-center gap-2 pl-4">
            <Label htmlFor="seed-input" className="text-white font-mono text-sm">Seed</Label>
            <Input
              id="seed-input"
              type="number"
              value={seed}
              onChange={(e) => setSeedValue(Number(e.target.value) || 0)}
              className="w-24 bg-gray-800 border-gray-700"
              disabled={!isPaused}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="regrowth-rate-select" className="text-white font-mono text-sm">Regrowth</Label>
            <Select value={String(regrowthRate)} onValueChange={(v) => setRegrowthRate(Number(v))} disabled={!isPaused}>
              <SelectTrigger id="regrowth-rate-select" className="w-24 bg-gray-800 border-gray-700">
                <SelectValue placeholder="Rate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.05">0.05</SelectItem>
                <SelectItem value="0.10">0.10</SelectItem>
                <SelectItem value="0.15">0.15</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Right-aligned controls */}
        <div className="flex items-center gap-2">
          <Button onClick={handleAnalyze} variant="outline" disabled={!isPaused || hudData.tick === 0}>
              <FileText className="mr-2 h-4 w-4" />
              Analyze
          </Button>
          <Button onClick={handleDownloadLog} variant="outline" size="icon" disabled={!isPaused || hudData.tick === 0} title="Download Main Log">
              <Download className="h-4 w-4" />
          </Button>
           <Button onClick={handleDownloadForageLog} variant="outline" size="icon" disabled={!isPaused || hudData.tick === 0} title="Download Forage Log (CSV)">
              <Database className="h-4 w-4" />
          </Button>
          <Button onClick={handleDownloadSnapshotLog} variant="outline" size="icon" disabled={!isPaused || hudData.tick === 0} title="Download Snapshots (CSV)">
              <Database className="h-4 w-4" />
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
