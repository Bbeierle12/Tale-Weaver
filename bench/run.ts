// ────────────────────────────────────────────────────────────────
// --- bench/run.ts ----------------------------------------------
// Headless 500‑tick demo that writes ≤ 200 kB gzipped logs
// ────────────────────────────────────────────────────────────────
import { Agent } from '../src/Agent'
import { World } from '../src/world'
import { rng, setSeed } from '../src/utils/random'
import { saveLogs } from './save'

async function main (): Promise<void> {
  setSeed(1) // for deterministic runs
  const world = new World()

  // Seed population
  for (let i = 0; i < 25; i++) {
    world.agents.push(new Agent(Math.floor(rng() * world.width),
                                Math.floor(rng() * world.height)))
  }

  // Simulate 500 ticks
  for (let t = 0; t < 500; t++) world.step()

  await saveLogs(world)

  const last = world.series[world.series.length - 1].split(',')
  const [moveDebit, basalDebit] = [Number(last[6]), Number(last[7])]
  if (moveDebit <= basalDebit) {
    throw new Error('Acceptance check failed: moveDebit must exceed basalDebit')
  }
  console.log('✓ EcoSysX v0.3 run complete — logs written')
}

main().catch(err => { console.error(err); process.exit(1) })
