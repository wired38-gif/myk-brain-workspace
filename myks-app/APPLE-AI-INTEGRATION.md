# Apple Intelligence — AskMyk.io Integration Guide
# ===================================================
# Apply to: ~/Projects/myks-app/server.js (or wherever /api/askmyk/chat lives)
# Requires: lib/appleAI.js (copy from myk-brain-workspace/myks-app/lib/appleAI.js)

## Step 1 — Add the require at the top of your server file
# Near where you require other providers (Ollama, OpenAI, etc.), add:

```js
const { checkAppleAI, chatWithAppleAI } = require('./lib/appleAI');
```

---

## Step 2 — Add to your /api/status or /api/health endpoint (optional but useful)
# So the dashboard shows whether Apple AI is available right now.

```js
// Inside your status handler, alongside other provider checks:
const appleStatus = await checkAppleAI();
res.json({
  // ...your existing fields...
  appleAI: {
    available: appleStatus.available,
    modelId:   appleStatus.modelId,
    contextWindow: appleStatus.contextWindow ?? null,
    url: process.env.APPLE_AI_URL || 'http://localhost:11435/v1',
  },
});
```

---

## Step 3 — Add Apple AI as a provider in /api/askmyk/chat
# The exact shape depends on how your chat handler selects providers.
# Two common patterns are shown below.

### Pattern A — if your handler uses an if/else chain keyed on `model` or `provider`:

```js
// ADD this block alongside the existing chatWithOllama / chatWithOpenAI blocks:
} else if (provider === 'apple' || model === 'apple-foundationmodel') {
  const appleStatus = await checkAppleAI();
  if (!appleStatus.available) {
    return res.status(503).json({
      error: 'Apple Intelligence is not available on this device.',
      hint: 'Requires macOS 26 / iOS 26+ and apfel running on localhost:11435.',
    });
  }
  reply = await chatWithAppleAI(systemPrompt, messages);
```

### Pattern B — if your handler uses a providers map / switch:

```js
// ADD to your providers map:
const PROVIDERS = {
  // ...existing entries...
  apple: {
    id: 'apple',
    name: 'Apple Intelligence',
    emoji: '🍎',
    check: checkAppleAI,
    chat: (system, msgs) => chatWithAppleAI(system, msgs),
  },
};

// ADD to the switch / dispatch in your chat handler:
case 'apple': {
  const status = await checkAppleAI();
  if (!status.available) {
    return res.status(503).json({ error: 'Apple AI unavailable — is apfel running?' });
  }
  reply = await chatWithAppleAI(systemPrompt, messages);
  break;
}
```

---

## Step 4 — Environment variable (optional)
# Add to your .env if apfel runs on a non-default port:

```
APPLE_AI_URL=http://localhost:11435/v1
```

---

## Step 5 — Quick local test (no UI needed)

```bash
# Make sure apfel is running, then:
curl -s http://localhost:11435/health | python3 -m json.tool

# Test the chat endpoint directly:
curl -s -X POST http://localhost:3000/api/askmyk/chat \
  -H "Content-Type: application/json" \
  -d '{"provider":"apple","messages":[{"role":"user","content":"Say hello from Apple Intelligence!"}]}' \
  | python3 -m json.tool
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Apple AI unavailable` | apfel not running | Run apfel: `apfel serve` or check its README |
| `Apple AI error 503` | apfel running, model not loaded | Needs macOS 26 / device with on-device AI |
| `fetch failed` timeout | Wrong port | Set `APPLE_AI_URL` env var |
| Works locally, not in tunnel | apfel not bound to 0.0.0.0 | Use `APPLE_AI_URL=http://127.0.0.1:11435/v1` |
