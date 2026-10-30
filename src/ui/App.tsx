import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { AnimatePresence, LazyMotion, MotionConfig, domAnimation, useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import { ALGOS, simulate, validate, toProcesses, parseCSV, parseJSON } from '../engine';
import type { AlgorithmId, Raw, SimulationResult } from '../engine';
import { motionTokens } from './motion';
import SimulationTimeline from './SimulationTimeline';

const PALETTE = ['#277c72', '#d49a53', '#7285ac', '#b77989', '#8d9960', '#b97650', '#6f9ba4', '#8f83a5'];
const ALGORITHMS: AlgorithmId[] = ['fcfs', 'priority-np', 'priority-p', 'rr'];
const NAMES: Record<AlgorithmId, string> = { fcfs: 'First come, first served', 'priority-np': 'Priority · non-preemptive', 'priority-p': 'Priority · preemptive', rr: 'Round Robin' };
const DESC: Record<AlgorithmId, string> = {
  fcfs: 'Processes run in arrival order. Once a process starts, it runs to completion.',
  'priority-np': 'The highest-priority ready process runs next. Running processes finish without interruption.',
  'priority-p': 'A higher-priority arrival interrupts the running process. Equal priority never preempts.',
  rr: 'Each process takes a turn. Unfinished processes return to the queue after their time quantum.',
};
const PRESETS: Record<string, Raw[]> = {
  Textbook: [['P1', '0', '5', '2'], ['P2', '1', '3', '1'], ['P3', '2', '8', '3'], ['P4', '3', '6', '2']].map(([pid, arrival, burst, priority]) => ({ pid, arrival, burst, priority })),
  'Defense edge cases': [['P1', '2', '3', '1'], ['P2', '2', '2', '1'], ['P3', '4', '4', '2'], ['P4', '15', '2', '1'], ['P5', '15', '3', '1']].map(([pid, arrival, burst, priority]) => ({ pid, arrival, burst, priority })),
};

function Mark() {
  return <svg viewBox="0 0 28 28" fill="none" aria-hidden="true"><rect x="5" y="5" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5"/><path d="M10 10h8v8h-8zM10 1v4m8-4v4M10 23v4m8-4v4M1 10h4m-4 8h4m18-8h4m-4 8h4" stroke="currentColor" strokeWidth="1.5"/></svg>;
}

function MetricValue({ value, unit }: { value: string; unit: string }) {
  const shouldReduceMotion = useReducedMotion();

  return <AnimatePresence initial={false} mode="wait">
    <m.p
      key={value}
      className="metric-number"
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : motionTokens.distance.sm }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -motionTokens.distance.xs }}
      transition={{
        duration: shouldReduceMotion ? motionTokens.duration.instant : motionTokens.duration.fast,
        ease: motionTokens.easing.smooth,
      }}
    >{value}<span>{unit}</span></m.p>
  </AnimatePresence>;
}

