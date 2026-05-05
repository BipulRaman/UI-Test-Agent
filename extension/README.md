# UI Test Agent

> **Plain-English browser QA inside GitHub Copilot Chat.** Smoke, accessibility, performance, console, link, and responsive checks across desktop, tablet, and mobile — every run produces an evidence-backed Markdown report. No test code. No DSL. No configuration files.

---

## What it does

Type what you want to verify, in English. The agent drives a real browser, performs the checks, and writes a report.

```text
@UI Test  Test https://example.com on desktop, mobile, tablet
/ui-test-smoke      url=https://example.com
/ui-test-a11y       url=https://example.com
/ui-test-perf       url=https://example.com  device=mobile
/ui-test-responsive url=https://example.com  devices=mobile,mobileSm,tablet
/ui-test-scaffold
```

Install the extension, open Copilot Chat, and ask. The agent narrates its scope, runs the checks, and replies with a Markdown report. When you scaffold a project, it writes a committable `./.ui-tests/` folder with starter cases and a `reports/` output directory.

---

## Eight ready-to-use workflows

| Prompt | What it verifies |
|---|---|
| `/ui-test-smoke` | Page load, title, no console errors, no 5xx responses |
| `/ui-test-console` | Runtime console + network health |
| `/ui-test-a11y` | Accessibility audit (WCAG / axe) with rule-by-rule findings |
| `/ui-test-perf` | Performance audit + Core Web Vitals (LCP, INP, CLS) |
| `/ui-test-links` | Same-origin link health and shallow crawl |
| `/ui-test-responsive` | Overflow, layout, and touch-target audit across breakpoints |
| `/ui-test-scaffold` | Bootstrap a starter `.ui-tests/` suite for your project |
| `/ui-test-run` | Bulk-run a folder of `*.ui-test.md` cases |

Every workflow can fan out across the standard device matrix (`desktop · desktopHD · tablet · tabletLand · mobile · mobileSm`) with optional network and CPU throttling.

---

## Why teams use it

- **Plain English in, evidence out.** Reports include screenshots, scores, console errors, and failed requests — everything you need to triage.
- **Markdown-native test cases.** Scaffolded suites are diff-friendly `.ui-test.md` files. Commit them, review them in PRs, evolve them with your product.
- **One-click install.** No extension chains, no setup wizard, no config files to write.
- **Read-only on your code.** The agent can scaffold tests and write reports — but it cannot modify your application source. Ever.
- **Six device profiles.** Desktop, large desktop, tablet (portrait/landscape), mobile, and small mobile, all with realistic viewports and DPR.

---

## Requirements

> **You need an active [GitHub Copilot](https://github.com/features/copilot) subscription** (Individual, Business, or Enterprise) with **Copilot Chat enabled**. The agent runs on top of Copilot Chat in **Agent Mode** — without an active subscription the chat surface is unavailable and the agent cannot run. A Copilot Free trial works for evaluation.

You also need:

- **VS Code 1.101+** with the **GitHub Copilot Chat** extension installed and signed in.
- **Node.js 18+** on `PATH`.
- **Google Chrome / Chromium / Edge** installed locally (auto-detected).

The extension probes your environment on first run and offers one-click actions to install anything that's missing.

---

## Quick start

1. Install this extension from the VS Code Marketplace.
2. Make sure you're signed in to **GitHub Copilot** in VS Code.
3. Open **GitHub Copilot Chat** and switch to **Agent Mode**.
4. Try one of the prompts above — or just say:

```text
@UI Test  Smoke test my staging site at https://staging.example.com
```

---

## Settings

| Setting | Default | Purpose |
|---|---|---|
| `uiTestAgent.autoInstallPrompts` | `true` | Auto-copy the agent + prompt files to your prompts folder on activation. Locally edited files are preserved. |
| `uiTestAgent.enableChromeDevToolsMcp` | `true` | Enable the built-in browser engine. Disable only if you use a custom external setup. |
| `uiTestAgent.chromeDevToolsMcpVersion` | `latest` | Pin a specific browser engine build (advanced). |
| `uiTestAgent.chromeExecutablePath` | `""` | Absolute path to a Chrome / Chromium / Edge binary. Leave empty for auto-detect. |
| `uiTestAgent.chromeChannel` | `""` | Choose a Chrome release channel: `stable` / `beta` / `canary` / `dev`. |

---

## Commands

- **UI Test Agent: Install / Update Prompt Files** — Force a re-install / update.
- **UI Test Agent: Open Prompts Folder** — Reveal the install location in your OS file explorer.
- **UI Test Agent: Remove Installed Prompt Files** — Uninstall the bundled files (preserves locally edited copies).
- **UI Test Agent: Show Welcome / Usage** — Re-open the welcome page.
- **UI Test Agent: Show Browser Engine Status** — Diagnostic info about the agent's browser runtime.
- **UI Test Agent: Check Environment** — Probe Node and the browser, then report what was found.

---

## How file install behaves

- **First install**: writes the agent + 8 prompt files into your VS Code user `prompts/` folder.
- **Extension upgrades**: silently updates files **only** if your local copy still matches the previously installed version. Files you have edited are preserved untouched.
- **Force update**: run **UI Test Agent: Install / Update Prompt Files** to overwrite local edits.
- **Uninstall command**: removes only files that match the last installed version. Your edits are never deleted.

---

## Safety guarantees

The bundled agent is **read-only on application source code**. Its file-write capability is whitelisted to test/report folders only — it can scaffold and write reports, but never modifies the product it tests. Same-origin crawls are capped at 25 pages by default. Real credentials and destructive actions are refused unless explicitly authorized.

---

## License

MIT — see [LICENSE](./LICENSE).
