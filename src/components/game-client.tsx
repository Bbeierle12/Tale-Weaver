'use client';

import { Hud } from './hud';
import { SimController } from '@/SimController';
import { World } from '@/world';
import { Renderer } from '@/renderer';
import { useEffect, useRef, useState } from 'react';

export function SimulationClient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<SimController | null>(null);
  const [world, setWorld] = useState<World | null>(null);
  // State for the HUD, updated periodically
  const [hudData, setHudData] = useState({
    tick: 0,
    alive: 0,
    dead: 0,
    avgTileFood: 0,
    avgEnergy: 0,
  });


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const newWorld = new World();
    // Spawn initial agents
    for (let i = 0; i < 300; i++) {
      newWorld.spawnAgent(
        Math.random() * newWorld.width,
        Math.random() * newWorld.height
      );
    }
    setWorld(newWorld);

    const renderer = new Renderer(canvas, newWorld);
    const controller = new SimController(newWorld, renderer);
    controllerRef.current = controller;

    controller.start();
    // Start paused
    if (!controller.paused) {
      controller.togglePause();
    }
    // Initial draw
    renderer.draw();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        controllerRef.current?.togglePause();
      }
      if (e.code === 'KeyN') {
        if (controllerRef.current?.paused) {
          controllerRef.current?.step();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Interval to update HUD data
    const hudInterval = setInterval(() => {
      setHudData({
        tick: newWorld.tick,
        alive: newWorld.agents.length,
        dead: newWorld.dead,
        avgTileFood: newWorld.avgTileFood,
        avgEnergy: newWorld.avgEnergy,
      });
    }, 400);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearInterval(hudInterval);
    };
  }, []);

  return (
    <div className="relative h-screen w-full bg-gray-900">
      {world && <Hud {...hudData} />}
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
