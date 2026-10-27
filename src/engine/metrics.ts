import type { Entry, ProcessResult, SimulationResult, Segment } from './types';
import type { Rec } from './core';

const r2 = (n: number): number => Math.round(n * 100) / 100;

/** Context switch = two directly adjacent segments with different real processes.
 *  Choice: dispatch after an IDLE gap is NOT counted (CPU was empty, nothing was switched out). */
export function countSwitches(segs: Segment[]): number {
  let prev: string | null = null, n = 0;
  for (const s of segs) {
    if (s.pid === 'IDLE') { prev = null; continue; }
    if (prev !== null && prev !== s.pid) n++;
    prev = s.pid;
  }
  return n;
}

export function finish(s: Entry[], r: Rec): SimulationResult {
  const first: Record<string, number> = {}, comp: Record<string, number> = {};
  for (const g of r.segs) {
    if (g.pid === 'IDLE') continue;
    if (first[g.pid] === undefined) first[g.pid] = g.start;
    comp[g.pid] = g.end;
  }
  const results: ProcessResult[] = [...s].sort((a, b) => a.idx - b.idx).map((p) => {
    const turnaround = comp[p.pid] - p.arrival; // TAT = completion - arrival
    return { pid: p.pid, arrival: p.arrival, burst: p.burst, priority: p.priority, completion: comp[p.pid],
      turnaround, waiting: turnaround - p.burst, response: first[p.pid] - p.arrival };
  });
  const n = results.length || 1;
  const avg = (f: (x: ProcessResult) => number): number => r2(results.reduce((a, x) => a + f(x), 0) / n);
  const end = r.segs.length ? r.segs[r.segs.length - 1].end : 0;
  const busy = r.segs.filter((g) => g.pid !== 'IDLE').reduce((a, g) => a + g.end - g.start, 0);
  return { segments: r.segs, snapshots: r.snaps, results, avgTAT: avg((x) => x.turnaround), avgWT: avg((x) => x.waiting),
    avgRT: avg((x) => x.response), cpuUtilization: end ? r2((busy / end) * 100) : 0, throughput: end ? r2(results.length / end) : 0,
    contextSwitches: countSwitches(r.segs), log: r.log };
}
