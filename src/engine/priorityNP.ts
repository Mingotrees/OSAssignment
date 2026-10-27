import type { Options, Process, SimulationResult } from './types';
import { nonPreemptive, byPriority } from './core';

/** Priority NP: when CPU is free pick best priority; tie -> earlier arrival -> entry order. */
export const priorityNP = (ps: Process[], o: Options = {}): SimulationResult =>
  nonPreemptive(ps, byPriority(o.lowerIsHigherPriority ?? true), 'highest priority among ready', o);
