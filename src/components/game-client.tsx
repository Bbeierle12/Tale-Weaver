'use client';

import { Hud } from './hud';
import { SimController } from '@/SimController';
import { World } from '@/world';
import { Renderer } from '@/renderer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Pause, Play, RotateCcw, Square, Bot } from 'lucide-react';
import { AnalysisDialog } from './analysis-dialog';
import { analyzeSimulationAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

const INITIAL_AGENT_COUNT = 300;
const INITIAL_FOOD_PER_TILE = 0.5; // Must match default in world.ts

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

  const resetSimulation = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (hudIntervalRef.current) {
      clearInterval(hudIntervalRef.current);
    }

    const newWorld = new World();
    for (let i = 0; i < INITIAL_AGENT_COUNT; i++) {
      newWorld.spawnAgent(
        Math.random() * newWorld.width,
        Math.random() * newWorld.height
      );
    }
    setWorld(newWorld);
    setPeakAgentCount(INITIAL_AGENT_COUNT);
    setAnalysisResult(null);
    setIsAnalyzing(false);
    setIsAnalysisDialogOpen(false);
    
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

  useEffect(() => {
    resetSimulation();

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
  }, [resetSimulation, handleTogglePause]);

  return (
    <div className="relative h-screen w-full bg-gray-900">
      {world && <Hud {...hudData} />}
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
        <Button onClick={resetSimulation} variant="outline">
          <Square className="mr-2 h-4 w-4" />
          Stop
        </Button>
        <Button onClick={resetSimulation} variant="outline">
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </Button>
        <Button onClick={handleAnalyze} variant="outline" disabled={!isPaused || isAnalyzing}>
          <Bot className="mr-2 h-4 w-4" />
          {isAnalyzing ? 'Analyzing...' : 'Analyze'}
        </Button>
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
