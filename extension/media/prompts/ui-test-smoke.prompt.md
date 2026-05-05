---
description: "Smoke test a URL via the UI Test agent (page loads, title, no console errors, no 5xx)."
agent: UI Test
---

Use the `UI Test` agent.

Smoke test the URL: ${input:url:https://example.com}
Devices: ${input:devices:desktop, mobile}

Pass criteria:
- Page reaches `domcontentloaded` without a navigation error.
- `<title>` is non-empty.
- No `error`-level console messages.
- No same-origin requests with status >= 500.

Write per-case + roll-up reports under `./.ui-tests/reports/<run>/`.
