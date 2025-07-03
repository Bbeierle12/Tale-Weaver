'use client';

import { runSimulationStepAction } from '@/app/actions';
import type { EcosystemState } from '@/ai/schemas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { INITIAL_NARRATION, INITIAL_STATE } from '@/constants';
import { Play, RotateCw, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Hud } from './hud';
import { Narrator } from './narrator';

export function SimulationClient() {
  const [simulationState, setSimulationState] =
    useState<EcosystemState>(INITIAL_STATE);
  const [narration, setNarration] = useState<string>(INITIAL_NARRATION);
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isRunning || isLoading) {
      return;
    }

    const step = async () => {
      setIsLoading(true);
      try {
        const result = await runSimulationStepAction(simulationState);

        if (result && isMounted.current) {
          const nonGrassPopulations = Object.entries(
            result.newState.populations
          ).filter(([species]) => species !== 'Grass');
          const allExtinct = nonGrassPopulations.every(
            ([, count]) => count <= 0
          );

          setSimulationState(result.newState);
          setNarration(result.narration);

          if (allExtinct) {
            setIsRunning(false);
            setNarration(
              currentNarration =>
                currentNarration +
                ' All animal life has perished. The simulation has ended.'
            );
          }
        }
      } catch (error) {
        console.error('Error during simulation step:', error);
        if (isMounted.current) setIsRunning(false); // Stop on error
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    };

    // We use a timer to create a delay between steps, making the simulation watchable.
    const timerId = setTimeout(step, 1500);

    // Cleanup the timer if the component unmounts or dependencies change
    return () => clearTimeout(timerId);
  }, [isRunning, isLoading, simulationState]);

  const handleStart = () => {
    setIsRunning(true);
  };

  const handleEnd = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsLoading(false);
    setSimulationState(INITIAL_STATE);
    setNarration(INITIAL_NARRATION);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <Hud
        day={simulationState.day}
        temperature={simulationState.environment.temperature}
        rainfall={simulationState.environment.rainfall}
      />

      <main className="flex flex-col lg:flex-row items-start justify-center gap-8 w-full flex-grow mt-12 lg:mt-0">
        <div className="w-full lg:w-2/3 max-w-4xl min-h-[120px]">
          <Narrator narration={narration} isLoading={isLoading && isRunning} />
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
                onClick={handleStart}
                disabled={isRunning || isLoading}
                className="w-full"
              >
                <Play />
                Start
              </Button>
              <Button
                onClick={handleEnd}
                disabled={!isRunning || isLoading}
                variant="outline"
                className="w-full"
              >
                <Square />
                End
              </Button>
              <Button
                onClick={handleReset}
                disabled={isLoading}
                variant="outline"
              >
                <RotateCw />
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
