import { SimulationClient } from '@/components/game-client';

export default function Home() {
  return (
    <div className="bg-background text-foreground font-body">
      <header className="text-center py-8 px-4">
        <h1 className="text-5xl md:text-6xl font-bold font-headline tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
          Ecosystem Simulator
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">An AI-powered simulation of a living world</p>
      </header>
      <SimulationClient />
    </div>
  );
}
