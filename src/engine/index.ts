import type { AlgorithmId, Options, Process, SimulationResult } from './types';
import { fcfs } from './fcfs';
import { priorityNP } from './priorityNP';
import { priorityP } from './priorityP';
import { roundRobin } from './roundRobin';
export * from './types';
export { validate, toProcesses } from './validate';
export type { FieldError } from './validate';
export { parseCSV, parseJSON } from './parse';

export const ALGOS: Record<AlgorithmId, string> = { fcfs: 'FCFS', 'priority-np': 'Priority (NP)', 'priority-p': 'Priority (P)', rr: 'Round Robin' };

/** Pure and deterministic: same input -> same output. */
export function simulate(algo: AlgorithmId, ps: Process[], o: Options = {}): SimulationResult {
  switch (algo) {
    case 'fcfs': return fcfs(ps, o);
    case 'priority-np': return priorityNP(ps, o);
    case 'priority-p': return priorityP(ps, o);
    case 'rr': return roundRobin(ps, o);
  }
}
