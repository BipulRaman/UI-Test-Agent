# UI Test Agent — VS Code Extension

> **One-click install** of the [UI Test Agent](../UI-Test-Agent-Overview.md) — an AI-powered, browser-driven QA specialist for VS Code Copilot Chat. Drives a real Chrome browser via the official Chrome DevTools MCP server and turns plain English into evidence-backed QA reports across desktop, tablet, and mobile.

---

## What this extension does

Installing this extension does three things automatically:

1. **Installs the `UI Test` agent** (`ui-test.agent.md`) into your VS Code prompts folder.
2. **Installs 8 named prompt entry points** (`/ui-test-smoke`, `/ui-test-a11y`, `/ui-test-perf`, `/ui-test-console`, `/ui-test-links`, `/ui-test-responsive`, `/ui-test-scaffold`, `/ui-test-run`) so users can launch any workflow from Copilot Chat.
3. **Registers the [`chrome-devtools-mcp`](https://www.npmjs.com/package/chrome-devtools-mcp) MCP server** with VS Code (auto-launched via `npx`) so the agent can drive a real Chrome browser without any manual `mcp.json` editing.

No test code, no DSL, no manual configuration.

---

## Quick start

1. Install this extension from the VS Code Marketplace.
2. Open **GitHub Copilot Chat**.
3. Try one of these:

```text
@UI Test  Test https://example.com on desktop, mobile, tablet
/ui-test-smoke   url=https://example.com
/ui-test-a11y    url=https://example.com
/ui-test-perf    url=https://example.com  device=mobile
/ui-test-scaffold
```

The agent will narrate its scope, drive Chrome, and reply with a Markdown report. When you scaffold a project, it writes a committable `./.ui-tests/` folder with starter cases and a `reports/` output directory.

---

## Seven workflows, one agent

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

## Settings

| Setting | Default | Purpose |
|---|---|---|
| `uiTestAgent.autoInstallPrompts` | `true` | Auto-copy the agent + prompt files to your prompts folder on activation. Locally edited files are preserved. |
| `uiTestAgent.enableChromeDevToolsMcp` | `true` | Register the Chrome DevTools MCP server with VS Code. |
| `uiTestAgent.chromeDevToolsMcpVersion` | `latest` | npm version tag for `chrome-devtools-mcp`. |

---

## Commands

- **UI Test Agent: Install / Update Prompt Files** — Force a re-install / update.
- **UI Test Agent: Open Prompts Folder** — Reveal the install location in your OS file explorer.
- **UI Test Agent: Remove Installed Prompt Files** — Uninstall the bundled files (preserves locally edited copies).
- **UI Test Agent: Show Welcome / Usage** — Re-open the welcome page.

---

## How file install behaves

- **First install**: writes the agent + 8 prompt files into your VS Code user `prompts/` folder.
- **Extension upgrades**: silently updates files **only** if your local copy still matches the previously installed version. Files you have edited are preserved untouched.
- **Force update**: run **UI Test Agent: Install / Update Prompt Files** to overwrite local edits.
- **Uninstall command**: removes only files that match the last installed version. Your edits are never deleted.

---

## Safety guarantees

The bundled agent is **read-only on application source code**. Its `editFiles` capability is whitelisted to test/report folders only — it can scaffold and write reports, but never modifies the product it tests. Crawls are capped at 25 pages by default. Real credentials and destructive actions are refused unless explicitly authorized.

---

## License

MIT — see [LICENSE](./LICENSE).
