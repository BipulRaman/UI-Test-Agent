import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import * as os from 'os';
import * as crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const AGENT_FILES: ReadonlyArray<{ src: string; name: string }> = [
	{ src: 'media/agent/ui-test.agent.md', name: 'ui-test.agent.md' }
];

const PROMPT_FILES: ReadonlyArray<{ src: string; name: string }> = [
	{ src: 'media/prompts/ui-test-smoke.prompt.md', name: 'ui-test-smoke.prompt.md' },
	{ src: 'media/prompts/ui-test-a11y.prompt.md', name: 'ui-test-a11y.prompt.md' },
	{ src: 'media/prompts/ui-test-perf.prompt.md', name: 'ui-test-perf.prompt.md' },
	{ src: 'media/prompts/ui-test-console.prompt.md', name: 'ui-test-console.prompt.md' },
	{ src: 'media/prompts/ui-test-links.prompt.md', name: 'ui-test-links.prompt.md' },
	{ src: 'media/prompts/ui-test-responsive.prompt.md', name: 'ui-test-responsive.prompt.md' },
	{ src: 'media/prompts/ui-test-scaffold.prompt.md', name: 'ui-test-scaffold.prompt.md' },
	{ src: 'media/prompts/ui-test-run.prompt.md', name: 'ui-test-run.prompt.md' }
];

const HASH_STATE_KEY = 'uiTestAgent.installedHashes.v1';
const FIRST_RUN_KEY = 'uiTestAgent.firstRunCompleted.v1';
const ENV_WARN_KEY = 'uiTestAgent.envWarningDismissed.v1';

interface InstalledHashes {
	[fileName: string]: string;
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
	const output = vscode.window.createOutputChannel('UI Test Agent');
	context.subscriptions.push(output);

	// --- Commands ---
	context.subscriptions.push(
		vscode.commands.registerCommand('uiTestAgent.install', () => installFiles(context, output, { force: true }))
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('uiTestAgent.openPromptsFolder', () => openPromptsFolder(context))
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('uiTestAgent.uninstall', () => uninstallFiles(context, output))
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('uiTestAgent.showWelcome', () => showWelcome())
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('uiTestAgent.mcpStatus', () => showMcpStatus(output))
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('uiTestAgent.checkEnvironment', () =>
			checkEnvironmentCommand(output)
		)
	);

	// --- MCP server provider ---
	registerMcpProvider(context, output);

	// --- Auto install on activation ---
	const cfg = vscode.workspace.getConfiguration('uiTestAgent');
	if (cfg.get<boolean>('autoInstallPrompts', true)) {
		try {
			await installFiles(context, output, { force: false });
		} catch (err) {
			output.appendLine(`[install] failed: ${formatError(err)}`);
		}
	}

	// --- Environment probe (Chrome + Node). Non-blocking. ---
	void runEnvironmentProbe(context, output);

	// --- First-run welcome ---
	if (!context.globalState.get<boolean>(FIRST_RUN_KEY)) {
		await context.globalState.update(FIRST_RUN_KEY, true);
		showFirstRunNotification();
	}
}

export function deactivate(): void {
	// nothing to do
}

// ---------------------------------------------------------------------------
// File install / update
// ---------------------------------------------------------------------------

function getUserPromptsDir(context: vscode.ExtensionContext): string {
	// globalStorageUri = <userData>/User/globalStorage/<publisher>.<extension>
	// Two dirnames up = <userData>/User
	const userDir = path.dirname(path.dirname(context.globalStorageUri.fsPath));
	return path.join(userDir, 'prompts');
}

/**
 * Path to a persistent install record under the user's home directory.
 *
 * IMPORTANT: this lives OUTSIDE the extension's install folder and OUTSIDE
 * `globalStorage`, both of which can be wiped during uninstall before the
 * `vscode:uninstall` script runs. Storing it in `~/.ui-test-agent/` lets the
 * standalone uninstall script find what to clean up.
 *
 * Keep this path in sync with `scripts/uninstall.js`.
 */
function getInstallRecordPath(): string {
	return path.join(os.homedir(), '.ui-test-agent', 'install-record.json');
}

interface InstallRecord {
	version: 1;
	promptsDir: string;
	files: { name: string; sha256: string }[];
	installedAt: string;
	extensionVersion?: string;
}

