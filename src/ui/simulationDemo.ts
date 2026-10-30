import type { SimulationResult } from '../engine';

export function stepTime(time: number, direction: number, interval: number, end: number) {
  return Math.max(0, Math.min(end, time + direction * interval));
}

export function demoState(result: SimulationResult, time: number) {
  const active = result.segments.find(s => s.start <= time && time < s.end);
  const processes = result.results.map(p => {
    const executed = result.segments.filter(s => s.pid === p.pid)
      .reduce((sum, s) => sum + Math.max(0, Math.min(time, s.end) - s.start), 0);
    const remaining = Math.max(0, p.burst - executed);
    const status = p.arrival > time ? 'Not arrived' : remaining === 0 ? 'Completed' : active?.pid === p.pid ? 'Running' : 'Ready';
    return { ...p, remaining, status };
  });
  const boundary = result.segments.find(s => s.end === time);
  const event = boundary?.reason === 'completed' ? `${boundary.pid} completed. `
    : boundary?.reason === 'quantum-expired' ? `${boundary.pid}'s quantum expired. `
    : boundary?.reason === 'arrival-preempt' || boundary?.reason === 'preempted' ? `${boundary.pid} was preempted. ` : '';
  const description = processes.every(p => p.remaining === 0) ? 'All processes have completed.'
    : `${event}${active && active.reason !== 'idle' ? `${active.pid} is running.` : 'CPU is idle; waiting for the next arrival.'}`;
  return { processes, description };
}
