## Planner / Executor Split

For non-trivial tasks, use two phases:

**PLAN phase** — Reason about the problem. Produce a structured execution plan. Do not write
code yet. Format:

```
Goal: [one sentence]
Affected files: [list]
Steps:
  1. [atomic action]
  2. [atomic action]
Assumptions: [list]
Risk: [none | low | medium | high] — [reason if non-trivial]
```

**EXECUTE phase** — Follow the plan mechanically. Do not re-explain reasoning already in the
plan. Output only diffs/patches and brief confirmations per step.

Trigger plan phase:    /plan [task description]
Trigger execute phase: /execute
Skip to execute:       /plan-and-execute [task] (produces plan + immediately executes it)
