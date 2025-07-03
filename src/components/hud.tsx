import { Clock, Thermometer, CloudRain } from 'lucide-react';
import { Card } from './ui/card';

type HudProps = {
  day: number;
  temperature: number;
  rainfall: number;
};

export function Hud({ day, temperature, rainfall }: HudProps) {
  return (
    <Card className="fixed top-4 right-4 z-10 flex items-stretch divide-x divide-border/50 rounded-lg bg-black/50 p-3 text-white backdrop-blur-sm border-primary/50 shadow-lg">
      <div className="flex items-center gap-2 pr-4 transition-all duration-300 hover:scale-105">
        <Clock className="h-6 w-6 text-accent" />
        <div className="flex flex-col items-start">
            <span className="text-xs text-muted-foreground">DAY</span>
            <span className="text-lg font-bold font-headline">{day}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 px-4 transition-all duration-300 hover:scale-105">
        <Thermometer className="h-6 w-6 text-accent" />
         <div className="flex flex-col items-start">
            <span className="text-xs text-muted-foreground">TEMP</span>
            <span className="text-lg font-bold font-headline">{temperature}°C</span>
        </div>
      </div>
      <div className="flex items-center gap-2 pl-4 transition-all duration-300 hover:scale-105">
        <CloudRain className="h-6 w-6 text-accent" />
         <div className="flex flex-col items-start">
            <span className="text-xs text-muted-foreground">RAIN</span>
            <span className="text-lg font-bold font-headline">{rainfall}mm</span>
        </div>
      </div>
    </Card>
  );
}
