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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const newWorld = new World();
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

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="relative h-screen w-full bg-gray-900">
      {world && <Hud world={world} />}
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
