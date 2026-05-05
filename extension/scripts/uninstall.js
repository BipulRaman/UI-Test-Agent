/*
 * UI Test Agent — uninstall hook
 * -----------------------------------------------------------------------------
 * Invoked by VS Code via `package.json` -> `scripts."vscode:uninstall"`.
 * Runs as a plain Node.js script (NO `vscode` API access) at the first VS Code
 * startup AFTER the user uninstalls this extension.
 *
 * Responsibilities:
 *  1. Locate the install record written by extension.ts at install time
 *     (`~/.ui-test-agent/install-record.json`).
 *  2. For each file the extension installed into the user `prompts/` folder,
 *     delete it ONLY if the file's current sha256 still matches what we wrote.
 *     Files the user has locally modified are preserved.
 *  3. Delete the install record and its parent directory if empty.
 *  4. Best-effort wipe of the npx cache for `chrome-devtools-mcp` so the
 *     ~30-50 MB of cached package + deps doesn't linger on disk. The npm
 *     cache is shared, but each `npx -y <pkg>` install lives in its own
 *     hashed subdirectory of `~/.npm/_npx/`, so we only delete the ones
 *     that actually contain `node_modules/chrome-devtools-mcp`.
 *
 * Hard rules:
 *  - Never throw. The extension is being removed; failures here must be silent
 *    (best-effort cleanup) so they don't block VS Code startup.
 *  - No external dependencies. Only Node built-ins.
 *  - Idempotent. Safe to run multiple times.
 *
 * Keep the install-record path in sync with `getInstallRecordPath()` in
 * `src/extension.ts`.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

function recordPath() {
	return path.join(os.homedir(), '.ui-test-agent', 'install-record.json');
}

function sha256(content) {
	return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

function safeReadJson(p) {
	try {
		const raw = fs.readFileSync(p, 'utf8');
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

function safeUnlink(p) {
	try {
		fs.unlinkSync(p);
		return true;
	} catch {
		return false;
	}
}

function safeRmdirIfEmpty(p) {
	try {
		fs.rmdirSync(p);
	} catch {
		/* not empty or already gone */
	}
}

function safeRmrf(p) {
	try {
		fs.rmSync(p, { recursive: true, force: true, maxRetries: 3 });
		return true;
	} catch {
		return false;
	}
}

/**
 * Walk the npx cache directory and delete every subfolder that contains
 * `node_modules/chrome-devtools-mcp`. Returns the number of cache entries
 * removed.
 *
 * The npx cache layout (npm 7+) is:
 *   ~/.npm/_npx/<sha-hash>/node_modules/<pkg>
 * On Windows it's typically %USERPROFILE%\AppData\Roaming\npm-cache\_npx\...
 * but `~/.npm/_npx` is also honored when present, and many users have it
 * via WSL / cross-platform tooling. We try both.
 */
function cleanNpxCacheForChromeDevtoolsMcp() {
	const home = os.homedir();
	const candidates = [
		path.join(home, '.npm', '_npx'),
		path.join(home, 'AppData', 'Roaming', 'npm-cache', '_npx'), // Windows default
		path.join(home, 'AppData', 'Local', 'npm-cache', '_npx'),
	];

	let removed = 0;
	for (const cacheDir of candidates) {
		let entries;
		try {
			entries = fs.readdirSync(cacheDir, { withFileTypes: true });
		} catch {
			continue; // cache dir doesn't exist on this machine
		}

		for (const entry of entries) {
			if (!entry.isDirectory()) {
				continue;
			}
			const entryPath = path.join(cacheDir, entry.name);
			const marker = path.join(entryPath, 'node_modules', 'chrome-devtools-mcp');
			let hit = false;
			try {
				hit = fs.statSync(marker).isDirectory();
			} catch {
				hit = false;
			}
			if (hit && safeRmrf(entryPath)) {
				removed++;
			}
		}
	}
	return removed;
}

function main() {
	const rec = safeReadJson(recordPath());
	if (!rec || rec.version !== 1 || !rec.promptsDir || !Array.isArray(rec.files)) {
		// No record => nothing prompt-file related to clean. (Either never installed
		// via this version, already uninstalled, or the record was manually removed.)
		// Still attempt the npx cache wipe before bailing out.
		safeUnlink(recordPath());
		safeRmdirIfEmpty(path.dirname(recordPath()));
		try {
			cleanNpxCacheForChromeDevtoolsMcp();
		} catch {
			/* ignore */
		}
		return;
	}

	let removed = 0;
	let preserved = 0;
	for (const f of rec.files) {
		if (!f || typeof f.name !== 'string' || typeof f.sha256 !== 'string') {
			continue;
		}
		const target = path.join(rec.promptsDir, f.name);
		let current;
		try {
			current = fs.readFileSync(target, 'utf8');
		} catch {
			continue; // file already gone
		}
		if (sha256(current) === f.sha256) {
			if (safeUnlink(target)) {
				removed++;
			}
		} else {
			preserved++;
		}
	}

	// Best-effort: drop the marker file and its parent directory.
	safeUnlink(recordPath());
	safeRmdirIfEmpty(path.dirname(recordPath()));

	// Best-effort: drop any cached chrome-devtools-mcp npx installs.
	// Safe — `npx` will simply re-download on next use if anything still needs it.
	let mcpCacheRemoved = 0;
	try {
		mcpCacheRemoved = cleanNpxCacheForChromeDevtoolsMcp();
	} catch {
		/* ignore — never block uninstall */
	}

	// Print to stdout for any user inspecting the VS Code logs.
	try {
		// eslint-disable-next-line no-console
		console.log(
			`[ui-test-agent] uninstall cleanup: removed ${removed} file(s), preserved ${preserved} locally modified file(s), purged ${mcpCacheRemoved} chrome-devtools-mcp npx cache entr${mcpCacheRemoved === 1 ? 'y' : 'ies'}.`
		);
	} catch {
		/* ignore */
	}
}

try {
	main();
} catch {
	/* swallow — must never block VS Code startup */
}