async function writeInstallRecord(
	context: vscode.ExtensionContext,
	promptsDir: string,
	hashes: InstalledHashes
): Promise<void> {
	const record: InstallRecord = {
		version: 1,
		promptsDir,
		files: Object.entries(hashes).map(([name, sha]) => ({ name, sha256: sha })),
		installedAt: new Date().toISOString(),
		extensionVersion: context.extension.packageJSON?.version
	};
	const recordPath = getInstallRecordPath();
	try {
		await fs.mkdir(path.dirname(recordPath), { recursive: true });
		await fs.writeFile(recordPath, JSON.stringify(record, null, 2), 'utf8');
	} catch {
		// Non-fatal: cleanup-on-uninstall just won't have a record.
	}
}

async function deleteInstallRecord(): Promise<void> {
	const recordPath = getInstallRecordPath();
	try {
		await fs.unlink(recordPath);
	} catch {
		/* ignore */
	}
	try {
		await fs.rmdir(path.dirname(recordPath));
	} catch {
		/* ignore — directory may be non-empty or already gone */
	}
}

interface InstallOptions {
	force: boolean;
}

interface InstallResult {
	installed: string[];
	updated: string[];
	skippedUserModified: string[];
	unchanged: string[];
}

async function installFiles(
	context: vscode.ExtensionContext,
	output: vscode.OutputChannel,
	options: InstallOptions
): Promise<InstallResult> {
	const targetDir = getUserPromptsDir(context);
	await fs.mkdir(targetDir, { recursive: true });

	const installed: string[] = [];
	const updated: string[] = [];
	const skippedUserModified: string[] = [];
	const unchanged: string[] = [];

	const previousHashes = context.globalState.get<InstalledHashes>(HASH_STATE_KEY, {});
	const newHashes: InstalledHashes = { ...previousHashes };

	for (const file of [...AGENT_FILES, ...PROMPT_FILES]) {
		const sourcePath = path.join(context.extensionPath, file.src);
		const destPath = path.join(targetDir, file.name);

		let bundledContent: string;
		try {
			bundledContent = await fs.readFile(sourcePath, 'utf8');
		} catch (err) {
			output.appendLine(`[install] missing bundled file ${file.src}: ${formatError(err)}`);
			continue;
		}
		const bundledHash = sha256(bundledContent);

		const existing = await tryReadFile(destPath);
		if (existing === undefined) {
			await fs.writeFile(destPath, bundledContent, 'utf8');
			newHashes[file.name] = bundledHash;
			installed.push(file.name);
			output.appendLine(`[install] wrote ${file.name}`);
			continue;
		}

		const existingHash = sha256(existing);
		if (existingHash === bundledHash) {
			newHashes[file.name] = bundledHash;
			unchanged.push(file.name);
			continue;
		}

		const previousBundledHash = previousHashes[file.name];
		const userHasLocalEdits =
			previousBundledHash !== undefined && existingHash !== previousBundledHash;

		if (userHasLocalEdits && !options.force) {
			skippedUserModified.push(file.name);
			output.appendLine(`[install] preserved user-modified ${file.name}`);
			continue;
		}

		await fs.writeFile(destPath, bundledContent, 'utf8');
		newHashes[file.name] = bundledHash;
		updated.push(file.name);
		output.appendLine(`[install] updated ${file.name}`);
	}

	await context.globalState.update(HASH_STATE_KEY, newHashes);
	await writeInstallRecord(context, targetDir, newHashes);

	if (options.force || installed.length > 0 || updated.length > 0 || skippedUserModified.length > 0) {
		const parts: string[] = [];
		if (installed.length) {
			parts.push(`${installed.length} installed`);
		}
		if (updated.length) {
			parts.push(`${updated.length} updated`);
		}
		if (skippedUserModified.length) {
			parts.push(`${skippedUserModified.length} preserved (locally edited)`);
		}
		if (unchanged.length && options.force) {
			parts.push(`${unchanged.length} unchanged`);
		}

		const summary = parts.length
			? `UI Test Agent: ${parts.join(', ')}.`
			: 'UI Test Agent: prompt files already up to date.';

		if (options.force) {
			const action = await vscode.window.showInformationMessage(summary, 'Open Prompts Folder');
			if (action === 'Open Prompts Folder') {
				await openPromptsFolder(context);
			}
		} else if (installed.length > 0 || updated.length > 0) {
			output.appendLine(summary);
		}
	}

	return { installed, updated, skippedUserModified, unchanged };
}

