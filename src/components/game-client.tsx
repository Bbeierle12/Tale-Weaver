'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PawPrint, Play, RotateCw, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Hud, type HudProps } from './hud';
import { SimController } from '@/SimController';
import { World } from '@/world';
import { Renderer } from '@/renderer';

export function SimulationClient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<SimController | null>(null);
  const worldRef = useRef<World | null>(null);
  const [hudData, setHudData] = useState<HudProps['stats']>({
    population: 0,
    avgEnergy: 0,
  });
  const [isPaused, setIsPaused] = useState(true);

  useEffect(() => {
    if (!canvasRef.current) return;

    const world = new World();
    const renderer = new Renderer(canvasRef.current, world);
    const controller = new SimController(world, renderer, setHudData);

    worldRef.current = world;
    controllerRef.current = controller;

    controller.start();
    // Start paused
    if (!controller.paused) {
      controller.togglePause();
    }
    setIsPaused(controller.paused);
    // Initial draw
    renderer.draw();


    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        controllerRef.current?.togglePause();
        setIsPaused(controllerRef.current?.paused ?? true);
      }
      if (e.code === 'KeyN') {
        if(controllerRef.current?.paused) {
            controllerRef.current?.step();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      // Potentially add cleanup to stop the RAF loop if the component unmounts.
    };
  }, []);

  const handleTogglePause = () => {
    controllerRef.current?.togglePause();
    setIsPaused(controllerRef.current?.paused ?? true);
  };

  const handleStep = () => {
    controllerRef.current?.step();
  };

  const handleReset = () => {
    worldRef.current?.reset();
    if (controllerRef.current && !controllerRef.current.paused) {
      controllerRef.current.togglePause();
    }
    setIsPaused(true);
    // Force a redraw on reset
    if (controllerRef.current) {
        (controllerRef.current as any).renderer.draw();
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center bg-gray-900">
      <Hud stats={hudData} />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <Card className="fixed bottom-4 z-10 w-full max-w-sm bg-background/50 border-primary/30 backdrop-blur-sm shadow-2xl shadow-primary/10">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-xl font-bold text-center font-headline text-accent">
            Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 flex flex-col gap-4">
            <p className="text-center text-xs text-muted-foreground">Space = Pause/Resume, N = Step Frame</p>
          <div className="flex gap-4">
            <Button onClick={handleTogglePause} className="w-full">
              {isPaused ? <Play /> : <Square />}
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
            <Button onClick={handleStep} disabled={!isPaused} variant="outline">
                <PawPrint/> Step
            </Button>
            <Button onClick={handleReset} variant="outline">
              <RotateCw />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
