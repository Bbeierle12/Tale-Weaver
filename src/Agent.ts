
/* eslint-disable no-loss-of-precision */
import { randomGenome, mapLinear, mutateGenome } from './utils/genetics'
import type { World } from './world'

const FOOD_ENERGY_VALUE = 10;
const CONSUMPTION_AMOUNT = 0.05; // per second

/**
 * Agent (v0.2) — now with a digital genome.
 * Each instance owns a Float32Array<16> that linearly encodes key traits.
 */
export class Agent {
  x: number
  y: number
  energy = 10
  dir = Math.random() * Math.PI * 2; // facing (rad)
  readonly genome: Float32Array
  private readonly world: World

  constructor (
    x: number,
    y: number,
    genome: Float32Array | undefined,
    world: World
  ) {
    this.x = x
    this.y = y
    this.genome = genome ?? randomGenome()
    this.world = world
  }

  // ---------- GENOTYPE → PHENOTYPE GETTERS ----------

  /** Tiles / sec ∈ [2, 6] */
  get speed (): number {
    return mapLinear(this.genome[0], 2, 6)
  }

  /** Vision radius ∈ [10, 20] tiles */
  get vision (): number {
    return mapLinear(this.genome[1], 10, 20)
  }

  /** Passive metabolic cost (energy / sec) ∈ [0.05, 0.2] */
  get metabolicCost (): number {
    return mapLinear(this.genome[2], 0.05, 0.2)
  }

  /** Energy level required to reproduce ∈ [15, 30] */
  get reproductionThreshold (): number {
    return mapLinear(this.genome[3], 15, 30)
  }

  // ---------- UPDATE LOOP ----------

  update (dt: number): void {
    // 1. Find best food in vision
    let bestX = -1, bestY = -1, bestFood = 0;
    const r = this.vision | 0;
    const searchRadiusSq = r * r;

    for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
            if (dx * dx + dy * dy > searchRadiusSq) continue;
            const tx = (this.x + dx) | 0;
            const ty = (this.y + dy) | 0;
            if (tx < 0 || tx >= this.world.width || ty < 0 || ty >= this.world.height) continue;
            
            const food = this.world.tiles[ty][tx];
            if (food > bestFood) {
                bestFood = food;
                bestX = tx;
                bestY = ty;
            }
        }
    }
    
    // 2. Move
    if (bestFood > 0) {
        this.dir = Math.atan2(bestY - this.y, bestX - this.x);
    } else {
        // random walk if no food found
        this.dir += (Math.random() - 0.5) * 0.5;
    }

    this.x += Math.cos(this.dir) * this.speed * dt;
    this.y += Math.sin(this.dir) * this.speed * dt;
    this.world.clampPosition(this);
    this.energy -= this.speed * 0.01 * dt; // Movement energy cost

    // 3. Consume food
    const tx = this.x | 0;
    const ty = this.y | 0;
    const eaten = this.world.consumeFood(tx, ty, CONSUMPTION_AMOUNT * dt);
    this.energy += eaten * FOOD_ENERGY_VALUE;

    // 4. Metabolic drain
    this.energy -= this.metabolicCost * dt
    if (this.energy <= 0) this.world.kill(this)

    // 5. Reproduction check
    this.reproduce()
  }

  // ---------- ASEXUAL REPRODUCTION ----------

  reproduce (): void {
    if (this.energy < this.reproductionThreshold) return

    // Parent energy cost
    this.energy -= 10

    // Clone & mutate genome
    const childGenome = new Float32Array(this.genome) // copy
    mutateGenome(childGenome, 0.01)

    // Jittered position (±1 tile)
    const jitterX = (Math.random() * 2 - 1)
    const jitterY = (Math.random() * 2 - 1)

    const child = this.world.spawnAgent(
      this.x + jitterX,
      this.y + jitterY,
      childGenome
    )
    child.energy = 10
  }
}
