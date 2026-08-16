#!/usr/bin/env node
'use strict';

const assert = require('assert');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const {
  isBlockedOpenUrl,
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

assert.strictEqual(shouldSkipBrowserOpen({ SKIP_BROWSER_OPEN: '1' }, 'darwin'), true);
assert.strictEqual(shouldSkipBrowserOpen({ CI: 'true' }, 'darwin'), true);
assert.strictEqual(shouldSkipBrowserOpen({ CURSOR_AGENT: '1' }, 'darwin'), true);
assert.strictEqual(shouldSkipBrowserOpen({}, 'linux'), true);
assert.strictEqual(shouldSkipBrowserOpen({}, 'darwin'), false);

function postOpen(port, url) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: '/api/open',
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
    req.end(JSON.stringify({ app: 'Google Chrome', url }));
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
      SKIP_BROWSER_OPEN: '1',
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
    assert.match(stdout, /Browser auto-open skipped/);

    const blocked = await postOpen(port, 'https://mixpanel.com/project/demo');
    assert.strictEqual(blocked.status, 403);
    assert.strictEqual(blocked.body.success, false);
    assert.match(blocked.body.error, /Mixpanel/);

    const subdomain = await postOpen(port, 'https://eu.mixpanel.com');
    assert.strictEqual(subdomain.status, 403);

    console.log('OK: Mixpanel open guard blocks mixpanel URLs and skips browser auto-open');
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
