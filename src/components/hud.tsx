'use client';

import type { World } from '@/world';
import React, { useEffect, useState } from 'react';

export function Hud({ world }: { world: World }) {
  // State for all the values we want to display
  const [tick, setTick] = useState(world.tick);
  const [alive, setAlive] = useState(world.agents.length);
  const [dead, setDead] = useState(world.dead);
  const [avgSpeed, setAvgSpeed] = useState(0);
  const [avgVision, setAvgVision] = useState(0);
  const [avgFood, setAvgFood] = useState(0);
  const [avgEnergy, setAvgEnergy] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      // Update state from the world object, which triggers a re-render
      setTick(world.tick);
      const currentAlive = world.agents.length;
      setAlive(currentAlive);
      setDead(world.dead);
      setAvgFood(world.avgTileFood);
      setAvgEnergy(world.avgEnergy);

      if (currentAlive > 0) {
        let speedSum = 0;
        let visionSum = 0;
        for (const a of world.agents) {
          speedSum += a.speed;
          visionSum += a.vision;
        }
        setAvgSpeed(speedSum / currentAlive);
        setAvgVision(visionSum / currentAlive);
      } else {
        setAvgSpeed(0);
        setAvgVision(0);
      }
    }, 400); // Update display about twice per second

    return () => clearInterval(id);
  }, [world]);

  return (
    <div className="fixed top-0 left-0 right-0 z-10 backdrop-blur bg-gray-900/80 border-b border-gray-700 p-3 text-white">
      <h1 className="text-lg font-semibold">EcosysX • Agent v0.2</h1>
      <div className="font-mono text-sm flex flex-wrap gap-x-4 gap-y-1">
        <span>Tick: <span className="text-emerald-400">{tick}</span></span>
        <span>Alive: <span className="text-amber-300">{alive}</span></span>
        <span>Dead: <span className="text-rose-400">{dead}</span></span>
        <span>Avg Food: <span className="text-lime-400">{avgFood.toFixed(3)}</span></span>
        <span>Avg Energy: <span className="text-cyan-400">{avgEnergy.toFixed(1)}</span></span>
        <span>Avg Speed: <span className="text-sky-300">{avgSpeed.toFixed(2)}</span></span>
        <span>Avg Vision: <span className="text-sky-300">{avgVision.toFixed(1)}</span></span>
      </div>
       <p className="text-xs text-gray-400 mt-1">
        Wheel zoom · drag pan · Space pause · N step
      </p>
    </div>
  );
}
