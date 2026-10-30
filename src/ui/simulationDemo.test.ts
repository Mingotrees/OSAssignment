import { describe, expect, it } from 'vitest';
import { simulate } from '../engine';
import { demoState, stepTime } from './simulationDemo';

describe('step navigation', () => {
  it('moves forwards and backwards at either interval', () => {
    for (const interval of [0.5, 1]) {
      expect(stepTime(2, 1, interval, 5)).toBe(2 + interval);
      expect(stepTime(2, -1, interval, 5)).toBe(2 - interval);
    }
  });
  it('clamps at both ends, including a partial final step after changing interval', () => {
    expect(stepTime(0, -1, 1, 5)).toBe(0);
    expect(stepTime(5, 1, 0.5, 5)).toBe(5);
    expect(stepTime(4.5, 1, 1, 5)).toBe(5);
    expect(stepTime(0.5, -1, 1, 5)).toBe(0);
  });
});

describe('demo state', () => {
  const processes = [{ pid: 'P1', arrival: 0, burst: 3 }, { pid: 'P2', arrival: 1, burst: 2 }];
  const fcfs = simulate('fcfs', processes);
  it('distinguishes running, ready, and not yet arrived', () => {
    expect(demoState(fcfs, 0).processes.map(p => p.status)).toEqual(['Running', 'Not arrived']);
    expect(demoState(fcfs, 1).processes.map(p => p.status)).toEqual(['Running', 'Ready']);
    expect(demoState(fcfs, 0.5).processes.map(p => p.remaining)).toEqual([2.5, 2]);
  });
  it('describes completion boundaries and the final state', () => {
    expect(demoState(fcfs, 3).description).toBe('P1 completed. P2 is running.');
    expect(demoState(fcfs, 5).processes.map(p => p.status)).toEqual(['Completed', 'Completed']);
    expect(demoState(fcfs, 5).description).toBe('All processes have completed.');
  });
  it('rewinds deterministically across preemption', () => {
    const result = simulate('priority-p', processes.map((p, i) => ({ ...p, priority: 2 - i })));
    expect(demoState(result, 1).description).toBe('P1 was preempted. P2 is running.');
    expect(demoState(result, 2).processes.map(p => p.remaining)).toEqual([2, 1]);
    expect(demoState(result, 0.5).processes.map(p => p.remaining)).toEqual([2.5, 2]);
  });
  it('tracks accumulated execution across Round Robin turns', () => {
    const result = simulate('rr', processes, { quantum: 1 });
    expect(demoState(result, 1).description).toBe("P1's quantum expired. P2 is running.");
    expect(demoState(result, 2.5).processes.map(p => p.remaining)).toEqual([1.5, 1]);
  });
  it('represents idle gaps without consuming burst time', () => {
    const result = simulate('fcfs', [{ pid: 'P1', arrival: 2, burst: 1 }, { pid: 'P2', arrival: 5, burst: 1 }]);
    expect(demoState(result, 1).description).toContain('CPU is idle');
    expect(demoState(result, 4).processes.map(p => p.remaining)).toEqual([0, 1]);
    expect(demoState(result, 5).processes.map(p => p.status)).toEqual(['Completed', 'Running']);
  });
});
