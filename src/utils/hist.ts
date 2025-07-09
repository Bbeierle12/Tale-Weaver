// ────────────────────────────────────────────────────────────────
// --- src/utils/hist.ts -----------------------------------------
// Lightweight fixed‑width histogram helper
// ────────────────────────────────────────────────────────────────
export class Hist {
  private readonly bins: Uint32Array;
  private readonly binW: number;
  constructor(
    binCount: number,
    private readonly min = 0,
    private readonly max = 40,
  ) {
    this.bins = new Uint32Array(binCount);
    this.binW = (max - min) / binCount;
  }
  reset(): void {
    this.bins.fill(0);
  }
  add(v: number): void {
    const idx = Math.min(
      this.bins.length - 1,
      Math.max(0, Math.floor((v - this.min) / this.binW)),
    );
    this.bins[idx]++;
  }
  toArray(): number[] {
    return Array.from(this.bins, (n) => Number(n));
  }
}
