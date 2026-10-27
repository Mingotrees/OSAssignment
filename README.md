# CPU Scheduling Simulator (CS 3104N)
`npm install` · `npm run dev` · `npm test` · `npm run build` (type-check + build)

**Layers:** `src/engine/` = pure TS (no React/DOM): `fcfs`, `priorityNP`, `priorityP`, `roundRobin`, plus `core` (shared helpers), `metrics`, `validate`, `parse`. `src/ui/` only consumes `simulate()` output.

## Conventions (match the code and tests)
- TAT = completion − arrival; WT = TAT − burst; RT = first CPU − arrival. Averages rounded to 2 decimals.
- Priority: lower number = higher priority (checkbox flips it). Ties: priority → earlier arrival → entry order.
- Priority-P preempts only on STRICTLY better priority; the preempted process rejoins the pool with its remaining time.
- Round Robin: FIFO queue; an arrival at the same instant a quantum expires is enqueued BEFORE the preempted process. A lone process keeps running with no segment break and no switch.
- IDLE segment emitted when nothing is ready. Context switch = adjacent segments of two different processes; dispatch after idle is not counted.
- CPU utilization = busy time / time of last completion (leading idle counts). Throughput = processes / last completion.
- Inputs are whole numbers; max 50 processes.

## Defense cheat sheet
- *Equal priority arrives while another runs?* No preemption (strict comparison in `priorityP.ts`).
- *Quantum expires at the same time as an arrival?* Arrival is queued first (`admit()` runs before the re-queue in `roundRobin.ts`).
- *Quantum expires and queue is empty?* Process continues, no switch counted.
- *Ready pool structure?* Array sorted with a comparator (O(n log n) per dispatch, n ≤ 50); RR uses a FIFO array queue.
- *Context switches?* Only direct A→B transitions; after idle is not counted.