export default function App() {
  const [algo, setAlgo] = useState<AlgorithmId>('fcfs');
  const [rows, setRows] = useState<Raw[]>(PRESETS.Textbook);
  const [quantum, setQuantum] = useState('2');
  const [low, setLow] = useState(true);
  const [dark, setDark] = useState(false);
  const [msg, setMsg] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const needP = algo.startsWith('priority');
  const { errs, res, cmp } = useMemo(() => {
    const errs = validate(rows, needP, algo === 'rr' ? quantum : null);
    if (errs.length) return { errs, res: null as SimulationResult | null, cmp: null };
    const ps = toProcesses(rows);
    const comparisonQuantum = /^\d+$/.test(quantum) && Number(quantum) > 0 ? Number(quantum) : 2;
    const run = (a: AlgorithmId) => simulate(a, ps, { quantum: comparisonQuantum, lowerIsHigherPriority: low });
    return { errs, res: run(algo), cmp: ALGORITHMS.map(a => ({ a, r: run(a) })) };
  }, [rows, algo, quantum, low, needP]);
  const color = (pid: string) => PALETTE[Math.max(0, rows.findIndex(r => r.pid.trim() === pid)) % PALETTE.length];
  const err = (row: number, field: string) => errs.find(e => e.row === row && e.field === field)?.message;
  const setCell = (i: number, k: keyof Raw, value: string) => setRows(rows.map((r, j) => j === i ? { ...r, [k]: value } : r));
  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { setRows(file.name.toLowerCase().endsWith('.json') ? parseJSON(await file.text()) : parseCSV(await file.text())); setMsg(`Loaded ${file.name}`); setSel(null); }
    catch (error) { setMsg(error instanceof Error ? error.message : 'Could not read file'); }
    e.target.value = '';
  };
  const addProcess = () => {
    let n = rows.length + 1;
    while (rows.some(r => r.pid.trim() === `P${n}`)) n++;
    setRows([...rows, { pid: `P${n}`, arrival: '0', burst: '1', priority: '1' }]);
  };
  const selected = res?.results.find(r => r.pid === sel);
  const bestWT = cmp ? Math.min(...cmp.map(c => c.r.avgWT)) : 0;
  const simulationKey = JSON.stringify([algo, rows, quantum, low]);

  return <MotionConfig reducedMotion="user"><LazyMotion features={domAnimation} strict><div className={`app-shell${dark ? ' dark-theme' : ''}`}>
    <a className="skip-link" href="#workspace">Skip to simulator</a>
    <header className="topbar"><div className="topbar-inner">
      <a className="brand" href="#workspace" aria-label="Dispatch simulator"><span className="brand-mark"><Mark /></span>dispatch<span className="brand-divider"/><span className="brand-subtitle">Scheduling lab</span></a>
      <div className="header-actions"><span className="course-label">CS 3104N <span>/</span> OPERATING SYSTEMS</span><button className="theme-button" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setDark(!dark)}><span aria-hidden="true">{dark ? '◐' : '◑'}</span><span>{dark ? 'Light' : 'Dark'}</span></button></div>
    </div></header>

    <main id="workspace" className="workspace">
      <section className="page-intro"><div><p className="eyebrow"><span/> THE CPU, EXPLAINED</p><h1>Every process.<br className="mobile-break"/> In its own time.</h1><p className="intro-copy">Explore scheduling algorithms, follow the timeline, and see what makes a CPU tick.</p></div><div className="intro-note"><span className="live-dot"/> Interactive workspace<span className="intro-note-sub">Edit a value. Watch the schedule change.</span></div></section>

      <section className="algorithm-section" aria-labelledby="algorithm-title"><div className="section-label"><span>01</span><h2 id="algorithm-title">Choose your algorithm</h2></div>
        <div className="algorithm-grid">{ALGORITHMS.map((a, i) => <button key={a} className={`algorithm-option${a === algo ? ' is-active' : ''}`} aria-pressed={a === algo} onClick={() => { setAlgo(a); setSel(null); }}><span className="algorithm-top"><span className="algorithm-index">0{i + 1}</span><span className="radio-indicator"/></span><strong>{ALGOS[a]}</strong><span className="algorithm-caption">{['Arrival order', 'Priority, uninterrupted', 'Priority, with interruptions', 'A fair turn for everyone'][i]}</span></button>)}</div>
      </section>

      <div className="lab-grid">
        <section className="panel process-panel" aria-labelledby="process-title"><div className="panel-heading"><div><div className="section-label"><span>02</span><h2 id="process-title">Process queue</h2></div><p>Define the work arriving at your CPU.</p></div><span className="count-badge">{rows.length} / 50</span></div>
          <div className="input-toolbar"><select aria-label="Preset" defaultValue="" onChange={e => { if (PRESETS[e.target.value]) { setRows(PRESETS[e.target.value]); setSel(null); setMsg(`${e.target.value} preset loaded`); } e.target.value = ''; }}><option value="" disabled>Load a preset</option>{Object.keys(PRESETS).map(p => <option key={p}>{p}</option>)}</select><button className="text-button" onClick={() => uploadRef.current?.click()}><span aria-hidden="true">↥</span> Import file</button><input ref={uploadRef} type="file" accept=".csv,.json" className="sr-only" aria-label="Upload CSV or JSON" onChange={upload}/></div>
          <div className="table-scroll"><table className="input-table"><thead><tr><th scope="col">Process</th><th scope="col">Arrival</th><th scope="col">Burst</th>{needP && <th scope="col">Priority</th>}<th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{(['pid', 'arrival', 'burst', ...(needP ? ['priority'] : [])] as (keyof Raw)[]).map(k => <td key={k}><div className="cell-input">{k === 'pid' && <span className="process-dot" style={{ backgroundColor: PALETTE[i % PALETTE.length] }}/>}<input aria-label={`${k} row ${i + 1}`} aria-invalid={!!err(i, k)} aria-describedby={err(i, k) ? `error-${i}-${k}` : undefined} inputMode={k === 'pid' ? 'text' : 'numeric'} value={r[k]} onChange={e => setCell(i, k, e.target.value)}/></div>{err(i, k) && <span id={`error-${i}-${k}`} className="field-error">{err(i, k)}</span>}</td>)}<td><button className="remove-button" aria-label={`Remove row ${i + 1}`} onClick={() => setRows(rows.filter((_, j) => j !== i))}>×</button></td></tr>)}</tbody></table></div>
          {err(-1, 'table') && <p className="field-error">{err(-1, 'table')}</p>}
          <button className="add-button" onClick={addProcess} disabled={rows.length >= 50}><span aria-hidden="true">+</span> Add process</button>
          <div className="queue-settings">{needP && <label className="checkbox-label"><input type="checkbox" checked={low} onChange={e => setLow(e.target.checked)}/> Lower number = higher priority</label>}{algo === 'rr' && <label className="quantum-label">Time quantum <span><input aria-label="Quantum" inputMode="numeric" aria-invalid={!!err(-1, 'quantum')} value={quantum} onChange={e => setQuantum(e.target.value)}/> units</span></label>}{err(-1, 'quantum') && <p className="field-error">{err(-1, 'quantum')}</p>}<p className="input-hint">Arrival & burst in time units. Whole numbers only.</p><p className="upload-message" role="status">{msg}</p></div>
          <aside className="algorithm-explainer"><span className="small-label">HOW IT WORKS</span><h3>{NAMES[algo]}</h3><p>{DESC[algo]}</p><span className="auto-update"><span className="live-dot"/> Calculates as you edit</span></aside>
        </section>

        <div className="results-column"><div className="results-heading"><div className="section-label"><span>03</span><h2>Read the schedule</h2></div><span className={`result-status${res ? '' : ' invalid'}`}><span/>{res ? 'Simulation ready' : 'Check inputs'}</span></div>
          {res && cmp ? <>
            <section className="metrics-grid" aria-label="Simulation metrics">{([
              ['Avg. turnaround', res.avgTAT.toFixed(2), 'units', 'Completion − arrival'], ['Avg. waiting', res.avgWT.toFixed(2), 'units', 'Turnaround − burst'], ['Avg. response', res.avgRT.toFixed(2), 'units', 'First CPU − arrival'],
            ]).map(([label, value, unit, hint]) => <article className="metric" key={label}><h3>{label}</h3><MetricValue value={value} unit={unit}/><p className="metric-hint">{hint}</p></article>)}</section>

            <SimulationTimeline key={simulationKey} result={res} color={color} selected={sel} onSelect={setSel}/>

            <section className="panel breakdown-panel" aria-labelledby="breakdown-title"><div className="panel-heading"><div><h2 id="breakdown-title">Process breakdown</h2><p>The numbers behind the timeline.</p></div><span className="small-label">TIME UNITS</span></div><div className="table-scroll"><table className="data-table"><thead><tr>{['Process', 'Arrival', 'Burst', ...(needP ? ['Priority'] : []), 'Finish', 'TAT', 'Wait', 'Response'].map(h => <th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{res.results.map(r => <tr key={r.pid} className={sel === r.pid ? 'selected-row' : ''}><td><button className="process-select" aria-pressed={sel === r.pid} onClick={() => setSel(sel === r.pid ? null : r.pid)}><span className="process-dot" style={{ backgroundColor: color(r.pid) }}/>{r.pid}</button></td><td>{r.arrival}</td><td>{r.burst}</td>{needP && <td>{r.priority}</td>}<td>{r.completion}</td><td>{r.turnaround}</td><td>{r.waiting}</td><td>{r.response}</td></tr>)}</tbody><tfoot><tr><th scope="row" colSpan={needP ? 5 : 4}>Average</th><td>{res.avgTAT.toFixed(2)}</td><td>{res.avgWT.toFixed(2)}</td><td>{res.avgRT.toFixed(2)}</td></tr></tfoot></table></div><AnimatePresence initial={false} mode="wait">{selected && <m.div key={selected.pid} className="process-detail" role="status" initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -motionTokens.distance.xs }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: shouldReduceMotion ? 0 : motionTokens.distance.xs }} transition={{ duration: shouldReduceMotion ? motionTokens.duration.instant : motionTokens.duration.fast, ease: motionTokens.easing.smooth }}><strong>{selected.pid}</strong><span>Turnaround: {selected.completion} − {selected.arrival} = {selected.turnaround}</span><span>Waiting: {selected.turnaround} − {selected.burst} = {selected.waiting}</span><span>Response: {selected.response}</span></m.div>}</AnimatePresence></section>

            <section className="panel comparison-panel" aria-labelledby="comparison-title"><div className="panel-heading"><div><h2 id="comparison-title">A different way to schedule</h2><p>All four algorithms, same process queue.</p></div><span className="comparison-symbol" aria-hidden="true">⇄</span></div><div className="table-scroll"><table className="data-table comparison-table"><thead><tr><th scope="col">Algorithm</th><th scope="col">Avg. wait</th><th scope="col">Avg. TAT</th><th scope="col">Switches</th></tr></thead><tbody>{cmp.map(({ a, r }) => <tr key={a} className={a === algo ? 'current-algorithm' : ''}><td><button onClick={() => setAlgo(a)}>{ALGOS[a]}{r.avgWT === bestWT && <span className="best-badge">Lowest wait</span>}</button></td><td><div className="comparison-value"><span>{r.avgWT.toFixed(2)}</span><span className="comparison-bar"><m.span className="comparison-bar-fill" initial={false} animate={{ scaleX: Math.max(0.03, r.avgWT / Math.max(1, ...cmp.map(c => c.r.avgWT))) }} transition={{ duration: shouldReduceMotion ? motionTokens.duration.instant : motionTokens.duration.normal, ease: motionTokens.easing.smooth }}/></span></div></td><td>{r.avgTAT.toFixed(2)}</td><td>{r.contextSwitches}</td></tr>)}</tbody></table></div><p className="comparison-note">Blank priorities count as 0. Round Robin quantum: {/^\d+$/.test(quantum) && Number(quantum) > 0 ? quantum : 2} units.</p></section>

            <details className="panel explain-panel"><summary><span><span className="log-symbol" aria-hidden="true">≡</span> Under the hood <span className="log-count">{res.log.length} events</span></span><span className="expand-label">View execution log <span aria-hidden="true">+</span></span></summary><div className="execution-log" aria-label="Explain log">{res.log.map((line, i) => <div key={i}><span>{String(i + 1).padStart(2, '0')}</span><p>{line}</p></div>)}</div></details>
          </> : <section className="panel error-state" role="alert"><span aria-hidden="true">!</span><h2>Let’s check the queue.</h2><p>Fix the highlighted inputs to build your schedule.</p><small>{errs.length} issue{errs.length === 1 ? '' : 's'} to resolve</small></section>}
        </div>
      </div>
      <footer className="footer"><span><Mark/> dispatch <span>/</span> A little clarity for your CPU.</span><span>CS 3104N · Scheduling lab</span></footer>
    </main>
  </div></LazyMotion></MotionConfig>;
}
