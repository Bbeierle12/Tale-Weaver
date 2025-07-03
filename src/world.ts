import { Agent } from './Agent';

export class World {
  public readonly width = 200;
  public readonly height = 200;
  /** Live agents */
  public agents: Agent[] = [];
  /** Dead counter for HUD */
  public dead = 0;
  public tick = 0;

  constructor() {
    // World starts empty, agents are spawned by the simulation controller.
  }

  public spawnAgent(
    x: number,
    y: number,
    genome?: Float32Array
  ): Agent {
    const agent = new Agent(x, y, genome, this);
    this.agents.push(agent);
    return agent;
  }

  // Called by Agent.randomWalk to keep agents in‑bounds
  public clampPosition(a: Agent): void {
    a.x = Math.max(0, Math.min(this.width - 1, a.x));
    a.y = Math.max(0, Math.min(this.height - 1, a.y));
  }

  public kill(a: Agent): void {
    const idx = this.agents.indexOf(a);
    if (idx >= 0) {
      this.agents.splice(idx, 1);
      this.dead++;
    }
  }

  public update(dt: number): void {
    this.tick++;
    // Iterate over a copy as agents can be added/removed during the loop.
    const agentsToUpdate = [...this.agents];
    for (const a of agentsToUpdate) {
        if (this.agents.includes(a)) { // Check if agent is still alive
            a.update(dt);
        }
    }
  }
}
