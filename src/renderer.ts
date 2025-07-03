import type { World } from './world';

type HudData = {
  population: number;
  avgEnergy: number;
};
type HudStateSetter = (data: HudData) => void;

export class Renderer {
  private world: World;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private setHudData: HudStateSetter;

  private camera = {
    x: 100,
    y: 100,
    zoom: 4,
  };

  constructor(
    world: World,
    canvas: HTMLCanvasElement,
    setHudData: HudStateSetter
  ) {
    this.world = world;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.setHudData = setHudData;
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  private resize = () => {
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
  };

  public draw() {
    this.setHudData({
        population: this.world.agents.length,
        avgEnergy: this.world.avgEnergy
    });

    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.scale(this.camera.zoom, this.camera.zoom);
    this.ctx.translate(-this.camera.x, -this.camera.y);

    // Draw food tiles
    const maxFood = 1; // Food values are now 0-1
    for (let y = 0; y < this.world.height; y++) {
      for (let x = 0; x < this.world.width; x++) {
        const food = this.world.tiles[y][x];
        if (food > 0.05) { // Lower threshold for visibility
          const brightness = Math.floor((food / maxFood) * 150) + 20;
          this.ctx.fillStyle = `rgb(0, ${brightness}, 20)`;
          this.ctx.fillRect(x, y, 1, 1);
        }
      }
    }

    // Draw agents
    for (const agent of this.world.agents) {
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.beginPath();
      this.ctx.arc(agent.x, agent.y, 0.75, 0, Math.PI * 2);
      this.ctx.fill();

      // Draw direction indicator
      this.ctx.strokeStyle = '#FF0000';
      this.ctx.lineWidth = 0.2;
      this.ctx.beginPath();
      this.ctx.moveTo(agent.x, agent.y);
      this.ctx.lineTo(agent.x + Math.cos(agent.dir), agent.y + Math.sin(agent.dir));
      this.ctx.stroke();
    }

    this.ctx.restore();
  }
}
