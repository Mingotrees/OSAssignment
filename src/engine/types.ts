export type AlgorithmId = 'fcfs' | 'priority-np' | 'priority-p' | 'rr';
export interface Process { pid: string; arrival: number; burst: number; priority?: number }
export type Reason = 'completed' | 'preempted' | 'quantum-expired' | 'idle' | 'arrival-preempt';
export interface Segment { pid: string | 'IDLE'; start: number; end: number; reason: Reason }
export interface Snapshot { time: number; running: string | 'IDLE' | null; readyQueue: string[]; remaining: Record<string, number>; event: string }
export interface ProcessResult { pid: string; arrival: number; burst: number; priority?: number; completion: number; turnaround: number; waiting: number; response: number }
export interface SimulationResult {
  segments: Segment[]; snapshots: Snapshot[]; results: ProcessResult[];
  avgTAT: number; avgWT: number; avgRT: number; cpuUtilization: number; throughput: number; contextSwitches: number; log: string[];
}
export interface Options { quantum?: number; lowerIsHigherPriority?: boolean; contextSwitchTime?: number }
/** Process plus its original entry index (used as the final tie-break). */
export interface Entry extends Process { idx: number }
/** Raw string row as typed in the UI table / parsed from files. */
export interface Raw { pid: string; arrival: string; burst: string; priority: string }
