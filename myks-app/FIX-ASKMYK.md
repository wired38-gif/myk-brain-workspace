# AskMyk.io fix: `resolveSessionFromRequest is not a function`

## Symptom

```
TypeError: resolveSessionFromRequest is not a function
    at isGatewayOwner (.../lib/consumerHostGate.js:86:21)
```

Every public page on https://askmyk.io returns HTTP 500. `/api/*` routes may still return 401 because they are registered before the broken middleware.

## Root cause

`lib/consumerHostGate.js` imports `resolveSessionFromRequest` as a **named export**:

```js
const { resolveSessionFromRequest } = require('./session');
```

…but `lib/session.js` either:

1. Does not export that name (e.g. only exports `getSessionFromRequest`), or
2. Uses `module.exports = fn` (default export) while the gate destructures a named property.

Destructuring a missing named export yields `undefined`, which triggers exactly this TypeError when called.

## Fastest local fix (on your Mac)

From `~/Projects/myks-app`:

```bash
cp -v lib/session.js lib/session.js.bak
cp -v lib/consumerHostGate.js lib/consumerHostGate.js.bak

# Copy the fixed modules from this repo:
cp -v /path/to/myk-brain-workspace/myks-app/lib/sessionFromRequest.js lib/
cp -v /path/to/myk-brain-workspace/myks-app/lib/session.js lib/
cp -v /path/to/myk-brain-workspace/myks-app/lib/consumerHostGate.js lib/

# Restart the gateway process (adjust for your launchd/pm2 script)
pkill -f "node.*myks-app" || true
npm start
```

## One-line patch (if you only want to alias an existing function)

If `lib/session.js` already has the logic under another name, add at the bottom:

```js
const getSessionFromRequest = module.exports.getSessionFromRequest || module.exports.parseSession;
module.exports.resolveSessionFromRequest =
  module.exports.resolveSessionFromRequest || getSessionFromRequest;
```

Or fix the import in `consumerHostGate.js`:

```js
// Before (broken when session.js uses default export):
const { resolveSessionFromRequest } = require('./session');

// After:
const resolveSessionFromRequest = require('./session').resolveSessionFromRequest
  || require('./session');
```

## Recover from interrupted restart

If restart was interrupted, askmyk.io often shows **Cloudflare 530** (origin down) instead of the old 500 stack trace.

On your Mac:

```bash
cd ~/Projects/myks-app
bash scripts/restart-gateway.sh
```

Manual recovery if the script is not present yet:

```bash
cd ~/Projects/myks-app

# Stop anything half-dead from the interrupted restart
pkill -f "node.*myks-app" || true
pkill -f "cloudflared.*tunnel" || true
sleep 1

# Start gateway
npm start > /tmp/myks-app-gateway.log 2>&1 &

# Start tunnel (use your normal command — examples):
# cloudflared tunnel run --token YOUR_TOKEN
# npm run tunnel

# Verify locally first
curl -sI http://127.0.0.1:3000/api/status | head -1
curl -sI https://askmyk.io/ask | head -1
```

If local health works but askmyk.io is still 530, the **tunnel URL rotated** — update Cloudflare / GoDaddy `BRAIN_PROXY_TARGET` and restart cloudflared.

## Verify

```bash
node myks-app/scripts/test-session-export.js
curl -sI https://askmyk.io/ask | head -1    # expect 200, not 500/530
curl -s https://askmyk.io/api/status          # expect 401 JSON, not HTML stack trace
```

## Environment

Ensure the Mac gateway has at least one of:

| Variable | Purpose |
|----------|---------|
| `AUTH_SECRET` or `ADMIN_PASSWORD` | Signs `myk_io_session` owner cookies |
| `REMOTE_ACCESS_TOKEN` | Bearer / `?token=` for Cloudflare tunnel consumers |
