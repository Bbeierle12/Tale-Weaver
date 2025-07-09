/**
 * Implements Welford's online algorithm for computing running statistics.
 * This allows for stable, single-pass calculation of mean, variance,
 * and standard deviation without storing all data points.
 */
export class RunningStats {
  private n = 0;
  private mean = 0;
  private M2 = 0; // sum of squares of differences from the mean
  private _min = +Infinity;
  private _max = -Infinity;

  reset() {
    this.n = 0;
    this.mean = 0;
    this.M2 = 0;
    this._min = +Infinity;
    this._max = -Infinity;
  }

  /** Add a new value to the running statistics. */
  push(x: number) {
    this.n++;
    const delta = x - this.mean;
    this.mean += delta / this.n;
    this.M2 += delta * (x - this.mean);
    if (x < this._min) this._min = x;
    if (x > this._max) this._max = x;
  }

  /** The number of data points. */
  get count() {
    return this.n;
  }

  /** The running mean. */
  get avg() {
    return this.mean;
  }

  /** The running sample standard deviation. */
  get sd() {
    return this.n > 1 ? Math.sqrt(this.M2 / (this.n - 1)) : 0;
  }

  /** The minimum value seen so far. Returns 0 if no data has been pushed. */
  get min() {
    return this.n > 0 ? this._min : 0;
  }

  /** The maximum value seen so far. Returns 0 if no data has been pushed. */
  get max() {
    return this.n > 0 ? this._max : 0;
  }
}

/**
 * Calculates the Gini coefficient for a set of values (a measure of inequality).
 * The array is sorted internally.
 * @param values An array of numbers.
 * @returns The Gini coefficient, a value between 0 (perfect equality) and 1.
 */
export function calculateGini(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = values.slice().sort((a, b) => a - b);
  const n = sorted.length;
  let cum = 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += sorted[i];
    cum += sum;
  }

  // If the total sum is 0, all values must be 0, implying perfect equality.
  if (sum === 0) {
    return 0;
  }

  return (n + 1 - (2 * cum) / sum) / n;
}
