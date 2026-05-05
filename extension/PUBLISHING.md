# Publishing the UI Test Agent extension

This guide takes you from the built `.vsix` to a public listing on the **Visual Studio Marketplace** under the publisher `BipulRaman`.

---

## 1. One-time setup

### 1.1 Create an Azure DevOps organization
You need a (free) Azure DevOps organization to host the Personal Access Token used by `vsce`.

1. Sign in at <https://dev.azure.com/> with the same Microsoft account you'll use as the publisher.
2. Create a personal organization if you don't already have one (any name).

### 1.2 Generate a Personal Access Token (PAT)

1. In Azure DevOps, click your profile → **Personal access tokens** → **New Token**.
2. Settings:
   - **Organization**: `All accessible organizations` (required by vsce).
   - **Expiration**: up to 1 year.
   - **Scopes**: click **Show all scopes** → check **Marketplace → Manage**.
3. **Copy the token now** — you can't view it again.

### 1.3 Create the Marketplace publisher

1. Go to <https://marketplace.visualstudio.com/manage>.
2. Click **Create publisher**.
3. **Publisher ID**: `BipulRaman` (must match `package.json` → `publisher`).
4. **Display name**: e.g. `Bipul Raman`.
5. Save.

### 1.4 Log `vsce` in (one-time per machine)

```powershell
cd d:\GitHub\UI-Test-Agent\extension
npx @vscode/vsce login BipulRaman
# paste the PAT when prompted
```

---

## 2. Publish

### Option A — single command publish (builds + uploads)
```powershell
cd d:\GitHub\UI-Test-Agent\extension
npm run publish
```

### Option B — upload the prebuilt .vsix
```powershell
cd d:\GitHub\UI-Test-Agent\extension
npx @vscode/vsce publish --packagePath ui-test-agent-0.1.0.vsix
```

### Option C — manual upload via the web
1. Go to <https://marketplace.visualstudio.com/manage>.
2. Click your publisher → **New extension** → **Visual Studio Code**.
3. Upload `ui-test-agent-0.1.0.vsix`.

The listing usually goes live within a minute and is available at:
`https://marketplace.visualstudio.com/items?itemName=BipulRaman.ui-test-agent`

---

## 3. Bumping versions

Update the version in `package.json` (or use `vsce`'s helpers):

```powershell
# patch / minor / major bump + publish in one step
npx @vscode/vsce publish patch
npx @vscode/vsce publish minor
npx @vscode/vsce publish major
```

Each publish must have a higher version than the last. Add an entry to `CHANGELOG.md` as well.

---

## 4. Sideload the .vsix locally (no Marketplace required)

Anyone can install the built `.vsix` without going through the Marketplace:

```powershell
code --install-extension d:\GitHub\UI-Test-Agent\extension\ui-test-agent-0.1.0.vsix
```

Or in VS Code: **Extensions** view → `…` menu → **Install from VSIX…**.

---

## 5. Pre-publish checklist

- [ ] `package.json` → `publisher` matches the Marketplace publisher ID exactly.
- [ ] `package.json` → `version` is bumped from the last published version.
- [ ] `CHANGELOG.md` has an entry for this version.
- [ ] `repository.url` and `homepage` point to a real GitHub repo (recommended for the Marketplace listing).
- [ ] `media/icon.png` looks acceptable at 128×128.
- [ ] Test the `.vsix` locally first via `code --install-extension`.

---

## 6. Troubleshooting

| Problem | Fix |
|---|---|
| `ERROR Personal Access Token verification failed` | Re-create the PAT, ensure scope is **Marketplace → Manage** and org is **All accessible organizations**. |
| `ERROR Make sure to edit the README.md file before you package or publish your extension.` | Edit `README.md` to remove placeholder text. |
| `ERROR The publisher 'X' does not exist` | Create the publisher at <https://marketplace.visualstudio.com/manage> first. |
| Marketplace badge missing icon | `media/icon.png` must be 128×128 PNG and referenced from `package.json` → `icon`. |
| `chrome-devtools-mcp` won't start for users | Ensure they have Node.js + Chrome installed. The extension launches it via `npx -y chrome-devtools-mcp@latest`. |
