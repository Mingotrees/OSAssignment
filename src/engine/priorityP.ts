import type { Entry, Options, Process, SimulationResult } from './types';
import { Rec, prep, names, pr, byPriority } from './core';
import { finish } from './metrics';

/** Priority preemptive: jump from event to event (arrival or completion), so cost is O(n) events. */
export function priorityP(ps: Process[], o: Options = {}): SimulationResult {
  const low = o.lowerIsHigherPriority ?? true, cmp = byPriority(low);
  const s = prep(ps);
  const r = new Rec(Object.fromEntries(s.map((p) => [p.pid, p.burst])));
  const pool: Entry[] = [];
  let t = 0, i = 0, done = 0, segStart = 0;
  let run: Entry | null = null;
  const admit = (): void => {
    while (i < s.length && s[i].arrival <= t) { pool.push(s[i]); r.note(t, run ? run.pid : null, names(pool), `${s[i].pid} arrives (priority ${s[i].priority})`); i++; }
  };
  while (done < s.length) {
    admit();
    if (!run) {
      if (!pool.length) {
        const next = s[i].arrival;
        r.note(t, 'IDLE', [], `CPU idle from t=${t} to t=${next}`);
        r.seg('IDLE', t, next, 'idle'); t = next; continue;
      }
      pool.sort(cmp); run = pool.shift() as Entry; segStart = t;
      r.note(t, run.pid, names(pool), `${run.pid} dispatched (priority ${run.priority}, ${r.rem[run.pid]} units left)`);
    }
    // Run until the earlier of: completion, next arrival.
    const next = i < s.length ? s[i].arrival : Infinity;
    const end = t + r.rem[run.pid];
    if (end <= next) {
      t = end; r.rem[run.pid] = 0; r.seg(run.pid, segStart, t, 'completed');
      r.note(t, null, names(pool), `${run.pid} completes`); done++; run = null; continue;
    }
    r.rem[run.pid] -= next - t; t = next;
    admit(); pool.sort(cmp);
    // Preempt ONLY if strictly better priority; equal priority never preempts (avoids thrashing).
    if (pool.length && pr(pool[0], low) < pr(run, low)) {
      const old = run;
      r.seg(old.pid, segStart, t, 'arrival-preempt');
      r.note(t, pool[0].pid, names(pool), `${pool[0].pid} (priority ${pool[0].priority}) arrives and preempts ${old.pid} (priority ${old.priority}); ${old.pid} returns to ready pool with ${r.rem[old.pid]} units left`);
      pool.push(old); run = null;
    }
  }
  return finish(s, r);
}