async function uninstallFiles(
	context: vscode.ExtensionContext,
	output: vscode.OutputChannel
): Promise<void> {
	const confirm = await vscode.window.showWarningMessage(
		'Remove all UI Test Agent prompt files from your VS Code prompts folder? Files you have locally modified will be preserved.',
		{ modal: true },
		'Remove'
	);
	if (confirm !== 'Remove') {
		return;
	}

	const targetDir = getUserPromptsDir(context);
	const previousHashes = context.globalState.get<InstalledHashes>(HASH_STATE_KEY, {});
	let removed = 0;
	let preserved = 0;

	for (const file of [...AGENT_FILES, ...PROMPT_FILES]) {
		const destPath = path.join(targetDir, file.name);
		const existing = await tryReadFile(destPath);
		if (existing === undefined) {
			continue;
		}
		const existingHash = sha256(existing);
		const trackedHash = previousHashes[file.name];
		if (trackedHash !== undefined && trackedHash !== existingHash) {
			preserved++;
			output.appendLine(`[uninstall] preserved user-modified ${file.name}`);
			continue;
		}
		try {
			await fs.unlink(destPath);
			removed++;
			output.appendLine(`[uninstall] removed ${file.name}`);
		} catch (err) {
			output.appendLine(`[uninstall] failed to remove ${file.name}: ${formatError(err)}`);
		}
	}

	await context.globalState.update(HASH_STATE_KEY, undefined);
	await deleteInstallRecord();

	vscode.window.showInformationMessage(
		`UI Test Agent: removed ${removed} file(s)${preserved ? `, preserved ${preserved} locally edited file(s)` : ''}.`
	);
}

async function openPromptsFolder(context: vscode.ExtensionContext): Promise<void> {
	const target = getUserPromptsDir(context);
	await fs.mkdir(target, { recursive: true });
	await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(target));
}

// ---------------------------------------------------------------------------
// Chrome DevTools MCP server
// ---------------------------------------------------------------------------

const MCP_PROVIDER_ID = 'uiTestAgent.chromeDevTools';
const MCP_SERVER_LABEL = 'UI Test Agent — Browser Engine';

let mcpProviderRegistered = false;
let mcpProviderError: string | undefined;
let mcpRefresh: vscode.EventEmitter<void> | undefined;

