import type { Entry, Process, Reason, Segment, SimulationResult, Snapshot, Options } from './types';
import { finish } from './metrics';

/** Stable order: arrival time, then entry order (so simultaneous arrivals keep input order). */
export const prep = (ps: Process[]): Entry[] =>
  ps.map((p, idx) => ({ ...p, idx })).sort((a, b) => a.arrival - b.arrival || a.idx - b.idx);

export const names = (q: Entry[]): string[] => q.map((p) => p.pid);

/** Rank value: smaller = more urgent, whichever convention is selected. */
export const pr = (p: Entry, lowerIsHigher: boolean): number => (p.priority ?? 0) * (lowerIsHigher ? 1 : -1);

/** Priority, then earlier arrival, then entry order. */
export const byPriority = (low: boolean) => (a: Entry, b: Entry): number =>
  pr(a, low) - pr(b, low) || a.arrival - b.arrival || a.idx - b.idx;

/** Collects segments, snapshots and the human-readable log (one line per decision). */
export class Rec {
  segs: Segment[] = [];
  snaps: Snapshot[] = [];
  log: string[] = [];
  rem: Record<string, number>;
  constructor(rem: Record<string, number>) { this.rem = rem; }
  note(t: number, running: string | null, queue: string[], event: string): void {
    this.snaps.push({ time: t, running, readyQueue: [...queue], remaining: { ...this.rem }, event });
    this.log.push(`t=${t}: ${event}`);
  }
  seg(pid: string, start: number, end: number, reason: Reason): void {
    if (end > start) this.segs.push({ pid, start, end, reason });
  }
}

/** Shared engine for FCFS and Priority-NP: only the comparator differs. */
export function nonPreemptive(ps: Process[], cmp: (a: Entry, b: Entry) => number, why: string, _o: Options): SimulationResult {
  const s = prep(ps);
  const r = new Rec(Object.fromEntries(s.map((p) => [p.pid, p.burst])));
  const ready: Entry[] = [];
  let t = 0, i = 0, done = 0;
  while (done < s.length) {
    // Everything that has arrived by t joins the pool (arrival <= t, so ties at t are included).
    while (i < s.length && s[i].arrival <= t) { ready.push(s[i]); r.note(t, null, names(ready), `${s[i].pid} arrives`); i++; }
    if (!ready.length) {
      // No ready process: CPU idles until the next arrival (i < length is guaranteed since done < n).
      const next = s[i].arrival;
      r.note(t, 'IDLE', [], `CPU idle from t=${t} to t=${next}`);
      r.seg('IDLE', t, next, 'idle'); t = next; continue;
    }
    // Pick by comparator; the chosen process is never interrupted (non-preemptive).
    ready.sort(cmp);
    const p = ready.shift() as Entry;
    r.note(t, p.pid, names(ready), `${p.pid} dispatched (${why}); runs ${p.burst} units to completion`);
    r.seg(p.pid, t, t + p.burst, 'completed');
    t += p.burst; r.rem[p.pid] = 0; done++;
    r.note(t, null, names(ready), `${p.pid} completes`);
  }
  return finish(s, r);
}
