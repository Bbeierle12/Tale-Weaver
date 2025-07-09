'use client';

import React from 'react';

interface HudProps {
  tick: number;
  alive: number;
  deathsTotal: number;
  avgTileFood: number;
  avgEnergy: number;
}

export const Hud: React.FC<HudProps> = ({
  tick,
  alive,
  deathsTotal,
  avgTileFood,
  avgEnergy,
}) => {
  return (
    <div className="fixed top-0 left-0 right-0 z-10 backdrop-blur bg-gray-900/80 border-b border-gray-700 p-3 text-white font-mono text-sm">
      Tick: <strong>{tick}</strong>, Alive: <strong>{alive}</strong>, Dead:{' '}
      <strong>{deathsTotal}</strong>, Avg Food:{' '}
      <strong className="text-emerald-500">{avgTileFood.toFixed(2)}</strong>,{' '}
      Avg Energy:{' '}
      <strong className="text-sky-500">{avgEnergy.toFixed(2)}</strong>
    </div>
  );
};
