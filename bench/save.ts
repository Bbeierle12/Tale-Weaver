// ────────────────────────────────────────────────────────────────
// --- bench/save.ts ---------------------------------------------
// gzip helper for all log artefacts
// ────────────────────────────────────────────────────────────────
import { promises as fs } from 'fs'
import { gzip } from 'zlib'
import { promisify } from 'util'
import type { World } from '../src/World'

const gz = promisify(gzip)

export async function saveLogs (w: World): Promise<void> {
  await Promise.all([
    dump('timeseries.csv.gz', w.series.join('\n')),
    dump('hist.csv.gz',       w.histRows.join('\n')),
    dump('snapshots.csv.gz',  w.snapshots.join('\n')),
    dump('forage.csv.gz',     forageArray(w).join('\n'))
  ])
}

async function dump (name: string, data: string): Promise<void> {
  const buf = await gz(Buffer.from(data, 'utf-8'))
  await fs.writeFile(name, buf)
}

function forageArray (w: World): string[] {
  const rows: string[] = ['tick,id,x,y,foodE']
  for (let i = 0; i < w.forageLog.length; i++) {
    const r = w.forageLog[i]
    if (r) rows.push(`${r.tick},${r.id},${r.x},${r.y},${r.e.toFixed(2)}`)
  }
  return rows
}
