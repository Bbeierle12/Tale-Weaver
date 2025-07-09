import fs from 'fs';

interface Row {
  tick: number;
  lineageId: number;
  members: number;
  meanSpeed: number;
  meanVision: number;
  meanBasal: number;
  meanEnergy: number;
  births: number;
  deaths: number;
}

const fileArg = process.argv.find((a) => a.startsWith('--input'));
if (!fileArg) {
  console.error('Usage: tsx benchmarks/lineageReport.ts --input lineage.csv');
  process.exit(1);
}
const path = fileArg.split('=')[1];
const lines = fs.readFileSync(path, 'utf8').trim().split(/\n+/);
lines.shift();
const data: Row[] = lines.map((l) => {
  const [t, id, m, s, v, b, e, br, dr] = l.split(',').map(Number);
  return {
    tick: t,
    lineageId: id,
    members: m,
    meanSpeed: s,
    meanVision: v,
    meanBasal: b,
    meanEnergy: e,
    births: br,
    deaths: dr,
  };
});
const fitness = new Map<number, number>();
const founders = new Map<number, Row>();
for (const r of data) {
  fitness.set(r.lineageId, (fitness.get(r.lineageId) || 0) + r.members);
  if (!founders.has(r.lineageId)) founders.set(r.lineageId, r);
}
const ranked = Array.from(fitness.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);
for (const [id, fit] of ranked) {
  const first = founders.get(id)!;
  const last = data.filter((d) => d.lineageId === id).slice(-1)[0];
  const dSpeed = (last.meanSpeed - first.meanSpeed).toFixed(3);
  const dVision = (last.meanVision - first.meanVision).toFixed(3);
  const dBasal = (last.meanBasal - first.meanBasal).toFixed(3);
  console.log(
    `#${id}\tfitness=${fit}\tΔspeed=${dSpeed}\tΔvision=${dVision}\tΔbasal=${dBasal}`,
  );
}
