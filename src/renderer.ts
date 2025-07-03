import type { World } from './world';

type HudData = {
  populations: { [key: string]: number };
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
    this.setHudData(this.world.getStats());

    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.scale(this.camera.zoom, this.camera.zoom);
    this.ctx.translate(-this.camera.x, -this.camera.y);

    // Draw grass
    const grassMaxEnergy = 10;
    for (let x = 0; x < this.world.grass.length; x++) {
      for (let y = 0; y < this.world.grass[x].length; y++) {
        const energy = this.world.grass[x][y];
        if (energy > 0.1) {
          const brightness = Math.floor((energy / grassMaxEnergy) * 100) + 20;
          this.ctx.fillStyle = `rgb(0, ${brightness}, 0)`;
          this.ctx.fillRect(x, y, 1, 1);
        }
      }
    }

    // Draw agents
    for (const agent of this.world.agents) {
      this.ctx.fillStyle = agent.color;
      this.ctx.beginPath();
      this.ctx.arc(agent.x, agent.y, 0.75, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }
}