function registerMcpProvider(context: vscode.ExtensionContext, output: vscode.OutputChannel): void {
	const cfg = vscode.workspace.getConfiguration('uiTestAgent');
	if (!cfg.get<boolean>('enableChromeDevToolsMcp', true)) {
		output.appendLine('[mcp] disabled by setting uiTestAgent.enableChromeDevToolsMcp');
		return;
	}

	// `vscode.lm.registerMcpServerDefinitionProvider` and `vscode.McpStdioServerDefinition`
	// are stable APIs as of VS Code 1.101. If we are running on an older host they will
	// simply be undefined at runtime — guard once and bail clearly.
	const registerFn = (vscode.lm as unknown as { registerMcpServerDefinitionProvider?: Function })
		.registerMcpServerDefinitionProvider;
	const StdioCtor = (vscode as unknown as { McpStdioServerDefinition?: typeof vscode.McpStdioServerDefinition })
		.McpStdioServerDefinition;

	if (typeof registerFn !== 'function' || typeof StdioCtor !== 'function') {
		mcpProviderError =
			'vscode.lm.registerMcpServerDefinitionProvider is not available. ' +
			'Update to VS Code 1.101 or later for one-click MCP setup.';
		output.appendLine(`[mcp] ${mcpProviderError}`);
		return;
	}

	mcpRefresh = new vscode.EventEmitter<void>();
	context.subscriptions.push(mcpRefresh);

	const provider: vscode.McpServerDefinitionProvider = {
		onDidChangeMcpServerDefinitions: mcpRefresh.event,
		provideMcpServerDefinitions: () => {
			try {
				const cfg = vscode.workspace.getConfiguration('uiTestAgent');
				const versionTag = cfg.get<string>('chromeDevToolsMcpVersion', 'latest');
				const chromePath = (cfg.get<string>('chromeExecutablePath', '') || '').trim();
				const channel = (cfg.get<string>('chromeChannel', '') || '').trim();
				const pkgSpec = `chrome-devtools-mcp@${versionTag}`;
				// On Windows, npx is a .cmd shim; spawning the bare name without a shell fails.
				const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
				const args = ['-y', pkgSpec];
				if (chromePath) {
					args.push('--executablePath', chromePath);
				} else if (channel && channel !== 'auto') {
					args.push('--channel', channel);
				}
				const def = new vscode.McpStdioServerDefinition(MCP_SERVER_LABEL, command, args);
				def.version = `${versionTag}|${chromePath || channel || 'auto'}`;
				output.appendLine(
					`[mcp] provideMcpServerDefinitions -> ${command} ${args.join(' ')}`
				);
				return [def];
			} catch (err) {
				output.appendLine(`[mcp] provideMcpServerDefinitions failed: ${formatError(err)}`);
				return [];
			}
		},
		resolveMcpServerDefinition: (server) => server
	};

	try {
		const disposable = vscode.lm.registerMcpServerDefinitionProvider(MCP_PROVIDER_ID, provider);
		context.subscriptions.push(disposable);
		mcpProviderRegistered = true;
		output.appendLine(`[mcp] registered provider id="${MCP_PROVIDER_ID}"`);
	} catch (err) {
		mcpProviderError = formatError(err);
		output.appendLine(`[mcp] registration threw: ${mcpProviderError}`);
		return;
	}

	// Re-fire when any setting that affects the server definition changes.
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration((e) => {
			if (
				mcpRefresh &&
				(e.affectsConfiguration('uiTestAgent.chromeDevToolsMcpVersion') ||
					e.affectsConfiguration('uiTestAgent.chromeExecutablePath') ||
					e.affectsConfiguration('uiTestAgent.chromeChannel'))
			) {
				output.appendLine('[mcp] settings changed — firing onDidChangeMcpServerDefinitions');
				mcpRefresh.fire();
			}
		})
	);
}

async function showMcpStatus(output: vscode.OutputChannel): Promise<void> {
	const cfg = vscode.workspace.getConfiguration('uiTestAgent');
	const enabledSetting = cfg.get<boolean>('enableChromeDevToolsMcp', true);
	const versionTag = cfg.get<string>('chromeDevToolsMcpVersion', 'latest');
	const chromePath = (cfg.get<string>('chromeExecutablePath', '') || '').trim();
	const channel = (cfg.get<string>('chromeChannel', '') || '').trim();
	const env = await detectEnvironment();
	const launchArgs = ['-y', `chrome-devtools-mcp@${versionTag}`];
	if (chromePath) {
		launchArgs.push('--executablePath', chromePath);
	} else if (channel && channel !== 'auto') {
		launchArgs.push('--channel', channel);
	}
	const launchCommand = `${process.platform === 'win32' ? 'npx.cmd' : 'npx'} ${launchArgs.join(' ')}`;

	const lines: string[] = [
		`Provider id:        ${MCP_PROVIDER_ID}`,
		`Server label:       ${MCP_SERVER_LABEL}`,
		`Setting enabled:    ${enabledSetting}`,
		`Provider registered: ${mcpProviderRegistered}`,
		`Package:            chrome-devtools-mcp@${versionTag}`,
		`Chrome path setting: ${chromePath || '(auto-detect)'}`,
		`Chrome channel:     ${channel || '(default)'}`,
		`Launch command:     ${launchCommand}`,
		`VS Code version:    ${vscode.version}`,
		``,
		`-- Environment --`,
		`Node.js:            ${env.node.found ? env.node.version : 'NOT FOUND'}`,
		`npx:                ${env.npx.found ? env.npx.version : 'NOT FOUND'}`,
		`Chrome:             ${env.chrome.found ? env.chrome.path : 'NOT FOUND (will fall back to auto-downloaded Chromium on first run)'}`
	];
	if (mcpProviderError) {
		lines.push('', `Last MCP error:     ${mcpProviderError}`);
	}
	output.appendLine('--- UI Test Agent — Browser Engine status ---');
	for (const l of lines) {
		output.appendLine(l);
	}
	output.appendLine('--------------------------------');
	output.show(true);

	const headline = !env.node.found
		? 'Node.js was not found on PATH. The browser engine cannot start without it.'
		: !mcpProviderRegistered
			? `UI Test Agent’s browser engine is NOT registered. ${mcpProviderError ?? 'See the UI Test Agent output channel.'}`
			: !env.chrome.found
				? `Browser engine ready. Chrome was not detected — a portable Chromium build will be downloaded automatically on first run.`
				: `Browser engine ready. Chrome was detected. Open "MCP: List Servers" if you want to inspect runtime details.`;

	const choice = await vscode.window.showInformationMessage(
		headline,
		'List Browser Engine',
		'Show Output',
		'Open Settings'
	);
	if (choice === 'List Browser Engine') {
		await vscode.commands.executeCommand('workbench.mcp.listServer');
	} else if (choice === 'Show Output') {
		output.show(true);
	} else if (choice === 'Open Settings') {
		await vscode.commands.executeCommand('workbench.action.openSettings', 'uiTestAgent');
	}
}

