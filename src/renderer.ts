import type { World } from './world';

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
    let dragging = false, lastX = 0, lastY = 0;
    canvas.addEventListener('mousedown', e => { dragging = true; lastX = e.clientX; lastY = e.clientY; });
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

    // draw agents (simple circles)
    ctx.fillStyle = '#fbbf24';                    // amber‑400
    for (const a of world.agents) {
      const sx = a.x * this.zoom - this.camX;
      const sy = a.y * this.zoom - this.camY;
      if (sx < -4 || sx > cw + 4 || sy < -4 || sy > ch + 4) continue; // skip off‑screen
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
