import { describe, it, expect } from 'vitest';
import { simulate } from './index';
import type { Process, SimulationResult } from './types';

const segs = (r: SimulationResult): [string, number, number][] => r.segments.map((s) => [s.pid, s.start, s.end]);

describe('FCFS', () => {
  // P1(0,5) P2(1,3) P3(2,8) P4(3,6): P1 0-5, P2 5-8, P3 8-16, P4 16-22
  // Completion 5,8,16,22  TAT 5,7,14,19 (avg 11.25)  WT 0,4,6,13 (avg 5.75)
  const ps: Process[] = [{ pid: 'P1', arrival: 0, burst: 5 }, { pid: 'P2', arrival: 1, burst: 3 }, { pid: 'P3', arrival: 2, burst: 8 }, { pid: 'P4', arrival: 3, burst: 6 }];
  it('textbook dataset', () => {
    const r = simulate('fcfs', ps);
    expect(segs(r)).toEqual([['P1', 0, 5], ['P2', 5, 8], ['P3', 8, 16], ['P4', 16, 22]]);
    expect(r.avgTAT).toBe(11.25); expect(r.avgWT).toBe(5.75); expect(r.contextSwitches).toBe(3);
  });
  it('unsorted input gives the same result', () => {
    expect(simulate('fcfs', [ps[3], ps[1], ps[0], ps[2]]).avgWT).toBe(5.75);
  });
  it('idle gap at start and middle', () => {
    // P1(2,3) P2(10,2): IDLE 0-2, P1 2-5, IDLE 5-10, P2 10-12; util 5/12 = 41.67%
    const r = simulate('fcfs', [{ pid: 'P1', arrival: 2, burst: 3 }, { pid: 'P2', arrival: 10, burst: 2 }]);
    expect(segs(r)).toEqual([['IDLE', 0, 2], ['P1', 2, 5], ['IDLE', 5, 10], ['P2', 10, 12]]);
    expect(r.avgWT).toBe(0); expect(r.cpuUtilization).toBe(41.67); expect(r.contextSwitches).toBe(0);
  });
  it('single process, large burst', () => {
    const r = simulate('fcfs', [{ pid: 'A', arrival: 0, burst: 1000 }]);
    expect(r.avgTAT).toBe(1000); expect(r.avgWT).toBe(0); expect(r.avgRT).toBe(0);
  });
});

describe('Priority', () => {
  // P1(arr0,b4,pr2) P2(1,3,pr1) P3(2,1,pr3), lower number = higher priority
  const ps: Process[] = [{ pid: 'P1', arrival: 0, burst: 4, priority: 2 }, { pid: 'P2', arrival: 1, burst: 3, priority: 1 }, { pid: 'P3', arrival: 2, burst: 1, priority: 3 }];
  it('non-preemptive: P1 0-4, P2 4-7, P3 7-8; TAT 4,6,6 (5.33) WT 0,3,5 (2.67)', () => {
    const r = simulate('priority-np', ps);
    expect(segs(r)).toEqual([['P1', 0, 4], ['P2', 4, 7], ['P3', 7, 8]]);
    expect(r.avgTAT).toBe(5.33); expect(r.avgWT).toBe(2.67);
  });
  it('preemptive: P1 0-1, P2 1-4, P1 4-7, P3 7-8; completion P1=7 P2=4 P3=8; TAT 7,3,6; WT 3,0,5', () => {
    const r = simulate('priority-p', ps);
    expect(segs(r)).toEqual([['P1', 0, 1], ['P2', 1, 4], ['P1', 4, 7], ['P3', 7, 8]]);
    expect(r.segments[0].reason).toBe('arrival-preempt');
    expect(r.results.map((x) => x.waiting)).toEqual([3, 0, 5]);
    expect(r.avgWT).toBe(2.67); expect(r.avgTAT).toBe(5.33);
  });
  it('equal priority does not preempt: P1(0,5,1) P2(1,2,1) -> P1 0-5, P2 5-7', () => {
    const r = simulate('priority-p', [{ pid: 'P1', arrival: 0, burst: 5, priority: 1 }, { pid: 'P2', arrival: 1, burst: 2, priority: 1 }]);
    expect(segs(r)).toEqual([['P1', 0, 5], ['P2', 5, 7]]);
  });
  it('tie on priority and arrival -> entry order', () => {
    const r = simulate('priority-np', [{ pid: 'B', arrival: 0, burst: 1, priority: 1 }, { pid: 'A', arrival: 0, burst: 1, priority: 1 }]);
    expect(segs(r)[0][0]).toBe('B');
  });
  it('flipping convention: higher number wins', () => {
    const r = simulate('priority-np', ps, { lowerIsHigherPriority: false });
    expect(segs(r)).toEqual([['P1', 0, 4], ['P3', 4, 5], ['P2', 5, 8]]);
  });
});

describe('Round Robin', () => {
  it('q=2 on P1(0,5) P2(1,3) P3(2,1): P1 0-2, P2 2-4, P3 4-5, P1 5-7, P2 7-8, P1 8-9; TAT 9,7,3 (6.33) WT 4,4,2 (3.33)', () => {
    const r = simulate('rr', [{ pid: 'P1', arrival: 0, burst: 5 }, { pid: 'P2', arrival: 1, burst: 3 }, { pid: 'P3', arrival: 2, burst: 1 }], { quantum: 2 });
    expect(segs(r)).toEqual([['P1', 0, 2], ['P2', 2, 4], ['P3', 4, 5], ['P1', 5, 7], ['P2', 7, 8], ['P1', 8, 9]]);
    expect(r.avgTAT).toBe(6.33); expect(r.avgWT).toBe(3.33);
  });
  it('arrival/quantum collision: new arrival is queued BEFORE the preempted process', () => {
    // P1(0,4) P2(2,2) q=2: t=2 P2 arrives as P1 expires -> queue [P2,P1]: P1 0-2, P2 2-4, P1 4-6
    const r = simulate('rr', [{ pid: 'P1', arrival: 0, burst: 4 }, { pid: 'P2', arrival: 2, burst: 2 }], { quantum: 2 });
    expect(segs(r)).toEqual([['P1', 0, 2], ['P2', 2, 4], ['P1', 4, 6]]);
  });
  it('quantum larger than all bursts behaves like FCFS', () => {
    const r = simulate('rr', [{ pid: 'A', arrival: 0, burst: 3 }, { pid: 'B', arrival: 0, burst: 2 }], { quantum: 10 });
    expect(segs(r)).toEqual([['A', 0, 3], ['B', 3, 5]]);
  });
  it('quantum=1 single process merges into one segment, 0 switches', () => {
    const r = simulate('rr', [{ pid: 'A', arrival: 0, burst: 3 }], { quantum: 1 });
    expect(segs(r)).toEqual([['A', 0, 3]]); expect(r.contextSwitches).toBe(0);
  });
  it('idle gap with non-zero first arrival', () => {
    const r = simulate('rr', [{ pid: 'A', arrival: 3, burst: 2 }], { quantum: 2 });
    expect(segs(r)).toEqual([['IDLE', 0, 3], ['A', 3, 5]]);
  });
  it('is deterministic', () => {
    const ps: Process[] = [{ pid: 'A', arrival: 0, burst: 7 }, { pid: 'B', arrival: 1, burst: 4 }];
    expect(simulate('rr', ps, { quantum: 3 })).toEqual(simulate('rr', ps, { quantum: 3 }));
  });
});
