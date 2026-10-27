import type { Process, Raw } from './types';

export interface FieldError { row: number; field: 'pid' | 'arrival' | 'burst' | 'priority' | 'quantum' | 'table'; message: string }
export const MAX_PROCESSES = 50;

/** Returns an error message or null. Integers only (documented choice). */
function num(s: string, min: number, minMsg: string): string | null {
  if (s.trim() === '') return 'Required';
  if (!/^-?\d+(\.\d+)?$/.test(s.trim())) return 'Must be a number';
  const n = Number(s);
  if (!Number.isInteger(n)) return 'Must be a whole number';
  if (n < min) return minMsg;
  return null;
}

export function validate(rows: Raw[], needPriority: boolean, quantum: string | null): FieldError[] {
  const e: FieldError[] = [];
  if (rows.length === 0) e.push({ row: -1, field: 'table', message: 'Add at least one process' });
  if (rows.length > MAX_PROCESSES) e.push({ row: -1, field: 'table', message: `Maximum ${MAX_PROCESSES} processes` });
  const seen = new Set<string>();
  rows.forEach((r, row) => {
    const pid = r.pid.trim();
    if (!pid) e.push({ row, field: 'pid', message: 'Required' });
    else if (seen.has(pid)) e.push({ row, field: 'pid', message: 'Duplicate PID' });
    seen.add(pid);
    const a = num(r.arrival, 0, 'Must be ≥ 0'); if (a) e.push({ row, field: 'arrival', message: a });
    const b = num(r.burst, 1, 'Must be > 0'); if (b) e.push({ row, field: 'burst', message: b });
    if (needPriority) { const p = num(r.priority, -1e9, ''); if (p) e.push({ row, field: 'priority', message: p === 'Required' ? 'Priority missing' : p }); }
  });
  if (quantum !== null) { const q = num(quantum, 1, 'Quantum must be > 0'); if (q) e.push({ row: -1, field: 'quantum', message: q }); }
  return e;
}

/** Call only after validate() returned no errors. Blank priority -> 0 when priorities are not required. */
export const toProcesses = (rows: Raw[]): Process[] =>
  rows.map((r) => ({ pid: r.pid.trim(), arrival: Number(r.arrival), burst: Number(r.burst), priority: r.priority.trim() === '' ? 0 : Number(r.priority) }));
