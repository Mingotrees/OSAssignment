import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import type { SimulationResult } from '../engine';
import { demoState, stepTime } from './simulationDemo';
import { timelineTransition } from './motion';

interface Props {
  result: SimulationResult;
  color: (pid: string) => string;
  selected: string | null;
  onSelect: (pid: string) => void;
}

export default function SimulationTimeline({ result, color, selected, onSelect }: Props) {
  const [mode, setMode] = useState<'step' | 'full'>('step');
  const [time, setTime] = useState(0);
  const [interval, setInterval] = useState(1);
  const [page, setPage] = useState(0);
  const [replay, setReplay] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const end = result.segments[result.segments.length - 1]?.end ?? 0;
  const isStep = mode === 'step';
  const state = demoState(result, time);
  // Bound the rendered grid for imported schedules with very large times.
  const pageSpan = interval * 100;
  const start = (isStep ? Math.floor(Math.max(0, time === end ? time - interval : time) / pageSpan) : page) * pageSpan;
  const finish = Math.min(end, start + pageSpan);
  const columns = Math.max(1, Math.ceil((finish - start) / interval));
  const duration = columns * interval;
  const shownTime = isStep ? time : end;
  const chartRows = [...state.processes.map(p => ({ pid: p.pid, status: isStep ? p.status : `${p.burst} units`, remaining: p.remaining })),
    ...(result.segments.some(s => s.reason === 'idle') ? [{ pid: 'IDLE', status: isStep && result.segments.some(s => s.reason === 'idle' && s.start <= time && time < s.end) ? 'Idle' : 'CPU idle', remaining: 0 }] : [])];

  useEffect(() => {
    if (!isStep) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
        !(event.target instanceof HTMLElement) || event.target.closest('input, select, textarea, [contenteditable]:not([contenteditable="false"]), [role="slider"], [role="tablist"]')) return;
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      setTime(current => stepTime(current, event.key === 'ArrowRight' ? 1 : -1, interval, end));
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isStep, interval, end]);

  useEffect(() => {
    if (isStep && scrollRef.current) {
      scrollRef.current.scrollLeft = Math.max(0, 126 + (time - start) / interval * 44 - scrollRef.current.clientWidth * 0.65);
    }
  }, [time, start, interval, isStep]);

  return <section className="panel timeline-panel" aria-labelledby="timeline-title">
    <div className="panel-heading"><div><h2 id="timeline-title">Execution timeline</h2><p>Processes on rows. Time across columns.</p></div><button className="replay-button" onClick={() => { setTime(0); setPage(0); setReplay(r => r + 1); }}>{isStep ? 'Restart demo' : 'Replay'}</button></div>
    <div className="demo-toolbar">
      <div className="simulation-modes" role="group" aria-label="Simulation mode">
        <button aria-pressed={isStep} onClick={() => setMode('step')}>Step-by-step</button>
        <button aria-pressed={!isStep} onClick={() => setMode('full')}>Full schedule</button>
      </div>
      <label className="interval-control">Time interval <select aria-label="Time interval" value={interval} onChange={event => { setInterval(Number(event.target.value)); setPage(0); }}><option value="0.5">0.5 units</option><option value="1">1 unit</option></select></label>
    </div>
    {isStep && <div className="demo-controls">
      <div className="step-buttons"><button aria-label="Previous step" aria-keyshortcuts="ArrowLeft" disabled={time === 0} onClick={() => setTime(t => stepTime(t, -1, interval, end))}><Arrow backwards/> Previous</button><button aria-label="Next step" aria-keyshortcuts="ArrowRight" disabled={time === end} onClick={() => setTime(t => stepTime(t, 1, interval, end))}>Next <Arrow/></button></div>
      <span className="demo-clock">t = <strong>{time}</strong> / {end}</span>
      <p className="demo-key-hint">Use Left / Right arrow keys to step</p>
    </div>}
    <div className="demo-summary" role="status" aria-live="polite"><strong>{isStep ? `Time ${time}` : 'Complete schedule'}</strong><span>{isStep ? state.description : `${result.results.length} processes across ${end} time units. Select a bar to inspect a process.`}</span></div>
    {end > pageSpan && <div className="chart-pages"><span>Showing {start} to {finish} units</span>{!isStep && <><button disabled={page === 0} onClick={() => setPage(p => p - 1)}>Earlier times</button><button disabled={finish >= end} onClick={() => setPage(p => p + 1)}>Later times</button></>}</div>}
    <div ref={scrollRef} className="gantt-scroll" tabIndex={0} role="region" aria-label="Process Gantt chart, horizontally scrollable">
      <div className="gantt-chart" style={{ '--gantt-width': `${columns * 44}px`, '--gantt-cell': `${100 / columns}%` } as CSSProperties}>
        <div className="gantt-header"><span className="gantt-label">Process / time</span><div className="gantt-axis">{Array.from({ length: columns + 1 }, (_, i) => <span key={i} style={{ left: `${i / columns * 100}%` }}>{start + i * interval}</span>)}</div></div>
        <div className="gantt-body" key={`${mode}:${replay}`}>
          {chartRows.map(row => <div className={`gantt-row${row.status === 'Running' ? ' is-running' : ''}`} key={row.pid}>
            <div className="gantt-label"><strong title={row.pid}>{row.pid}</strong><small>{row.status}{isStep && row.pid !== 'IDLE' && row.status !== 'Not arrived' ? ` / ${row.remaining} left` : ''}</small></div>
            <div className="gantt-lane">
              {result.segments.filter(s => s.pid === row.pid && s.start < finish && s.end > start && s.start < shownTime).map((s, i) => {
                const left = Math.max(start, s.start);
                const right = Math.min(finish, s.end, shownTime);
                const reason = right < s.end ? (s.reason === 'idle' ? 'idle' : 'running') : s.reason;
                return <m.button key={`${s.start}:${i}`} className={`gantt-bar${s.reason === 'idle' ? ' idle-segment' : ''}${selected === s.pid ? ' selected-segment' : ''}`}
                  style={{ left: `${(left - start) / duration * 100}%`, width: `${(right - left) / duration * 100}%`, backgroundColor: s.reason === 'idle' ? undefined : color(s.pid) }}
                  initial={isStep || reducedMotion ? false : { scaleX: 0 }} animate={{ scaleX: 1 }}
                  transition={isStep ? { duration: 0 } : timelineTransition(s.start, s.end, end, !!reducedMotion)}
                  aria-label={`${s.pid}: ${left} to ${right}; ${reason}`} title={`${s.pid}: ${left} to ${right} (${reason})`} aria-pressed={selected === s.pid} onClick={() => onSelect(s.pid)}><span>{right - left >= interval ? s.pid : ''}</span></m.button>;
              })}
              {isStep && time >= start && time <= finish && <m.span className="gantt-playhead" aria-hidden="true" initial={false} animate={{ x: (time - start) / interval * 44 }} transition={{ duration: reducedMotion ? 0 : 0.16 }}/>}
            </div>
          </div>)}
        </div>
      </div>
    </div>
    <div className="timeline-legend"><span><i style={{ backgroundColor: 'var(--accent)' }}/>CPU execution</span><span className="legend-hint">{isStep ? 'Only elapsed execution is shown. Summary metrics describe the full schedule.' : 'Select a process to inspect'}</span></div>
    <div className="secondary-metrics"><span>CPU utilization <strong>{result.cpuUtilization}%</strong></span><span>Throughput <strong>{result.throughput}<small> / unit</small></strong></span><span>Context switches <strong>{result.contextSwitches}</strong></span></div>
  </section>;
}

function Arrow({ backwards = false }: { backwards?: boolean }) {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ transform: backwards ? 'rotate(180deg)' : undefined }}><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
