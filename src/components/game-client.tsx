'use client';

import { Hud } from './hud';
import { SimController } from '@/SimController';
import { World } from '@/world';
import { Renderer } from '@/renderer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Pause, Play, RotateCcw, Square } from 'lucide-react';

export function SimulationClient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<SimController | null>(null);
  const hudIntervalRef = useRef<NodeJS.Timeout>();

  const [world, setWorld] = useState<World | null>(null);
  const [isPaused, setIsPaused] = useState(true);
  const [hudData, setHudData] = useState({
    tick: 0,
    alive: 0,
    dead: 0,
    avgTileFood: 0,
    avgEnergy: 0,
  });

  const resetSimulation = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (hudIntervalRef.current) {
      clearInterval(hudIntervalRef.current);
    }

    const newWorld = new World();
    // Spawn initial agents
    for (let i = 0; i < 300; i++) {
      newWorld.spawnAgent(
        Math.random() * newWorld.width,
        Math.random() * newWorld.height
      );
    }
    setWorld(newWorld);
    // Also reset HUD data immediately
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
    // Start paused
    if (!controller.paused) {
      controller.togglePause();
    }
    setIsPaused(true);
    // Initial draw
    renderer.draw();

    // Interval to update HUD data
    hudIntervalRef.current = setInterval(() => {
      setHudData((prevData) => {
        // Prevent update if world is gone, though it shouldn't be
        if (!newWorld) return prevData;
        return {
          tick: newWorld.tick,
          alive: newWorld.agents.length,
          dead: newWorld.dead,
          avgTileFood: newWorld.avgTileFood,
          avgEnergy: newWorld.avgEnergy,
        };
      });
    }, 400);
  }, []);

  const handleTogglePause = useCallback(() => {
    controllerRef.current?.togglePause();
    setIsPaused((p) => !p);
  }, []);

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
      </div>
    </div>
  );
}