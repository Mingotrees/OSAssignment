import type { Options, Process, SimulationResult } from './types';
import { nonPreemptive } from './core';

/** FCFS: earliest arrival first; ties keep entry order (prep() already sorted that way). */
export const fcfs = (ps: Process[], o: Options = {}): SimulationResult =>
  nonPreemptive(ps, (a, b) => a.arrival - b.arrival || a.idx - b.idx, 'first come, first served', o);
