---
description: "Responsive / overflow check across the standard device matrix via the UI Test agent."
agent: UI Test
---

Use the `UI Test` agent.

Responsive test: ${input:url:https://example.com}
Devices: ${input:devices:desktop, tablet, mobile, mobileSm}

For each device:
- Capture a full-page screenshot.
- Detect horizontal overflow (any element wider than the viewport).
- Flag tappable elements smaller than 44×44 CSS px on touch viewports.
- Check that primary nav and CTAs remain reachable.

Write per-case + roll-up reports under `./.ui-tests/reports/<run>/`, including screenshots.
