# UI Test Agent — Website

A static landing page for the [UI Test Agent](https://marketplace.visualstudio.com/items?itemName=BipulRaman.ui-test-agent) VS Code extension.

- **No build step.** Plain HTML, CSS, and a small vanilla JS file.
- **No dependencies.** Open `index.html` in a browser and it works.
- **Responsive + dark mode.** Honors `prefers-color-scheme` and remembers the user's choice.
- **Accessible.** Skip link, keyboard-friendly nav, focus rings, reduced-motion support.

## Layout

```
web/
├── index.html     # the page
├── styles.css     # all styles (light + dark themes via [data-theme])
├── script.js      # theme toggle, mobile nav, code tabs, copy buttons
├── assets/
│   └── favicon.svg
└── README.md      # this file
```

## Run locally

Any static file server works. Pick one:

```powershell
# Node
npx serve .

# Python 3
python -m http.server 8080

# PHP
php -S localhost:8080
```

Then visit <http://localhost:8080>.

> Opening `index.html` directly via `file://` also works, but a real HTTP server gives you proper `localStorage`, `clipboard`, and `prefers-color-scheme` behavior.

## Deploy

The site is fully static — drop the `web/` folder onto any of the following:

### GitHub Pages
1. Push the repo to GitHub.
2. In **Settings → Pages**, set the source to the `main` branch and the folder to `/web`.
3. Pages will publish at `https://<user>.github.io/<repo>/`.

### Azure Static Web Apps (Free tier)
```powershell
# from repo root, with the SWA CLI:
swa deploy ./web --app-name ui-test-agent --env production
```
Or use the GitHub Action — set `app_location: "web"` and leave `api_location` and `output_location` empty.

### Netlify / Vercel / Cloudflare Pages
- **Build command:** *(none)*
- **Publish / output directory:** `web`

## Editing tips

- **Colors / spacing:** all design tokens live at the top of [styles.css](styles.css) under `:root` and `[data-theme="dark"]`.
- **Copy:** all marketing text lives in [index.html](index.html). Search for the section heading you want to change.
- **New section:** copy any existing `<section class="section">…</section>` block and swap in your content. Add a matching nav link in the `<nav class="primary-nav">`.

## License

MIT — same as the parent project.
