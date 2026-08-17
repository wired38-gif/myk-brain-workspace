'use strict';

/**
 * Nothing in this workspace may launch Mixpanel or a browser that restores it.
 * Chrome/Safari "open" on macOS often restores the last Mixpanel tab.
 */
const BLOCKED_OPEN_HOSTS = [
  'mixpanel.com',
  'mxpnl.com',
  'mixpanel.org',
];

const BROWSER_APP_NAMES = [
  'chrome',
  'google chrome',
  'chromium',
  'safari',
  'firefox',
  'brave',
  'brave browser',
  'arc',
  'opera',
  'vivaldi',
  'msedge',
  'microsoft edge',
  'edge',
  'safari technology preview',
];

const BROWSER_OPEN_COMMAND = /\b(xdg-open|gio\s+open|sensible-browser|start\s+(chrome|msedge|microsoft\s+edge|firefox|brave)|open\s+(-a\s+)?(["']?(google\s+chrome|chromium|safari|firefox|brave|arc|opera|vivaldi|microsoft\s+edge|msedge)["']?)|open\s+https?:\/\/)/i;

function hostnameFromUrl(rawUrl) {
  if (rawUrl == null) return '';
  const text = String(rawUrl).trim();
  if (!text) return '';
  try {
    const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(text) ? text : `https://${text}`;
    return new URL(withScheme).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function isBlockedOpenHost(hostname) {
  if (!hostname) return false;
  return BLOCKED_OPEN_HOSTS.some(
    (blocked) => hostname === blocked || hostname.endsWith(`.${blocked}`)
  );
}

function mentionsMixpanel(text) {
  return /mixpanel|mxpnl/i.test(String(text || ''));
}

function isBlockedOpenUrl(rawUrl) {
  return mentionsMixpanel(rawUrl) || isBlockedOpenHost(hostnameFromUrl(rawUrl));
}

function isBrowserApp(app) {
  const name = String(app || '').trim().toLowerCase();
  if (!name) return false;
  return BROWSER_APP_NAMES.some((browser) => name === browser || name.includes(browser));
}

function isBlockedOpenCommand(command) {
  const text = String(command || '');
  if (!text.trim()) return false;
  if (mentionsMixpanel(text)) return true;
  if (BROWSER_OPEN_COMMAND.test(text)) return true;
  return isBlockedOpenUrl(text);
}

function isBlockedOpenRequest({ app, url, command } = {}) {
  if (command && isBlockedOpenCommand(command)) return true;
  if (isBrowserApp(app)) return true;
  if (url && isBlockedOpenUrl(url)) return true;
  return false;
}

function blockedOpenMessage() {
  return 'Blocked: do not open Mixpanel or a browser (Chrome restores Mixpanel). Use the local dashboard URL instead.';
}

function shouldSkipBrowserOpen() {
  return true;
}

module.exports = {
  BLOCKED_OPEN_HOSTS,
  BROWSER_APP_NAMES,
  hostnameFromUrl,
  isBlockedOpenHost,
  isBlockedOpenUrl,
  isBrowserApp,
  isBlockedOpenCommand,
  isBlockedOpenRequest,
  blockedOpenMessage,
  shouldSkipBrowserOpen,
};
