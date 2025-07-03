'use client';

import { Hud } from './hud';
import { SimController } from '@/SimController';
import { World } from '@/world';
import { Renderer } from '@/renderer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Pause, Play, RotateCcw, Square, Bot, Download } from 'lucide-react';
import { AnalysisDialog } from './analysis-dialog';
import { analyzeSimulationAction, generateSpeciesNameAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { rng, setSeed } from '@/utils/random';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
    dead: 0,
    avgTileFood: 0,
    avgEnergy: 0,
  });

  const [isAnalysisDialogOpen, setIsAnalysisDialogOpen] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [peakAgentCount, setPeakAgentCount] = useState(0);
  const [seed, setSeedValue] = useState(1);
  const [colorCounts, setColorCounts] = useState(new Map<string, number>());
  const [speciesNames, setSpeciesNames] = useState<Map<string, SpeciesName>>(new Map());
  const [pendingNameRequests, setPendingNameRequests] = useState<Set<string>>(new Set());


  const resetSimulation = useCallback((seedToUse: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (hudIntervalRef.current) {
      clearInterval(hudIntervalRef.current);
    }
    
    setSeed(seedToUse);
    setSeedValue(seedToUse);

    const newWorld = new World();
    for (let i = 0; i < INITIAL_AGENT_COUNT; i++) {
      newWorld.spawnAgent(
        rng() * newWorld.width,
        rng() * newWorld.height
      );
    }
    setWorld(newWorld);
    setPeakAgentCount(INITIAL_AGENT_COUNT);
    setAnalysisResult(null);
    setIsAnalyzing(false);
    setIsAnalysisDialogOpen(false);
    setColorCounts(new Map());
    setSpeciesNames(new Map());
    setPendingNameRequests(new Set());
    
    setHudData({
      tick: newWorld.tick,
      alive: newWorld.agents.length,
      dead: newWorld.dead,
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
      setHudData({
        tick: newWorld.tick,
        alive: newWorld.agents.length,
        dead: newWorld.dead,
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
  }, []);

  const handleTogglePause = useCallback(() => {
    controllerRef.current?.togglePause();
    setIsPaused((p) => !p);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!world) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setIsAnalysisDialogOpen(true);

    try {
      const result = await analyzeSimulationAction({
        ticks: world.tick,
        peakAgentCount: peakAgentCount,
        initialAgentCount: INITIAL_AGENT_COUNT,
        initialFoodPerTile: INITIAL_FOOD_PER_TILE,
        simulationHistory: world.history,
      });
      setAnalysisResult(result.analysis);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: message,
      });
      setIsAnalysisDialogOpen(false);
    } finally {
      setIsAnalyzing(false);
    }
  }, [world, peakAgentCount, toast]);

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

  useEffect(() => {
    // On mount, reset with a random seed to avoid hydration errors
    // and provide a different simulation on each load.
    resetSimulation(Date.now() % 1_000_000);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePause();
      }
      if (e.code === 'KeyN') {
        if (controllerRef.current?.paused) {
          controllerRef.current?.step();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (hudIntervalRef.current) {
        clearInterval(hudIntervalRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSimulation, handleTogglePause]);

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
      {world && <Hud {...hudData} />}

      <div className="absolute top-16 right-4 bg-gray-900/80 backdrop-blur-sm border border-gray-700 p-3 rounded-lg max-h-[calc(100vh-10rem)] w-64 overflow-y-auto font-mono text-sm text-white z-10">
        <h3 className="font-bold mb-2 text-base">Species on Board</h3>
        {colorCounts.size === 0 && <p className="text-xs text-gray-400">No agents yet.</p>}
        <ul className="space-y-2">
          {Array.from(colorCounts.entries())
            .sort(([, a], [, b]) => b - a)
            .map(([color, count]) => {
              const speciesInfo = speciesNames.get(color);
              return (
              <li key={color} className="flex items-start justify-between gap-3">
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
      </div>

      <canvas ref={canvasRef} className="h-full w-full" />
      <div className="absolute bottom-4 left-4 flex items-center gap-2">
        <Button onClick={handleTogglePause} className="w-28">
          {isPaused ? (
            <Play className="mr-2 h-4 w-4" />
          ) : (
            <Pause className="mr-2 h-4 w-4" />
          )}
          {isPaused ? (hudData.tick === 0 ? 'Start' : 'Resume') : 'Pause'}
        </Button>
        <Button onClick={() => resetSimulation(seed)} variant="outline">
          <Square className="mr-2 h-4 w-4" />
          Stop
        </Button>
        <Button onClick={() => resetSimulation(seed)} variant="outline">
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </Button>
        <Button onClick={handleAnalyze} variant="outline" disabled={!isPaused || isAnalyzing}>
          <Bot className="mr-2 h-4 w-4" />
          {isAnalyzing ? 'Analyzing...' : 'Analyze'}
        </Button>
        <Button onClick={handleDownloadLog} variant="outline" disabled={!isPaused || hudData.tick === 0}>
            <Download className="mr-2 h-4 w-4" />
            Download Log
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
      </div>
      <AnalysisDialog
        open={isAnalysisDialogOpen}
        onOpenChange={setIsAnalysisDialogOpen}
        analysis={analysisResult}
        isLoading={isAnalyzing}
      />
    </div>
  );
}
