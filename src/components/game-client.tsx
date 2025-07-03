'use client';

import type { EcosystemState } from '@/ai/schemas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { INITIAL_NARRATION, INITIAL_STATE } from '@/constants';
import { Pause, Play, RotateCw, StepForward } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Renderer } from '../renderer';
import { SimController } from '../SimController';
import { World } from '../world';
import { Hud } from './hud';
import { Narrator } from './narrator';

export function SimulationClient() {
  const [simulationState, setSimulationState] =
    useState<EcosystemState>(INITIAL_STATE);
  const [narration, setNarration] = useState<string>(INITIAL_NARRATION);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // State for the simulation instances
  const [controller, setController] = useState<SimController | null>(null);
  const [worldInstance, setWorldInstance] = useState<World | null>(null);

  useEffect(() => {
    setIsClient(true);

    const world = new World();
    const renderer = new Renderer(
      world,
      setSimulationState,
      setNarration,
      setIsLoading
    );
    const simController = new SimController(world, renderer);

    setWorldInstance(world);
    setController(simController);

    simController.start();
  }, []);

  const handleTogglePause = () => {
    if (controller) {
      controller.togglePause();
      setIsPaused(controller.paused);
    }
  };

  const handleStep = () => {
    controller?.step();
  };

  const handleReset = () => {
    if (worldInstance) {
      worldInstance.reset();
      // Force an immediate UI update
      setSimulationState({ ...worldInstance.getState() });
      setNarration(worldInstance.getNarration());
      setIsLoading(false);
      // If it was paused, resume it on reset
      if (controller?.paused) {
        controller.togglePause();
      }
      setIsPaused(false);
    }
  };

  if (!isClient) {
    // Render a static version or skeleton on the server to avoid hydration errors
    return (
      <div className="relative min-h-screen w-full flex flex-col items-center p-4 sm:p-6 lg:p-8">
        <div className="fixed top-4 right-4 z-10 h-16 w-80 rounded-lg bg-black/50 backdrop-blur-sm" />
        <main className="flex flex-col lg:flex-row items-start justify-center gap-8 w-full flex-grow mt-12 lg:mt-0">
          <div className="w-full lg:w-2/3 max-w-4xl min-h-[120px] italic text-center text-foreground/90 text-xl lg:text-2xl">
            <p>"{INITIAL_NARRATION}"</p>
          </div>
          <div className="w-full lg:w-1/3 max-w-md h-96 bg-background/30 rounded-lg" />
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <Hud
        day={simulationState.day}
        temperature={simulationState.environment.temperature}
        rainfall={simulationState.environment.rainfall}
      />

      <main className="flex flex-col lg:flex-row items-start justify-center gap-8 w-full flex-grow mt-12 lg:mt-0">
        <div className="w-full lg:w-2/3 max-w-4xl min-h-[120px]">
          <Narrator narration={narration} isLoading={isLoading} />
        </div>

        <Card className="w-full lg:w-1/3 max-w-md bg-background/30 border-primary/30 backdrop-blur-sm shadow-2xl shadow-primary/10">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center font-headline text-accent">
              Simulation Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0 flex flex-col gap-4">
            <div className="flex gap-4">
              <Button
                onClick={handleTogglePause}
                disabled={!controller}
                className="w-full"
              >
                {isPaused ? (
                  <Play className="mr-2 h-4 w-4" />
                ) : (
                  <Pause className="mr-2 h-4 w-4" />
                )}
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
              <Button
                onClick={handleStep}
                disabled={!isPaused || isLoading}
                variant="outline"
              >
                <StepForward className="h-4 w-4" />
              </Button>
              <Button
                onClick={handleReset}
                disabled={isLoading}
                variant="outline"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2 text-center text-foreground/80">
                Populations
              </h3>
              <div className="flex flex-col gap-2 text-center">
                {Object.entries(simulationState.populations).map(
                  ([species, count]) => (
                    <div
                      key={species}
                      className="p-2 bg-secondary/50 rounded-md"
                    >
                      <span className="font-bold">{species}:</span> {count}
                    </div>
                  )
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mt-4 mb-2 text-center text-foreground/80">
                Event Log
              </h3>
              <ScrollArea className="h-48 w-full rounded-md border border-border p-3 bg-secondary/50">
                <div className="flex flex-col gap-2">
                  {simulationState.log
                    .slice()
                    .reverse()
                    .map((event, index) => (
                      <p key={index} className="text-sm text-muted-foreground">
                        {event}
                      </p>
                    ))}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
