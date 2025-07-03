import type { Agent } from './Agent';
import type { World } from './world';

// Map speed [2,6] → RGB blue→red
const speedToColor = (s: number): string => {
  const t = (s - 2) / 4;
  const r = Math.round(255 * t);
  const b = Math.round(255 * (1 - t));
  return `rgb(${r},0,${b})`;
};

export class Renderer {
  private ctx: CanvasRenderingContext2D;

  // camera
  private camX = 0;
  private camY = 0;
  private zoom  = 4;      // pixels per tile

  constructor(
    private canvas: HTMLCanvasElement,
    private world: World
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context failed');
    this.ctx = ctx;

    this.resize();
    window.addEventListener('resize', this.resize);

    // mouse wheel — zoom
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const prev = this.zoom;
      this.zoom = Math.max(2, Math.min(16, this.zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
      // zoom to cursor
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left);
      const my = (e.clientY - rect.top);
      const wx = (mx + this.camX) / prev;
      const wy = (my + this.camY) / prev;
      this.camX = wx * this.zoom - mx;
      this.camY = wy * this.zoom - my;
    });

    // drag – pan
    let dragging = false;
    canvas.addEventListener('mousedown', () => { dragging = true; });
    window.addEventListener('mouseup',   () => dragging = false);
    window.addEventListener('mousemove', e => {
      if (!dragging) return;
      this.camX -= e.movementX;
      this.camY -= e.movementY;
    });
  }

  private resize = () => {
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
  };

  draw() {
    const { ctx, world } = this;
    const { width: cw, height: ch } = this.canvas;

    ctx.fillStyle = '#1f2937'; ctx.fillRect(0, 0, cw, ch);

    // clamp camera
    this.camX = Math.max(0, Math.min(world.width  * this.zoom - cw, this.camX));
    this.camY = Math.max(0, Math.min(world.height * this.zoom - ch, this.camY));

    // determine visible tiles
    const x0 = (this.camX / this.zoom) | 0;
    const y0 = (this.camY / this.zoom) | 0;
    const cols = Math.ceil(cw / this.zoom) + 1;
    const rows = Math.ceil(ch / this.zoom) + 1;

    // draw terrain (food density)
    for (let y = 0; y < rows; y++) {
      const ty = y0 + y;
      if (ty >= world.height) break;
      for (let x = 0; x < cols; x++) {
        const tx = x0 + x;
        if (tx >= world.width) break;
        const food = world.tiles[ty][tx];
        if (food <= 0.01) continue;
        ctx.fillStyle = `rgba(34,197,94,${food * 0.75})`;
        ctx.fillRect(
          (tx * this.zoom) - this.camX,
          (ty * this.zoom) - this.camY,
          this.zoom, this.zoom
        );
      }
    }

    // draw agents (colored by speed)
    for (const a of world.agents) {
      ctx.fillStyle = speedToColor(a.speed);
      const sx = a.x * this.zoom - this.camX;
      const sy = a.y * this.zoom - this.camY;
      if (sx < -4 || sx > cw + 4 || sy < -4 || sy > ch + 4) continue; // skip off‑screen
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
