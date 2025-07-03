import { Card } from './ui/card';
import { PawPrint, Rabbit, Leaf } from 'lucide-react';

type HudProps = {
  stats: {
    populations: {
      [key: string]: number;
    };
  };
};

export function Hud({ stats }: HudProps) {
  const { Fox = 0, Rabbit = 0, Grass = 0 } = stats.populations;
  return (
    <Card className="fixed top-4 left-4 z-10 flex items-stretch divide-x divide-border/50 rounded-lg bg-black/50 p-3 text-white backdrop-blur-sm border-primary/50 shadow-lg">
      <div className="flex items-center gap-2 px-4 transition-all duration-300 hover:scale-105">
        <Leaf className="h-6 w-6 text-green-400" />
        <div className="flex flex-col items-start">
          <span className="text-xs text-muted-foreground">GRASS</span>
          <span className="text-lg font-bold font-headline">{String(Grass)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 px-4 transition-all duration-300 hover:scale-105">
        <Rabbit className="h-6 w-6 text-gray-200" />
        <div className="flex flex-col items-start">
          <span className="text-xs text-muted-foreground">RABBITS</span>
          <span className="text-lg font-bold font-headline">{String(Rabbit)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 pl-4 transition-all duration-300 hover:scale-105">
        <PawPrint className="h-6 w-6 text-orange-400" />
        <div className="flex flex-col items-start">
          <span className="text-xs text-muted-foreground">FOXES</span>
          <span className="text-lg font-bold font-headline">{String(Fox)}</span>
        </div>
      </div>
    </Card>
  );
}
