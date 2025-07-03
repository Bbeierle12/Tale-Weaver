export class Histogram {
  private bins: number[];
  private readonly nb: number;
  constructor(nb: number) {
    this.nb = nb;
    this.bins = new Array(nb).fill(0);
  }
  accumulate(values: number[]) {
    if (values.length === 0) return;
    const min = Math.min(...values),
      max = Math.max(...values);
    const w = (max - min + 1e-6) / this.nb;
    values.forEach((v) => {
      const idx = Math.min(this.nb - 1, Math.floor((v - min) / w));
      this.bins[idx]++;
    });
  }
  toCSV(tick: number) {
    return tick + ',' + this.bins.join(',');
  }
  reset() {
    this.bins.fill(0);
  }
}
