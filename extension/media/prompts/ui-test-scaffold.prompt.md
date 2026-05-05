---
description: "Scaffold a starter UI-test suite into the current project via the UI Test agent."
agent: UI Test
---

Use the `UI Test` agent in **scaffold mode**.

Target folder: ${input:folder:./.ui-tests}
Base URL (leave blank to auto-detect from package.json / vite / next / .env): ${input:url:}

Scaffold the standard starter pack:
- `_template.ui-test.md` (mandatory, annotated reference of every supported field)
- `home.smoke.ui-test.md`
- `console.ui-test.md`
- `a11y.ui-test.md`
- `perf.ui-test.md`
- `links.ui-test.md`
- `login.flow.ui-test.md`
- `README.md` (includes the full Standard Test Prompt Library)
- `reports/.gitkeep`

Then run the verification checklist and reply with clickable links to each created file plus the next prompt to run the suite.
