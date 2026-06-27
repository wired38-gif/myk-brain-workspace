# AGENTS.md

## Cursor Cloud specific instructions

### What this repo contains
- **Root workspace server (primary product)** — `myk-brain-workspace`. A zero-dependency Node.js HTTP server (`server.js`) that serves the `index.html` "MYK's Brain – Multi-Supplier Neural Workspace" dashboard and exposes helper endpoints (`/api/status`, `/api/proxy`, `/api/open`, `/api/terminal`). Run it from the repo root.
- **`myks-app/`** — the AskMyk gateway session/host-gate library (`lib/*.js`) plus helper scripts. There is no `package.json` here in this repo (it lives in the author's separate `myks-app` repo), so `npm start` inside it will not work here; only run its standalone scripts directly with `node`.
- **`Myks-Brain-main/`** — an Android / AI-Studio app (Gradle: `build.gradle.kts`, `app/src`) that needs Android Studio + the Android SDK. It is **not runnable in this headless cloud VM**. It also contains its own duplicate `server.js`/`index.html` copy of the desktop web app.

### Running / building / testing
- **Run the main server:** `node server.js` (or `npm start` / `npm run dev`) from the repo root → listens on `http://localhost:3000` (override with `PORT`). Verify with `curl -s localhost:3000/api/status` (returns connected JSON) and load `/` for the dashboard.
- **Tests:** there is no test framework. The one runnable check is the session-export assertion script: `node myks-app/scripts/test-session-export.js` (prints `OK: ...` on success).
- **Lint:** no linter/formatter is configured (no ESLint/Prettier config).

### Gotchas
- `server.js` calls `open http://localhost:3000` on startup. On Linux this silently no-ops (wrapped in try/catch) — it is harmless and does not indicate an error.
- **Do not run `setup.sh`** in the cloud. It is a macOS-only initializer (Homebrew, `xcode-select`) that *overwrites* `server.js`/`package.json`/`.env` and re-downloads `index.html` from an external Cloud Run URL. The repo is already fully set up; just run `node server.js`.
- The app has no install step — there are **zero npm dependencies**. Node is preinstalled. Frontend assets (Tailwind, Lucide) load from CDNs, so the UI needs outbound network access to render styled.
- Backend AI features need provider API keys (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, etc., read from a `.env` file at the root). Without them the dashboard UI still loads and is interactive; only live model calls fail.
