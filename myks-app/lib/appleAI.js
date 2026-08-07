/**
 * Apple Intelligence (on-device Foundation Model) provider
 * for the AskMyk.io backend.
 *
 * Requires: apfel — a local OpenAI-compatible wrapper for Apple's
 * on-device Foundation Model (macOS 26 / iOS 26+).
 * https://github.com/yourusername/apfel  (or equivalent local runner)
 *
 * By default apfel listens on http://localhost:11435/v1
 * Override with env var:  APPLE_AI_URL=http://localhost:11435/v1
 *
 * ─── DROP-IN USAGE ────────────────────────────────────────────────────────────
 *
 * 1. Copy this file to your AskMyk.io server:
 *      cp lib/appleAI.js ~/Projects/myks-app/lib/appleAI.js
 *
 * 2. In your main server file, require it near the other provider helpers:
 *      const { checkAppleAI, chatWithAppleAI } = require('./lib/appleAI');
 *
 * 3. Add Apple AI to the /api/askmyk/chat handler (see integration snippet
 *    at the bottom of this file for the exact diff).
 *
 * 4. Optionally expose availability on /api/status:
 *      const appleStatus = await checkAppleAI();
 *      res.json({ ..., appleAI: appleStatus });
 */

'use strict';

const APPLE_AI_BASE_URL = (process.env.APPLE_AI_URL || 'http://localhost:11435/v1')
  .replace(/\/v1$/, '');

// ─── Health check ─────────────────────────────────────────────────────────────

/**
 * Returns availability and metadata for the local Apple Foundation Model.
 * Never throws — always returns a safe object.
 *
 * @returns {Promise<{ available: boolean, modelId: string, contextWindow?: number }>}
 */
async function checkAppleAI() {
  try {
    const resp = await fetch(`${APPLE_AI_BASE_URL}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!resp.ok) return { available: false, modelId: 'apple-foundationmodel' };
    const data = await resp.json();
    return {
      available: data.modelAvailable !== false,
      modelId: data.model || 'apple-foundationmodel',
      contextWindow: data.contextWindow,
    };
  } catch {
    return { available: false, modelId: 'apple-foundationmodel' };
  }
}

// ─── Chat completion ──────────────────────────────────────────────────────────

/**
 * Send a chat request to Apple's on-device Foundation Model via apfel.
 *
 * @param {string} systemPrompt
 * @param {Array<{ role: 'user'|'assistant', content: string }>} messages
 * @param {object} [opts]
 * @param {number}  [opts.maxTokens=1024]
 * @param {boolean} [opts.stream=false]     Streaming not yet wired up — kept false.
 * @returns {Promise<string>}               The assistant reply text.
 */
async function chatWithAppleAI(systemPrompt, messages, opts = {}) {
  const { maxTokens = 1024 } = opts;
  const resp = await fetch(`${APPLE_AI_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'apple-foundationmodel',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      stream: false,
      max_tokens: maxTokens,
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Apple AI error ${resp.status}${errText ? ': ' + errText : ''}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? '';
}

module.exports = { checkAppleAI, chatWithAppleAI, APPLE_AI_BASE_URL };
