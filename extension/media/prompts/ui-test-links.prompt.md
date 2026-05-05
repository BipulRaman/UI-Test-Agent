---
description: "Same-origin link check / shallow crawl via the UI Test agent."
agent: UI Test
---

Use the `UI Test` agent.

Check all same-origin links starting from: ${input:url:https://example.com}
Max pages: ${input:maxPages:25}
Devices: ${input:devices:desktop}

For each link, record HTTP status, content type, and whether it loaded without console errors. Group findings by status class (2xx / 3xx / 4xx / 5xx / network-error).

Write per-case + roll-up reports under `./.ui-tests/reports/<run>/`.
