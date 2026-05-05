# UI Test Agent

> An AI-powered, browser-driven QA specialist for **GitHub Copilot Chat in VS Code**. Drives a real Chrome browser via the official [`chrome-devtools-mcp`](https://www.npmjs.com/package/chrome-devtools-mcp) server and turns plain English into evidence-backed QA reports across desktop, tablet, and mobile.

[![Marketplace](https://img.shields.io/visual-studio-marketplace/v/BipulRaman.ui-test-agent?label=VS%20Code%20Marketplace&color=007ACC&logo=visualstudiocode)](https://marketplace.visualstudio.com/items?itemName=BipulRaman.ui-test-agent)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/BipulRaman.ui-test-agent?color=informational)](https://marketplace.visualstudio.com/items?itemName=BipulRaman.ui-test-agent)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./extension/LICENSE)

---

## Repository layout

| Folder | Contents |
|---|---|
| [extension/](./extension) | The published **VS Code extension** source (`ui-test-agent`). |
| [web/](./web) | The project **landing site** — static HTML/CSS/JS, deployable to GitHub Pages, Azure Static Web Apps, Netlify, etc. |

---

## What it does

Installing the extension does three things automatically:

1. **Installs the `UI Test` agent** (`ui-test.agent.md`) into your VS Code prompts folder.
2. **Installs 8 named prompt entry points** — `/ui-test-smoke`, `/ui-test-a11y`, `/ui-test-perf`, `/ui-test-console`, `/ui-test-links`, `/ui-test-responsive`, `/ui-test-scaffold`, `/ui-test-run` — so any workflow can be launched from Copilot Chat.
3. **Registers the [`chrome-devtools-mcp`](https://www.npmjs.com/package/chrome-devtools-mcp) MCP server** with VS Code (auto-launched via `npx`) so the agent can drive a real Chrome browser without any manual `mcp.json` editing.

No test code, no DSL, no manual configuration.

---

## Quick start

1. Install the extension from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=BipulRaman.ui-test-agent).
2. Open **GitHub Copilot Chat**.
3. Try one of these:

```text
@UI Test  Test https://example.com on desktop, mobile, tablet
/ui-test-smoke   url=https://example.com
/ui-test-a11y    url=https://example.com
/ui-test-perf    url=https://example.com  device=mobile
/ui-test-scaffold
```

The agent narrates its scope, drives Chrome, and replies with a Markdown report. When you scaffold a project, it writes a committable `./.ui-tests/` folder with starter cases and a `reports/` output directory.

---

## Eight workflows, one agent

| Prompt | What it verifies |
|---|---|
| `/ui-test-smoke` | Page load, title, no console errors, no 5xx |
| `/ui-test-console` | Runtime console + network health |
| `/ui-test-a11y` | Lighthouse accessibility (WCAG / axe) |
| `/ui-test-perf` | Lighthouse performance + Core Web Vitals |
| `/ui-test-links` | Same-origin link health / shallow crawl |
| `/ui-test-responsive` | Overflow + touch-target audit across breakpoints |
| `/ui-test-scaffold` | Bootstrap a starter `.ui-tests/` suite |
| `/ui-test-run` | Bulk-run a folder of `*.ui-test.md` cases |

All workflows can fan out across the standard device matrix (`desktop · desktopHD · tablet · tabletLand · mobile · mobileSm`) with optional network/CPU throttling.

---

## Requirements

- **VS Code 1.101+** with GitHub Copilot Chat enabled.
- **Node.js** on `PATH` (so `npx` can launch the MCP server).
- **Google Chrome** installed (used by `chrome-devtools-mcp`).

---

## Develop the extension

```powershell
cd extension
npm install
npm run compile
# Press F5 in VS Code to launch the Extension Development Host
```

Package locally:

```powershell
cd extension
npm run package        # produces ui-test-agent-<version>.vsix
```

See [extension/PUBLISHING.md](./extension/PUBLISHING.md) for the full Marketplace publish flow and [extension/CHANGELOG.md](./extension/CHANGELOG.md) for release history.

---

## Run the website locally

The site in [web/](./web) is plain HTML/CSS/JS — no build step, no dependencies.

```powershell
cd web
# any static server works, e.g.:
npx serve .
# or:
python -m http.server 8080
```

Then open <http://localhost:8080> (or whatever port the server prints).

See [web/README.md](./web/README.md) for deployment recipes (GitHub Pages, Azure Static Web Apps, Netlify).

---

## Safety guarantees

The bundled agent is **read-only on application source code**. Its `editFiles` capability is whitelisted to test/report folders only — it can scaffold and write reports, but never modifies the product it tests. Crawls are capped at 25 pages by default. Real credentials and destructive actions are refused unless explicitly authorized.

---

## License

MIT — see [extension/LICENSE](./extension/LICENSE).
