---
description: "Run all UI-test cases in a folder via the UI Test agent."
agent: UI Test
---

Use the `UI Test` agent.

Run every case in: ${input:folder:./.ui-tests}
Optional glob filter: ${input:filter:}
Optional device override (comma-separated): ${input:devices:}

Discovery rules: any of `**/*.ui-test.md`, `**/*.ui-test.txt`, `**/*.ui-test.yaml`, `**/*.ui-test.yml`, `**/*.ui-test.json`. A single file may contain one or many cases.

Write per-case reports to `<folder>/reports/<YYYY-MM-DD-HHmm>/<case-slug>.md` and a roll-up `_summary.md` in the same folder. Post the summary as the chat reply.
