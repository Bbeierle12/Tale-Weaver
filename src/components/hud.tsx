import { Gem, Trophy } from 'lucide-react';
import { Card } from './ui/card';

type HudProps = {
  score: number;
  level: number;
};

export function Hud({ score, level }: HudProps) {
  return (
    <Card className="fixed top-4 right-4 z-10 flex items-center gap-6 rounded-lg bg-black/50 p-3 text-white backdrop-blur-sm border-primary/50 shadow-lg">
      <div className="flex items-center gap-2 transition-all duration-300 hover:scale-105">
        <Gem className="h-6 w-6 text-accent" />
        <div className="flex flex-col items-start">
            <span className="text-xs text-muted-foreground">SCORE</span>
            <span className="text-lg font-bold font-headline">{score}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 transition-all duration-300 hover:scale-105">
        <Trophy className="h-6 w-6 text-accent" />
         <div className="flex flex-col items-start">
            <span className="text-xs text-muted-foreground">LEVEL</span>
            <span className="text-lg font-bold font-headline">{level}</span>
        </div>
      </div>
    </Card>
  );
}
