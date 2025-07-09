import type { Agent } from './Agent';
import type { SimConfig, World } from './world';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private config: SimConfig;

  // camera
  private camX = 0;
  private camY = 0;
  private zoom = 4; // pixels per tile
  private dragging = false;

  private wheelHandler: (e: WheelEvent) => void;
  private mousedownHandler: (e: MouseEvent) => void;
  private mouseupHandler: (e: MouseEvent) => void;
  private mousemoveHandler: (e: MouseEvent) => void;

  constructor(
    private canvas: HTMLCanvasElement,
    private world: World,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context failed');
    this.ctx = ctx;
    this.config = world.config;

    this.resize();
    window.addEventListener('resize', this.resize);

    // mouse wheel — zoom
    this.wheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      const prev = this.zoom;
      this.zoom = Math.max(
        2,
        Math.min(16, this.zoom * (e.deltaY < 0 ? 1.1 : 0.9)),
      );
      // zoom to cursor
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const wx = (mx + this.camX) / prev;
      const wy = (my + this.camY) / prev;
      this.camX = wx * this.zoom - mx;
      this.camY = wy * this.zoom - my;
    };
    canvas.addEventListener('wheel', this.wheelHandler);

    // drag – pan
    this.mousedownHandler = () => {
      this.dragging = true;
    };
    this.mouseupHandler = () => {
      this.dragging = false;
    };
    this.mousemoveHandler = (e: MouseEvent) => {
      if (!this.dragging) return;
      this.camX -= e.movementX;
      this.camY -= e.movementY;
    };
    canvas.addEventListener('mousedown', this.mousedownHandler);
    window.addEventListener('mouseup', this.mouseupHandler);
    window.addEventListener('mousemove', this.mousemoveHandler);
  }

  private resize = () => {
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
  };

  draw() {
    const { ctx, world } = this;
    const { width: cw, height: ch } = this.canvas;

    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, cw, ch);

    // clamp camera
    this.camX = Math.max(0, Math.min(world.width * this.zoom - cw, this.camX));
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
        const food = world.food[world.idx(tx, ty)];
        if (food <= 0.01) continue;
        const brightness = food / this.config.foodValue;
        ctx.fillStyle = `rgba(34,197,94,${brightness * 0.75})`;
        ctx.fillRect(
          tx * this.zoom - this.camX,
          ty * this.zoom - this.camY,
          this.zoom,
          this.zoom,
        );
      }
    }

    // draw agents
    for (const a of world.agents) {
      ctx.fillStyle = a.color; // Use agent's individual color
      const sx = a.x * this.zoom - this.camX;
      const sy = a.y * this.zoom - this.camY;
      if (sx < -4 || sx > cw + 4 || sy < -4 || sy > ch + 4) continue; // skip off‑screen
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  dispose(): void {
    window.removeEventListener('resize', this.resize);
    this.canvas.removeEventListener('wheel', this.wheelHandler);
    this.canvas.removeEventListener('mousedown', this.mousedownHandler);
    window.removeEventListener('mouseup', this.mouseupHandler);
    window.removeEventListener('mousemove', this.mousemoveHandler);
  }
}
