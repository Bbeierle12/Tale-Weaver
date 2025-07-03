import type { World } from './world';
import type { Renderer } from './renderer';

/**
 * A deterministic heartbeat that advances the world and renderer.
 *  – Holds all timing state in one place
 *  – Supports pause / resume / single‑step
 */
export class SimController {
  private readonly world: World;
  private readonly renderer: Renderer;
  private animationFrameId: number | null = null;

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
    if (typeof window === 'undefined' || this.animationFrameId) {
      return;
    }
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  /** Stop RAF loop */
  stop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // ————————————————————————————————— private —————————————————————————————————

  private loop = () => {
    if (!this.animationFrameId) return; // a double check to ensure it's stopped

    const shouldUpdate = !this._paused || this._stepOnce;
    if (shouldUpdate) {
      this._stepOnce = false;
      this.world.update(); // dt is no longer needed for per-tick updates
      this.renderer.draw();
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  };
}
