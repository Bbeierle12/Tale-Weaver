/**
 * Implements Welford's online algorithm for computing running statistics.
 * This allows for stable, single-pass calculation of mean, variance,
 * and standard deviation without storing all data points.
 */
export class RunningStats {
  private n = 0;
  private mean = 0;
  private M2 = 0;     // sum of squares of differences from the mean
  private _min = +Infinity;
  private _max = -Infinity;

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
  get count() { return this.n; }
  
  /** The running mean. */
  get avg()   { return this.mean; }
  
  /** The running sample standard deviation. */
  get sd()    { return this.n > 1 ? Math.sqrt(this.M2 / (this.n - 1)) : 0; }

  /** The minimum value seen so far. */
  get min()   { return this._min; }

  /** The maximum value seen so far. */
  get max()   { return this._max; }
}
