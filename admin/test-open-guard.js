#!/usr/bin/env node
'use strict';

const assert = require('assert');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const {
  isBlockedOpenUrl,
  isBrowserApp,
  isBlockedOpenCommand,
  isBlockedOpenRequest,
  shouldSkipBrowserOpen,
} = require('./openGuard');

assert.strictEqual(isBlockedOpenUrl('https://mixpanel.com'), true);
assert.strictEqual(isBlockedOpenUrl('https://eu.mixpanel.com/report/1'), true);
assert.strictEqual(isBlockedOpenUrl('http://mixpanel.com'), true);
assert.strictEqual(isBlockedOpenUrl('mixpanel.com/project'), true);
assert.strictEqual(isBlockedOpenUrl('https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js'), true);
assert.strictEqual(isBlockedOpenUrl('https://www.mixpanel.org'), true);
assert.strictEqual(isBlockedOpenUrl('http://localhost:3000'), false);
assert.strictEqual(isBlockedOpenUrl('https://queenscustoms.shop/admin/'), false);
assert.strictEqual(isBlockedOpenUrl(''), false);
assert.strictEqual(isBlockedOpenUrl(undefined), false);

assert.strictEqual(isBrowserApp('chrome'), true);
assert.strictEqual(isBrowserApp('Google Chrome'), true);
assert.strictEqual(isBrowserApp('Safari'), true);
assert.strictEqual(isBrowserApp('terminal'), false);

assert.strictEqual(isBlockedOpenCommand('open https://mixpanel.com'), true);
assert.strictEqual(isBlockedOpenCommand('open -a "Google Chrome" http://localhost:3000'), true);
assert.strictEqual(isBlockedOpenCommand('open http://localhost:3000'), true);
assert.strictEqual(isBlockedOpenCommand('git status'), false);

assert.strictEqual(isBlockedOpenRequest({ app: 'chrome', url: 'http://localhost:3000' }), true);
assert.strictEqual(isBlockedOpenRequest({ app: 'terminal' }), false);

assert.strictEqual(shouldSkipBrowserOpen(), true);
assert.strictEqual(shouldSkipBrowserOpen({ SKIP_BROWSER_OPEN: '1' }, 'darwin'), true);
assert.strictEqual(shouldSkipBrowserOpen({}, 'darwin'), true);

function postJson(port, route, payload) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: route,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(body) });
          } catch (err) {
            reject(err);
          }
        });
      }
    );
    req.on('error', reject);
    req.end(JSON.stringify(payload));
  });
}

async function waitForStatus(port, attempts = 40) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const ok = await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${port}/api/status`, (res) => {
          res.resume();
          resolve(res.statusCode === 200);
        });
        req.on('error', reject);
      });
      if (ok) return;
    } catch {
      // server still starting
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Server did not become ready');
}

async function runServerCheck() {
  const port = 34521;
  const child = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    env: {
      ...process.env,
      PORT: String(port),
      ADMIN_SEED_EMAIL: 'mixpanel-guard-test@myk.ac',
      ADMIN_SEED_PASSWORD: 'test-password-not-used',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
  child.stderr.on('data', (chunk) => { stdout += chunk.toString(); });

  try {
    await waitForStatus(port);
    assert.match(stdout, /Browser auto-open disabled/);
    assert.doesNotMatch(stdout, /open http:\/\/localhost/);

    const mixpanel = await postJson(port, '/api/open', {
      app: 'terminal',
      url: 'https://mixpanel.com/project/demo',
    });
    assert.strictEqual(mixpanel.status, 403);
    assert.strictEqual(mixpanel.body.success, false);
    assert.match(mixpanel.body.error, /Mixpanel|browser/i);

    const chrome = await postJson(port, '/api/open', {
      app: 'chrome',
      url: 'http://localhost:34521',
    });
    assert.strictEqual(chrome.status, 403);

    const chromeNamed = await postJson(port, '/api/open', {
      app: 'Google Chrome',
      url: 'http://localhost:34521',
    });
    assert.strictEqual(chromeNamed.status, 403);

    const terminalMixpanel = await postJson(port, '/api/terminal', {
      command: 'open https://mixpanel.com',
    });
    assert.strictEqual(terminalMixpanel.status, 403);

    const openLocal = await postJson(port, '/api/terminal', {
      command: 'open http://localhost:34521',
    });
    assert.strictEqual(openLocal.status, 403);

    console.log('OK: Mixpanel/Chrome open paths are blocked and browser auto-open is disabled');
  } finally {
    child.kill('SIGTERM');
    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        resolve();
      }, 2000);
      child.on('exit', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
}

runServerCheck().catch((err) => {
  console.error(err);
  process.exit(1);
});
