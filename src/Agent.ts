// ────────────────────────────────────────────────────────────────
// --- src/Agent.ts ----------------------------------------------
// ────────────────────────────────────────────────────────────────
import { SIM_CONFIG } from './config'
import type { World } from './world'

let NEXT_ID = 0

export class Agent {
  readonly id = NEXT_ID++
  x: number
  y: number
  energy: number
  readonly genome: Float32Array
  age = 0                 // ticks lived
  foodConsumed = 0        // aggregate E eaten

  constructor (x: number, y: number, energy = 5, genome?: Float32Array) {
    this.x = x
    this.y = y
    this.energy = energy
    this.genome = genome ? Agent.mutate(genome) : Agent.randomGenome()
  }

  // ───────── genetics
  private static randomGenome (): Float32Array {
    const g = new Float32Array(16)
    for (let i = 0; i < g.length; i++) g[i] = Math.random()
    return g
  }
  private static mutate (src: Float32Array): Float32Array {
    const child = new Float32Array(src)
    for (let i = 0; i < child.length; i++) {
      if (Math.random() < 0.01) child[i] += (Math.random() * 2 - 1) * 0.1
    }
    return child
  }

  // ───────── per‑tick behaviour — returns a new child if birth occurs
  tick (world: World): Agent | null {
    this.age++

    // Basal metabolic drain
    this.energy -= SIM_CONFIG.basalRate
    world.basalDebit += SIM_CONFIG.basalRate

    // Random walk (von Neumann)
    const dir = Math.floor(Math.random() * 4)
    this.move(dir, world)

    // Forage
    const eaten = world.eatAt(this.x, this.y, SIM_CONFIG.biteEnergy)
    if (eaten > 0) {
      this.energy += eaten
      this.foodConsumed += eaten
      world.recordForage(world.tick, this, eaten)
    }

    // Reproduction
    if (this.energy >= SIM_CONFIG.birthThreshold) {
      this.energy -= SIM_CONFIG.birthCost
      return new Agent(this.x, this.y, SIM_CONFIG.birthCost, this.genome)
    }

    // Death test
    if (this.energy < SIM_CONFIG.deathThreshold) {
      world.markDeath()
    }
    return null
  }

  private move (dir: number, world: World): void {
    switch (dir) {
      case 0: this.x = (this.x + 1) % world.width; break
      case 1: this.x = (this.x + world.width - 1) % world.width; break
      case 2: this.y = (this.y + 1) % world.height; break
      case 3: this.y = (this.y + world.height - 1) % world.height; break
    }
    this.energy -= SIM_CONFIG.moveCostPerStep
    world.moveDebit += SIM_CONFIG.moveCostPerStep
  }
}
