'use client';

import type { World } from '@/world';
import { useEffect, useState } from 'react';

export function Hud({ world }: { world: World }) {
  const [tick, setTick] = useState(world.tick);
  const [pop, setPop] = useState(world.agents.length);
  const [eAvg, setEAvg] = useState(world.avgEnergy.toFixed(1));

  useEffect(() => {
    const id = setInterval(() => {
      setTick(world.tick);
      setPop(world.agents.length);
      setEAvg(world.avgEnergy.toFixed(1));
    }, 400);
    return () => clearInterval(id);
  }, [world]);

  return (
    <div className="fixed top-0 left-0 right-0 z-10 backdrop-blur bg-gray-900/80 border-b border-gray-700 p-3 text-white">
      <h1 className="text-lg font-semibold">EcosysX • 2‑D Map Preview</h1>
      <p className="font-mono text-sm">
        Tick <span className="text-emerald-400">{tick}</span> |  Pop 
        <span className="text-amber-300">{pop}</span> |  ⌀E 
        <span className="text-sky-300">{eAvg}</span>
      </p>
      <p className="text-xs text-gray-400">
        Wheel → zoom, drag → pan, Space → pause, N → step
      </p>
    </div>
  );
}
