/**
 * Genetics helpers for EcoSysX v0.1
 * ---------------------------------
 * • Fixed‐length genome utilities
 * • Linear genotype → phenotype mapping
 * • Point‑mutation helper
 */

export const GENOME_LENGTH = 16

/** Generate a random genome (Float32Array length = 16, 0 … 1) */
export function randomGenome (): Float32Array {
  const g = new Float32Array(GENOME_LENGTH)
  for (let i = 0; i < GENOME_LENGTH; i++) g[i] = Math.random()
  return g
}

/** Immutable linear mapping. */
export function mapLinear (
  gene: number,
  min: number,
  max: number
): number {
  return min + gene * (max - min)
}

/** Mutate genome in‑place with independent probability _p_ per locus. */
export function mutateGenome (
  genome: Float32Array,
  p = 0.01
): void {
  for (let i = 0; i < genome.length; i++) {
    if (Math.random() < p) genome[i] = Math.random()
  }
}