// ---------------------------------------------------------------------------
// Welcome / first-run UX
// ---------------------------------------------------------------------------

function showFirstRunNotification(): void {
	const engineNote = mcpProviderRegistered
		? ' Built-in browser engine is ready.'
		: '';
	vscode.window
		.showInformationMessage(
			`UI Test Agent installed. The "UI Test" agent and 8 /ui-test-* prompts are ready in Copilot Chat.${engineNote} Requires an active GitHub Copilot subscription with Copilot Chat enabled.`,
			'Show Usage',
			'Browser Engine Status',
			'Open Prompts Folder'
		)
		.then((choice) => {
			if (choice === 'Show Usage') {
				vscode.commands.executeCommand('uiTestAgent.showWelcome');
			} else if (choice === 'Browser Engine Status') {
				vscode.commands.executeCommand('uiTestAgent.mcpStatus');
			} else if (choice === 'Open Prompts Folder') {
				vscode.commands.executeCommand('uiTestAgent.openPromptsFolder');
			}
		});
}

function showWelcome(): void {
	const panel = vscode.window.createWebviewPanel(
		'uiTestAgentWelcome',
		'UI Test Agent — Welcome',
		vscode.ViewColumn.Active,
		{ enableScripts: false }
	);
	panel.webview.html = welcomeHtml();
}

