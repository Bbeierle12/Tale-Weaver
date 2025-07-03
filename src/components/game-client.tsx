'use client';

import { useState, useEffect, useTransition } from 'react';
import { Hud } from '@/components/hud';
import { Narrator } from '@/components/narrator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  generateInitialNarrationAction,
  adaptNarrationAction,
} from '@/app/actions';
import { Wand2, Map } from 'lucide-react';

const locations = [
  {
    name: 'Whispering Woods',
    description:
      'A dense, ancient forest where the trees are said to whisper secrets to those who listen.',
  },
  {
    name: 'Sunken City of Aeridor',
    description:
      'The ruins of a magnificent city, now submerged beneath the waves, rumored to hold powerful artifacts.',
  },
  {
    name: "Dragon's Peak",
    description:
      'A treacherous mountain, home to a fearsome red dragon guarding its hoard.',
  },
  {
    name: 'The Onyx Citadel',
    description:
      'A dark fortress carved from black stone, ruled by a shadowy sorcerer.',
  },
];

const events = [
  {
    name: 'Encounter a mysterious stranger',
    description:
      'You meet a hooded figure who offers a cryptic prophecy.',
  },
  {
    name: 'Discover a hidden treasure',
    description:
      'You stumble upon a chest filled with gold and a glowing gem.',
  },
  {
    name: 'Survive an ambush',
    description: 'Goblins leap from the shadows, but you fight them off bravely.',
  },
  {
    name: 'Solve an ancient riddle',
    description:
      'You decipher a riddle on a stone tablet, revealing a new path.',
  },
];

export function GameClient() {
  const [isPending, startTransition] = useTransition();
  const [gameState, setGameState] = useState({
    score: 0,
    level: 1,
    currentLocation: 'A quiet village tavern',
    recentEvents: ['The adventure begins.'],
    narration: '',
  });

  useEffect(() => {
    startTransition(async () => {
      const initialNarration = await generateInitialNarrationAction({
        locationDescription: gameState.currentLocation,
        events: gameState.recentEvents.join(' '),
        score: gameState.score,
        level: gameState.level,
      });
      setGameState(prev => ({ ...prev, narration: initialNarration }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount

  const handleAction = (
    type: 'location' | 'event',
    item: { name: string; description: string }
  ) => {
    startTransition(async () => {
      const newScore = gameState.score + Math.floor(Math.random() * 50) + 10;
      const newLevel =
        type === 'location' ? gameState.level + 1 : gameState.level;
      const newEvents = [...gameState.recentEvents, item.description].slice(-5); // Keep last 5 events

      const newGameStateForAI = {
        currentLocation:
          type === 'location' ? item.name : gameState.currentLocation,
        recentEvents: newEvents,
        playerScore: newScore,
        currentLevel: newLevel,
      };

      const newNarration = await adaptNarrationAction(newGameStateForAI);

      setGameState({
        score: newScore,
        level: newLevel,
        currentLocation: newGameStateForAI.currentLocation,
        recentEvents: newEvents,
        narration: newNarration,
      });
    });
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <Hud score={gameState.score} level={gameState.level} />

      <main className="flex flex-col items-center justify-center gap-12 w-full flex-grow">
        <div className="w-full max-w-4xl min-h-[120px]">
          <Narrator
            narration={gameState.narration}
            isLoading={isPending}
          />
        </div>

        <Card className="w-full max-w-4xl bg-background/30 border-primary/30 backdrop-blur-sm shadow-2xl shadow-primary/10">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center font-headline text-accent">
              What do you do next?
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-lg mb-3 text-center text-foreground/80">
                  Travel To:
                </h3>
                <div className="flex flex-col gap-3">
                  {locations.map(loc => (
                    <Button
                      key={loc.name}
                      onClick={() => handleAction('location', loc)}
                      disabled={isPending}
                      variant="secondary"
                    >
                      <Map className="mr-2 h-4 w-4" />
                      {loc.name}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-3 text-center text-foreground/80">
                  Trigger Event:
                </h3>
                <div className="flex flex-col gap-3">
                  {events.map(evt => (
                    <Button
                      key={evt.name}
                      onClick={() => handleAction('event', evt)}
                      disabled={isPending}
                      variant="outline"
                      className="border-accent/50 hover:bg-accent/10 hover:text-accent-foreground"
                    >
                      <Wand2 className="mr-2 h-4 w-4" />
                      {evt.name}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
