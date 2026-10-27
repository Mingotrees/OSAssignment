import type { Entry, Options, Process, SimulationResult } from './types';
import { Rec, prep } from './core';
import { finish } from './metrics';

/** Round Robin with FIFO queue. Convention: arrivals at the instant a quantum expires are enqueued BEFORE the preempted process. */
export function roundRobin(ps: Process[], o: Options = {}): SimulationResult {
  const q = o.quantum ?? 1;
  if (!(q > 0)) throw new Error('Quantum must be > 0');
  const s = prep(ps);
  const byPid = new Map(s.map((p) => [p.pid, p]));
  const r = new Rec(Object.fromEntries(s.map((p) => [p.pid, p.burst])));
  const queue: string[] = [];
  let t = 0, i = 0, done = 0, carry: number | null = null;
  const admit = (): void => {
    while (i < s.length && s[i].arrival <= t) { queue.push(s[i].pid); r.note(t, null, queue, `${s[i].pid} arrives and joins the ready queue`); i++; }
  };
  admit();
  while (done < s.length) {
    if (!queue.length) {
      const next = s[i].arrival;
      r.note(t, 'IDLE', [], `CPU idle from t=${t} to t=${next}`);
      r.seg('IDLE', t, next, 'idle'); t = next; admit(); continue;
    }
    const pid = queue.shift() as string;
    const p = byPid.get(pid) as Entry;
    const slice = Math.min(q, r.rem[pid]);
    const start: number = carry ?? t;
    if (carry === null) r.note(t, pid, queue, `${pid} dispatched for ${slice} units (${r.rem[pid]} left, quantum ${q})`);
    t += slice; r.rem[pid] -= slice;
    admit(); // new arrivals (incl. exactly at t) go in BEFORE the preempted process
    if (r.rem[pid] === 0) {
      r.seg(pid, start, t, 'completed'); carry = null; done++; r.note(t, null, queue, `${pid} completes`);
    } else if (queue.length === 0) {
      // Alone in the system: keep running, no context switch, no segment break (merge).
      queue.unshift(pid); carry = start; r.note(t, pid, queue, `${pid} quantum expired but queue empty; continues without a switch`);
    } else {
      r.seg(pid, start, t, 'quantum-expired'); carry = null; queue.push(pid);
      r.note(t, null, queue, `${p.pid} quantum expired; moved to back of queue with ${r.rem[pid]} units left`);
    }
  }
  return finish(s, r);
}
