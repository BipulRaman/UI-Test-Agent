# Change Log

All notable changes to the **UI Test Agent** extension are documented in this file.

## [0.3.1] - 2026-05-05

### Added
- **Uninstall now also purges the `chrome-devtools-mcp` npx cache.** The `vscode:uninstall` hook (`scripts/uninstall.js`) walks the npx cache directories (`~/.npm/_npx`, `%APPDATA%\npm-cache\_npx`, `%LOCALAPPDATA%\npm-cache\_npx`) and removes only the hashed subfolders that contain `node_modules/chrome-devtools-mcp`. Other cached `npx` packages are untouched. Safe — `npx` re-downloads on next use if anything else still needs it.

## [0.3.0] - 2026-05-05

### Added
- **Uninstall cleanup**. The extension now installs a [`vscode:uninstall` hook script](https://code.visualstudio.com/api/references/extension-manifest#extension-uninstall-hook) (`scripts/uninstall.js`) that runs at next VS Code startup after uninstall and removes the `ui-test.agent.md` and 8 `ui-test-*.prompt.md` files from the user `prompts/` folder. Files the user has locally modified are preserved (sha256 match check).
- The extension writes a small install record to `~/.ui-test-agent/install-record.json` on every install/update so the standalone uninstall script can find what to clean up. The in-extension **Remove Installed Prompt Files** command also deletes this record.

### Notes on uninstall behavior
- The MCP server provider is automatically disposed by VS Code when the extension host stops on uninstall — no explicit cleanup needed.
- The user's `globalState` is also wiped automatically by VS Code on uninstall.
- The cached `chrome-devtools-mcp` npm package in `~/.npm/_npx/` is **also removed as of 0.3.1** (only the hashed subdirectories that actually contain `chrome-devtools-mcp` — the rest of the npm/npx cache is untouched).

## [0.2.0] - 2026-05-05

### Added
- **Environment probe on activation** — detects Node.js, npx, and Chrome. Surfaces a one-time, non-blocking notification if anything is missing, with one-click actions to install Chrome / Node.js, set a custom Chrome path, or dismiss.
- **`uiTestAgent.chromeExecutablePath`** setting — absolute path to a Chrome / Chromium / Edge binary. Passed to chrome-devtools-mcp as `--executablePath`.
- **`uiTestAgent.chromeChannel`** setting — `stable` / `beta` / `canary` / `dev`. Passed as `--channel` (ignored when `chromeExecutablePath` is set).
- **`UI Test Agent: Check Environment`** command — refreshes the cached probe and shows a full Node + Chrome + MCP status report in the output channel.
- MCP status output now includes detected Node / npx / Chrome versions and the exact launch command (with any `--executablePath` / `--channel` flags).

### Changed
- The MCP provider re-fires `onDidChangeMcpServerDefinitions` when any of the three MCP-related settings change, so VS Code picks up the new definition without a reload.

## [0.1.1] - 2026-05-05

### Fixed
- Chrome DevTools MCP server provider now registers reliably. Removed defensive `as unknown as` casts that hid runtime errors and switched to the stable `vscode.lm.registerMcpServerDefinitionProvider` / `vscode.McpStdioServerDefinition` APIs directly.
- Added a diagnostic command **UI Test Agent: Show Chrome DevTools MCP Status** plus log lines on every `provideMcpServerDefinitions` call, so users can confirm the server is registered and see the exact `npx` command being launched.
- First-run notification now reports MCP registration status and offers a one-click button to open `MCP: List Servers`.

## [0.1.0] - 2026-05-04

### Added
- Initial release.
- One-click install of the `UI Test` agent (`ui-test.agent.md`) into the VS Code user prompts folder.
- Eight prompt entry points: `/ui-test-smoke`, `/ui-test-a11y`, `/ui-test-perf`, `/ui-test-console`, `/ui-test-links`, `/ui-test-responsive`, `/ui-test-scaffold`, `/ui-test-run`.
- Automatic registration of the `chrome-devtools-mcp` MCP server via VS Code's `lm.registerMcpServerDefinitionProvider` API.
- Commands: install/update, open prompts folder, uninstall, show welcome.
- Settings: `uiTestAgent.autoInstallPrompts`, `uiTestAgent.enableChromeDevToolsMcp`, `uiTestAgent.chromeDevToolsMcpVersion`.
- Safe install/update logic: never overwrites locally edited prompt files unless the user runs the explicit Install / Update command.