function welcomeHtml(): string {
	return /* html */ `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: var(--vscode-font-family); padding: 24px; max-width: 780px; line-height: 1.5; }
  h1 { font-size: 1.5em; }
  code, pre { background: var(--vscode-textCodeBlock-background); padding: 2px 6px; border-radius: 4px; }
  pre { padding: 12px; overflow-x: auto; }
  table { border-collapse: collapse; margin: 12px 0; }
  td, th { border: 1px solid var(--vscode-panel-border); padding: 6px 10px; text-align: left; }
  .pill { display: inline-block; padding: 2px 8px; border-radius: 10px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); font-size: 0.85em; }
  .note { border-left: 3px solid var(--vscode-textLink-foreground); padding: 10px 14px; margin: 14px 0; background: var(--vscode-textBlockQuote-background); }
</style>
</head>
<body>
<h1>UI Test Agent <span class="pill">ready</span></h1>
<p>Plain-English browser QA inside GitHub Copilot Chat. Smoke, accessibility, performance, console, link, and responsive checks across desktop, tablet, and mobile &mdash; with evidence-backed Markdown reports.</p>

<div class="note">
  <strong>Heads up:</strong> the agent runs on top of <strong>GitHub Copilot Chat in Agent Mode</strong>, so you need an active
  <a href="https://github.com/features/copilot">GitHub Copilot</a> subscription (Individual, Business, Enterprise, or a Free trial)
  with Copilot Chat installed and signed in. Without it, Copilot Chat is unavailable and the agent cannot run.
</div>

<h2>Try it now</h2>
<p>Open <strong>Copilot Chat</strong> (Agent Mode) and try one of these:</p>
<pre>@UI Test  Test https://example.com on desktop, mobile, tablet</pre>
<pre>/ui-test-smoke   url=https://example.com</pre>
<pre>/ui-test-a11y    url=https://example.com</pre>
<pre>/ui-test-perf    url=https://example.com  device=mobile</pre>
<pre>/ui-test-scaffold</pre>

<h2>What got installed</h2>
<table>
  <tr><th>Type</th><th>Files</th></tr>
  <tr><td>Agent</td><td><code>ui-test.agent.md</code></td></tr>
  <tr><td>Prompts</td><td><code>/ui-test-smoke</code>, <code>/ui-test-a11y</code>, <code>/ui-test-perf</code>, <code>/ui-test-console</code>, <code>/ui-test-links</code>, <code>/ui-test-responsive</code>, <code>/ui-test-scaffold</code>, <code>/ui-test-run</code></td></tr>
  <tr><td>Browser engine</td><td>Built-in &mdash; auto-configured. No setup required.</td></tr>
</table>

<h2>Requirements</h2>
<ul>
  <li><strong>GitHub Copilot subscription</strong> with <strong>Copilot Chat</strong> enabled and signed in. <em>Required.</em></li>
  <li>VS Code <strong>1.101+</strong>.</li>
  <li><strong>Node.js 18+</strong> on PATH. <em>Required.</em></li>
  <li><strong>Google Chrome / Chromium / Edge</strong> installed (auto-detected). <em>Optional</em> &mdash; if missing, a portable Chromium build is downloaded automatically on first use. You can also set <code>uiTestAgent.chromeExecutablePath</code> to point at a custom browser.</li>
</ul>

<h2>Commands</h2>
<ul>
  <li><code>UI Test Agent: Install / Update Prompt Files</code></li>
  <li><code>UI Test Agent: Open Prompts Folder</code></li>
  <li><code>UI Test Agent: Remove Installed Prompt Files</code></li>
  <li><code>UI Test Agent: Show Browser Engine Status</code></li>
  <li><code>UI Test Agent: Check Environment</code></li>
</ul>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Environment detection (Chrome + Node)
// ---------------------------------------------------------------------------

interface ToolStatus {
	found: boolean;
	version?: string;
	path?: string;
}

interface EnvStatus {
	node: ToolStatus;
	npx: ToolStatus;
	chrome: ToolStatus;
}

let cachedEnv: EnvStatus | undefined;

async function detectEnvironment(force = false): Promise<EnvStatus> {
	if (cachedEnv && !force) {
		return cachedEnv;
	}
	const [node, npx, chrome] = await Promise.all([
		detectVersion(process.platform === 'win32' ? 'node.exe' : 'node', ['--version']),
		detectVersion(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['--version']),
		detectChrome()
	]);
	cachedEnv = { node, npx, chrome };
	return cachedEnv;
}

async function detectVersion(cmd: string, args: string[]): Promise<ToolStatus> {
	try {
		const { stdout } = await execFileAsync(cmd, args, {
			timeout: 3000,
			windowsHide: true,
			shell: false
		});
		return { found: true, version: stdout.toString().trim() };
	} catch {
		return { found: false };
	}
}

async function detectChrome(): Promise<ToolStatus> {
	// 1. User-configured override wins.
	const cfgPath = (
		vscode.workspace.getConfiguration('uiTestAgent').get<string>('chromeExecutablePath', '') || ''
	).trim();
	if (cfgPath && existsSync(cfgPath)) {
		return { found: true, path: cfgPath };
	}

	// 2. Env var honored by Puppeteer / chrome-devtools-mcp.
	const envPath = process.env.PUPPETEER_EXECUTABLE_PATH;
	if (envPath && existsSync(envPath)) {
		return { found: true, path: envPath };
	}

	// 3. Platform-specific well-known install paths.
	const candidates = chromeCandidatePaths();
	for (const c of candidates) {
		if (c && existsSync(c)) {
			return { found: true, path: c };
		}
	}

	// 4. Linux: try `which` for chrome-like binaries.
	if (process.platform === 'linux') {
		for (const bin of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
			try {
				const { stdout } = await execFileAsync('which', [bin], {
					timeout: 1500,
					shell: false
				});
				const found = stdout.toString().trim();
				if (found) {
					return { found: true, path: found };
				}
			} catch {
				/* not on PATH */
			}
		}
	}

	return { found: false };
}

function chromeCandidatePaths(): string[] {
	if (process.platform === 'win32') {
		const pf = process.env['ProgramFiles'] || 'C:\\Program Files';
		const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
		const lad = process.env['LocalAppData'] || path.join(process.env['UserProfile'] || 'C:\\', 'AppData\\Local');
		return [
			path.join(pf, 'Google\\Chrome\\Application\\chrome.exe'),
			path.join(pf86, 'Google\\Chrome\\Application\\chrome.exe'),
			path.join(lad, 'Google\\Chrome\\Application\\chrome.exe'),
			path.join(pf, 'Google\\Chrome Beta\\Application\\chrome.exe'),
			path.join(pf, 'Google\\Chrome Dev\\Application\\chrome.exe'),
			path.join(lad, 'Google\\Chrome SxS\\Application\\chrome.exe') // Canary
		];
	}
	if (process.platform === 'darwin') {
		return [
			'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
			'/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta',
			'/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
			'/Applications/Chromium.app/Contents/MacOS/Chromium'
		];
	}
	// Linux fixed-path fallbacks (in addition to `which` lookup above).
	return [
		'/usr/bin/google-chrome',
		'/usr/bin/google-chrome-stable',
		'/usr/bin/chromium',
		'/usr/bin/chromium-browser',
		'/snap/bin/chromium'
	];
}

async function runEnvironmentProbe(
	context: vscode.ExtensionContext,
	output: vscode.OutputChannel
): Promise<void> {
	let env: EnvStatus;
	try {
		env = await detectEnvironment(true);
	} catch (err) {
		output.appendLine(`[env] probe failed: ${formatError(err)}`);
		return;
	}
	output.appendLine(
		`[env] node=${env.node.found ? env.node.version : 'missing'} ` +
			`npx=${env.npx.found ? env.npx.version : 'missing'} ` +
			`chrome=${env.chrome.found ? env.chrome.path : 'missing'}`
	);

	if (env.node.found && env.npx.found && env.chrome.found) {
		return;
	}
	if (context.globalState.get<boolean>(ENV_WARN_KEY)) {
		return; // user already dismissed
	}

	const issues: string[] = [];
	if (!env.node.found) {
		issues.push('Node.js');
	}
	if (!env.npx.found && env.node.found) {
		issues.push('npx');
	}
	if (!env.chrome.found) {
		issues.push('Chrome');
	}

	const isFatal = !env.node.found || !env.npx.found;
	const message = isFatal
		? `UI Test Agent: ${issues.join(' and ')} not found on PATH. The agent’s browser engine cannot start without Node.js and npx.`
		: `UI Test Agent: Chrome was not detected. A portable Chromium build will be downloaded automatically on first use, or you can install Chrome / set a path in settings.`;

	const installChromeAction = 'Install Chrome';
	const installNodeAction = 'Install Node.js';
	const settingsAction = 'Set Chrome Path';
	const detailsAction = 'Show Details';
	const dismissAction = "Don't show again";

	const buttons: string[] = [];
	if (!env.node.found) {
		buttons.push(installNodeAction);
	}
	if (!env.chrome.found) {
		buttons.push(installChromeAction, settingsAction);
	}
	buttons.push(detailsAction, dismissAction);

	const fn = isFatal ? vscode.window.showWarningMessage : vscode.window.showInformationMessage;
	const choice = await fn(message, ...buttons);

	switch (choice) {
		case installChromeAction:
			await vscode.env.openExternal(vscode.Uri.parse('https://www.google.com/chrome/'));
			break;
		case installNodeAction:
			await vscode.env.openExternal(vscode.Uri.parse('https://nodejs.org/en/download'));
			break;
		case settingsAction:
			await vscode.commands.executeCommand(
				'workbench.action.openSettings',
				'uiTestAgent.chromeExecutablePath'
			);
			break;
		case detailsAction:
			await vscode.commands.executeCommand('uiTestAgent.checkEnvironment');
			break;
		case dismissAction:
			await context.globalState.update(ENV_WARN_KEY, true);
			break;
	}
}

async function checkEnvironmentCommand(output: vscode.OutputChannel): Promise<void> {
	cachedEnv = undefined; // force refresh
	await showMcpStatus(output);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sha256(content: string): string {
	return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

async function tryReadFile(p: string): Promise<string | undefined> {
	try {
		return await fs.readFile(p, 'utf8');
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
			return undefined;
		}
		throw err;
	}
}

function formatError(err: unknown): string {
	if (err instanceof Error) {
		return err.message;
	}
	return String(err);
}
