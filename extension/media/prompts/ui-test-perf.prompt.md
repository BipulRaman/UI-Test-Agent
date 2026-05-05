---
description: "Lighthouse performance audit + trace via the UI Test agent."
agent: UI Test
---

Use the `UI Test` agent.

Run a Lighthouse performance audit on: ${input:url:https://example.com}
Device: ${input:device:mobile}
Network: ${input:network:Slow 4G}
CPU throttle: ${input:cpu:4}
Minimum perf score: ${input:minScore:0.80}

Also capture a performance trace and report:
- Lighthouse perf score.
- Core Web Vitals: LCP, CLS, INP, TBT.
- Top 5 trace insights with evidence.

Write per-case + roll-up reports under `./.ui-tests/reports/<run>/`.
