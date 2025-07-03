import { Agent } from './Agent';

const WORLD_WIDTH = 200;
const WORLD_HEIGHT = 200;
const INITIAL_RABBITS = 50;
const INITIAL_FOXES = 5;
const GRASS_REGROWTH_RATE = 0.2;
const GRASS_MAX_ENERGY = 10;
const ENERGY_PER_GRASS = 4;
const ENERGY_PER_RABBIT = 20;
const ENERGY_LOSS_PER_TICK = 0.1;

export class World {
  public tick = 0;
  public agents: Agent[] = [];
  public grass: number[][]; // Grid of grass energy

  constructor() {
    this.grass = [];
    this.reset();
  }

  private spawnAgent(type: 'rabbit' | 'fox', parent?: Agent) {
      const x = parent ? parent.x : Math.random() * WORLD_WIDTH;
      const y = parent ? parent.y : Math.random() * WORLD_HEIGHT;
      const energy = parent ? parent.energy / 2 : 10;
      if (parent) parent.energy /= 2;

      this.agents.push(new Agent(type, x, y, energy));
  }


  public getStats() {
    const populations = { Rabbit: 0, Fox: 0, Grass: 0 };
    let totalGrassEnergy = 0;

    for (const agent of this.agents) {
      if (agent.type === 'rabbit') populations.Rabbit++;
      if (agent.type === 'fox') populations.Fox++;
    }

    for (let x = 0; x < WORLD_WIDTH; x++) {
      for (let y = 0; y < WORLD_HEIGHT; y++) {
        totalGrassEnergy += this.grass[x][y];
      }
    }
    populations.Grass = Math.floor(totalGrassEnergy / GRASS_MAX_ENERGY);

    return { populations };
  }

  public update(dt: number) {
    this.tick++;
    const speedFactor = 20;

    // Grass regrowth
    for (let x = 0; x < WORLD_WIDTH; x++) {
      for (let y = 0; y < WORLD_HEIGHT; y++) {
        if (this.grass[x][y] < GRASS_MAX_ENERGY) {
          this.grass[x][y] += GRASS_REGROWTH_RATE;
        }
      }
    }

    const agentsToRemove = new Set<Agent>();
    const agentsToAdd: Agent[] = [];

    // Agent updates
    for (const agent of this.agents) {
      if (agentsToRemove.has(agent)) continue;

      agent.energy -= ENERGY_LOSS_PER_TICK;

      let moved = false;

      if (agent.type === 'rabbit') {
        const tileX = Math.floor(agent.x);
        const tileY = Math.floor(agent.y);
        if (this.grass[tileX]?.[tileY] > 1) {
          this.grass[tileX][tileY] -= 1;
          agent.energy += ENERGY_PER_GRASS;
        }
      }

      if (agent.type === 'fox') {
        let nearestRabbit: Agent | null = null;
        let minDistance = agent.vision;

        for (const other of this.agents) {
          if (other.type === 'rabbit' && !agentsToRemove.has(other)) {
            const dx = other.x - agent.x;
            const dy = other.y - agent.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < minDistance) {
              minDistance = distance;
              nearestRabbit = other;
            }
          }
        }

        if (nearestRabbit) {
          const dx = nearestRabbit.x - agent.x;
          const dy = nearestRabbit.y - agent.y;
          const angle = Math.atan2(dy, dx);
          agent.x += Math.cos(angle) * agent.speed * speedFactor * dt;
          agent.y += Math.sin(angle) * agent.speed * speedFactor * dt;
          moved = true;

          if (minDistance < 1.5) {
            agent.energy += ENERGY_PER_RABBIT;
            agentsToRemove.add(nearestRabbit);
          }
        }
      }

      // Random walk if no other movement occurred
      if (!moved) {
        agent.x += (Math.random() - 0.5) * agent.speed * speedFactor * dt;
        agent.y += (Math.random() - 0.5) * agent.speed * speedFactor * dt;
      }

      // Clamp position
      agent.x = Math.max(0, Math.min(WORLD_WIDTH - 1, agent.x));
      agent.y = Math.max(0, Math.min(WORLD_HEIGHT - 1, agent.y));

      // Reproduction
      if (agent.energy > agent.energyToReproduce) {
        agent.energy /= 2;
        const newAgent = new Agent(agent.type, agent.x, agent.y, agent.energy);
        agentsToAdd.push(newAgent);
      }

      // Death
      if (agent.energy <= 0) {
        agentsToRemove.add(agent);
      }
    }

    if (agentsToRemove.size > 0) {
      this.agents = this.agents.filter(a => !agentsToRemove.has(a));
    }
    if (agentsToAdd.length > 0) {
      this.agents.push(...agentsToAdd);
    }
  }

  public reset() {
    this.tick = 0;
    this.agents = [];
    this.grass = Array(WORLD_WIDTH)
      .fill(0)
      .map(() => Array(WORLD_HEIGHT).fill(GRASS_MAX_ENERGY));

    for (let i = 0; i < INITIAL_RABBITS; i++) {
      this.spawnAgent('rabbit');
    }
    for (let i = 0; i < INITIAL_FOXES; i++) {
      this.spawnAgent('fox');
    }
  }
}
