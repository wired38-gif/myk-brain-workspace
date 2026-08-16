# AGENTS.md

## Never open Mixpanel

Do **not** open Mixpanel. This workspace has no Mixpanel integration.

- Do not visit `mixpanel.com`, `*.mixpanel.com`, `mxpnl.com`, or any Mixpanel dashboard.
- Do not use computerUse, Chrome, `open`, `xdg-open`, or `/api/open` to launch Mixpanel.
- Do not treat Mixpanel as a test target, analytics check, or login step.
- If a browser is already on Mixpanel, close that tab and stay on the local app (`http://localhost:3000`) or use `curl`.

`/api/open` rejects Mixpanel URLs. Server startup does not auto-open a browser in cloud, CI, Linux, or when `SKIP_BROWSER_OPEN=1`.

## Cursor Cloud specific instructions

### What this repo contains
- **Root workspace server (primary product)** — `myk-brain-workspace`. A Node.js HTTP server (`server.js`) that serves the `index.html` dashboard and helper endpoints (`/api/status`, `/api/proxy`, `/api/open`, `/api/terminal`). Run it from the repo root.
- **`myks-app/`** — AskMyk session/host-gate library plus helper scripts. Run standalone scripts with `node`; there is no `package.json` inside this folder.
- **`Myks-Brain-main/`** — Android / AI-Studio app. Not runnable in this headless cloud VM.

### Running / building / testing
- **Run the main server:** `SKIP_BROWSER_OPEN=1 node server.js` (or `npm start`) from the repo root → `http://localhost:3000`. Verify with `curl -s localhost:3000/api/status`.
- **Tests:** `node myks-app/scripts/test-session-export.js` and `node admin/test-open-guard.js`.
- **Lint:** no linter/formatter is configured.

### Gotchas
- **Do not run `setup.sh`** in the cloud. It is a macOS-only initializer that overwrites `server.js` / `package.json` / `.env`.
- Frontend assets (Tailwind, Lucide) load from CDNs. Backend AI features need provider keys in `.env`; the dashboard still loads without them.
- Manual UI testing should use the local dashboard only. Never open Mixpanel or other third-party analytics consoles.
