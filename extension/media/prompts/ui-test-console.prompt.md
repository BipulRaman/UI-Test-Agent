---
description: "Check console + network health on a URL via the UI Test agent."
agent: UI Test
---

Use the `UI Test` agent.

Check console and network on: ${input:url:https://example.com}
Devices: ${input:devices:desktop}
Observation window: ${input:waitMs:5000} ms after load.

Report:
- All `error` and `warning` console messages with text + source.
- All requests with status 4xx or 5xx (URL, status, initiator).
- Slow requests (> 2s) with timing.

Pass only if there are no `error`-level messages and no 5xx responses.

Write per-case + roll-up reports under `./.ui-tests/reports/<run>/`.
