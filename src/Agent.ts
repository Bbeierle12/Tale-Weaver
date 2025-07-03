/* eslint-disable no-loss-of-precision */
import { randomGenome, mapLinear, mutateGenome } from './utils/genetics'
import type { World } from './world'

/**
 * Agent (v0.2) — now with a digital genome.
 * Each instance owns a Float32Array<16> that linearly encodes key traits.
 */
export class Agent {
  x: number
  y: number
  energy = 10
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
    // Existing per‑tick movement, collisions, food collection, etc.
    this.randomWalk(dt)

    // Metabolic drain
    this.energy -= this.metabolicCost * dt
    if (this.energy <= 0) this.world.kill(this)

    // Reproduction check
    this.reproduce()
  }

  private randomWalk (dt: number): void {
    // Simplified placeholder – existing logic likely more complex
    const angle = Math.random() * Math.PI * 2
    this.x += Math.cos(angle) * this.speed * dt
    this.y += Math.sin(angle) * this.speed * dt
    this.world.clampPosition(this)
    // Movement energy drain (unchanged)
    this.energy -= this.speed * 0.01 * dt
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
