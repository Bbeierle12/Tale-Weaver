'use client';

import { useState, useTransition, useEffect } from 'react';
import { Hud } from '@/components/hud';
import { Narrator } from '@/components/narrator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { EcosystemState } from '@/ai/schemas';
import { Play, RotateCw } from 'lucide-react';
import { SimController, INITIAL_NARRATION } from '@/SimController';

export function SimulationClient() {
  const [isPending, startTransition] = useTransition();
  // Use state to hold the controller instance to persist it across renders.
  const [controller] = useState(() => new SimController());
  
  // Sync React state with the controller's state.
  const [simulationState, setSimulationState] =
    useState<EcosystemState>(controller.getState());
  const [narration, setNarration] = useState<string>(controller.getNarration());
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleNextDay = () => {
    startTransition(async () => {
      await controller.nextDay();
      // Create a new object to ensure React detects the state change.
      setSimulationState({ ...controller.getState() });
      setNarration(controller.getNarration());
    });
  };

  const handleReset = () => {
    controller.reset();
    // Create a new object to ensure React detects the state change.
    setSimulationState({ ...controller.getState() });
    setNarration(controller.getNarration());
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
          <Narrator narration={narration} isLoading={isPending} />
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
                onClick={handleNextDay}
                disabled={isPending}
                className="w-full"
              >
                <Play className="mr-2 h-4 w-4" />
                {isPending ? 'Simulating...' : 'Next Day'}
              </Button>
              <Button
                onClick={handleReset}
                disabled={isPending}
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
