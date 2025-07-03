import { Card } from './ui/card';
import { Users, Zap } from 'lucide-react';

type HudProps = {
  stats: {
    population: number;
    avgEnergy: number;
  };
};

export function Hud({ stats }: HudProps) {
  const { population = 0, avgEnergy = 0 } = stats;
  return (
    <Card className="fixed top-4 left-4 z-10 flex items-stretch divide-x divide-border/50 rounded-lg bg-black/50 p-3 text-white backdrop-blur-sm border-primary/50 shadow-lg">
      <div className="flex items-center gap-2 px-4 transition-all duration-300 hover:scale-105">
        <Users className="h-6 w-6 text-gray-200" />
        <div className="flex flex-col items-start">
          <span className="text-xs text-muted-foreground">AGENTS</span>
          <span className="text-lg font-bold font-headline">{String(population)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 px-4 transition-all duration-300 hover:scale-105">
        <Zap className="h-6 w-6 text-yellow-400" />
        <div className="flex flex-col items-start">
          <span className="text-xs text-muted-foreground">AVG ENERGY</span>
          <span className="text-lg font-bold font-headline">{avgEnergy.toFixed(1)}</span>
        </div>
      </div>
    </Card>
  );
}
