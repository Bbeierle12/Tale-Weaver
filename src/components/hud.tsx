'use client';

import type { World } from '@/world';
import { useEffect, useState } from 'react';

export function Hud({ world }: { world: World }) {
  const [tick, setTick] = useState(world.tick);
  const [alive, setAlive] = useState(world.alive);
  const [dead, setDead] = useState(world.deadTotal);

  useEffect(() => {
    const id = setInterval(() => {
      setTick(world.tick);
      setAlive(world.alive);
      setDead(world.deadTotal);
    }, 400);
    return () => clearInterval(id);
  }, [world]);

  return (
    <div className="fixed top-0 left-0 right-0 z-10 backdrop-blur bg-gray-900/80 border-b border-gray-700 p-3 text-white">
      <h1 className="text-lg font-semibold">EcosysX • Agent v0.1</h1>
      <p className="font-mono text-sm">
        Tick <span className="text-emerald-400">{tick}</span> |  Alive 
        <span className="text-amber-300">{alive}</span> |  Dead 
        <span className="text-rose-400">{dead}</span>
      </p>
      <p className="text-xs text-gray-400">
        Wheel zoom · drag pan · Space pause · N step
      </p>
    </div>
  );
}
