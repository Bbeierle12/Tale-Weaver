
export type RNG = () => number;

let seed = 1;          // default seed; user can override via setSeed()
export function setSeed(s: number) { seed = s >>> 0; }

export const rng: RNG = function mulberry32(): number {
  seed |= 0;                        // force uint32
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
