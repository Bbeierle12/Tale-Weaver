import { Agent } from './Agent';

const INITIAL_AGENTS = 50;

export class World {
  public readonly width = 200;
  public readonly height = 200;
  public tiles: number[][] = [];
  public agents: Agent[] = [];
  public tick = 0;

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.tick = 0;
    this.tiles = Array(this.height).fill(0).map(() => Array(this.width).fill(0));
    // Add some random food patches
    for (let i = 0; i < 30; i++) {
        this.addFoodPatch(
            Math.random() * this.width,
            Math.random() * this.height,
            Math.random() * 20 + 10, // radius
        );
    }

    this.agents = [];
    for (let i = 0; i < INITIAL_AGENTS; i++) {
      this.spawnAgent(Math.random() * this.width, Math.random() * this.height);
    }
  }

  private addFoodPatch(x: number, y: number, radius: number) {
      for(let i = -radius; i <= radius; i++) {
          for(let j = -radius; j <= radius; j++) {
              if (i*i + j*j < radius*radius) {
                  const tx = Math.round(x+i);
                  const ty = Math.round(y+j);
                  if (this.inBounds(tx, ty)) {
                      this.tiles[ty][tx] = Math.min(10, this.tiles[ty][tx] + Math.random() * 2);
                  }
              }
          }
      }
  }

  public inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  public consumeFood(x: number, y: number, amount: number): number {
    if (!this.inBounds(x, y)) return 0;
    const available = this.tiles[y][x];
    const consumed = Math.min(available, amount);
    this.tiles[y][x] -= consumed;
    return consumed;
  }

  public spawnAgent(x: number, y: number): void {
    this.agents.push(new Agent(this, x, y));
  }

  public update(dt: number): void {
    this.tick++;

    // Food regrowth
    for(let y=0; y<this.height; y++) {
        for(let x=0; x<this.width; x++) {
            if(this.tiles[y][x] < 10) {
                this.tiles[y][x] += dt * 0.1;
            }
        }
    }

    for (const agent of this.agents) {
      agent.update(dt);
    }

    this.agents = this.agents.filter(a => !a.dead);
  }

  public getStats() {
    const totalFood = this.tiles.flat().reduce((sum, tile) => sum + tile, 0);
    return {
      population: this.agents.length,
      food: Math.floor(totalFood),
    };
  }
}
