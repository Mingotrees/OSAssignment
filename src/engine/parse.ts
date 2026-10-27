import type { Raw } from './types';

/** Expected header: pid,arrival,burst[,priority]. Throws Error with a clear message. */
export function parseCSV(text: string): Raw[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error('CSV needs a header row and at least one data row');
  const head = lines[0].toLowerCase().split(',').map((h) => h.trim());
  for (const need of ['pid', 'arrival', 'burst']) if (!head.includes(need)) throw new Error(`CSV header missing column "${need}" (expected pid,arrival,burst,priority)`);
  return lines.slice(1).map((line, n) => {
    const c = line.split(',').map((x) => x.trim());
    if (c.length > head.length) throw new Error(`CSV line ${n + 2} has too many columns`);
    const get = (k: string): string => (head.indexOf(k) >= 0 ? c[head.indexOf(k)] ?? '' : '');
    return { pid: get('pid'), arrival: get('arrival'), burst: get('burst'), priority: get('priority') };
  });
}

export function parseJSON(text: string): Raw[] {
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw new Error('Malformed JSON file'); }
  if (!Array.isArray(data)) throw new Error('JSON must be an array of {pid, arrival, burst, priority}');
  return data.map((d: unknown, n) => {
    if (typeof d !== 'object' || d === null) throw new Error(`JSON item ${n + 1} is not an object`);
    const o = d as Record<string, unknown>;
    const s = (k: string): string => (o[k] === undefined || o[k] === null ? '' : String(o[k]));
    return { pid: s('pid'), arrival: s('arrival'), burst: s('burst'), priority: s('priority') };
  });
}
