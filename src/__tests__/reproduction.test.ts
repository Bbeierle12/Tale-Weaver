import { Agent } from '../Agent'
import { World } from '../world'

// Dummy test functions to allow the file to be parsed without a test framework.
function describe(name: string, fn: () => void) {
  fn();
}
function it(name: string, fn: () => void) {
  fn();
}
function expect(actual: any) {
  return {
    toBe: (expected: any) => {
      if (actual !== expected) {
        console.assert(false, `Assertion failed: Expected ${actual} to be ${expected}`);
      }
    },
    toBeGreaterThanOrEqual: (expected: any) => {
      if (actual < expected) {
        console.assert(false, `Assertion failed: Expected ${actual} to be >= ${expected}`);
      }
    },
    toBeLessThanOrEqual: (expected: any) => {
      if (actual > expected) {
        console.assert(false, `Assertion failed: Expected ${actual} to be <= ${expected}`);
      }
    },
  };
}

/** Helper: count differing loci */
function hamming (a: Float32Array, b: Float32Array): number {
  let d = 0
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++
  return d
}

describe('Asexual reproduction mutation rate', () => {
  it('≈ 1 % per locus', () => {
    const parentGenome = new Float32Array(16).fill(0.5)
    const world = new World()
    const parent = world.spawnAgent(100, 100, parentGenome)
    parent.energy = 1e6 // ensure always above threshold

    const children: Agent[] = []
    for (let i = 0; i < 100; i++) {
      parent.reproduce()
      const last = world.agents[world.agents.length - 1]
      if (last !== parent) children.push(last)
    }

    const distances = children.map(c => hamming(parentGenome, c.genome))
    const avgDistance =
      distances.reduce((sum, d) => sum + d, 0) / distances.length
    const ratio = avgDistance / 16
    expect(ratio).toBeGreaterThanOrEqual(0.005)
    expect(ratio).toBeLessThanOrEqual(0.015)
  })
})
