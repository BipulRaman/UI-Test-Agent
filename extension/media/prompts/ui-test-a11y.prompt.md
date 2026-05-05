---
description: "Run a Lighthouse accessibility audit on a URL via the UI Test agent."
agent: UI Test
---

Use the `UI Test` agent.

Run a Lighthouse accessibility audit on: ${input:url:https://example.com}
Devices: ${input:devices:desktop, mobile}
Minimum a11y score: ${input:minScore:0.90}

Report:
- Lighthouse a11y score per device.
- Every violation grouped by axe rule id, with selector + snapshot uid.
- Severity grading per the agent's rubric.

Write per-case + roll-up reports under `./.ui-tests/reports/<run>/`.
