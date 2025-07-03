import type { World } from './world';
import type { Renderer } from './renderer';

/**
 * A deterministic heartbeat that advances the world and renderer.
 *  – Holds all timing state in one place
 *  – Supports pause / resume / single‑step
 */
export class SimController {
  private last = 0;
  private readonly world: World;
  private readonly renderer: Renderer;

  private _paused = false;
  private _stepOnce = false;

  /** public getter so HUD / tests can read */
  get paused() {
    return this._paused;
  }

  constructor(world: World, renderer: Renderer) {
    this.world = world;
    this.renderer = renderer;
  }

  /** Toggle pause state */
  togglePause(): void {
    this._paused = !this._paused;
  }

  /** Advance exactly one tick when paused */
  step(): void {
    if (!this._paused) return;
    this._stepOnce = true;
  }

  /** Kick‑off RAF loop */
  start(): void {
    if (typeof window === 'undefined') {
      return;
    }
    this.last = performance.now();
    requestAnimationFrame(this.loop);
  }

  // ————————————————————————————————— private —————————————————————————————————

  private loop = (now: number) => {
    const dt = (now - this.last) / 1000;
    this.last = now;

    const shouldUpdate = !this._paused || this._stepOnce;
    if (shouldUpdate) {
      this._stepOnce = false;
      this.world.update(dt);
      this.renderer.draw();
    }

    requestAnimationFrame(this.loop);
  };
}
