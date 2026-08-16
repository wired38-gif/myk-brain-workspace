'use strict';

/**
 * URLs that must never be launched via /api/open or server startup.
 * Mixpanel is not part of this workspace; agents and the Mac connector
 * must not open mixpanel.com (or Mixpanel CDNs) in a browser.
 */
const BLOCKED_OPEN_HOSTS = [
  'mixpanel.com',
  'mxpnl.com',
  'mixpanel.org',
];

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

function isBlockedOpenUrl(rawUrl) {
  return isBlockedOpenHost(hostnameFromUrl(rawUrl));
}

function shouldSkipBrowserOpen(env = process.env, platform = process.platform) {
  if (env.SKIP_BROWSER_OPEN === '1' || env.SKIP_BROWSER_OPEN === 'true') return true;
  if (env.CI === 'true' || env.CI === '1') return true;
  if (env.CURSOR_AGENT === '1' || env.CURSOR_AGENT === 'true') return true;
  if (env.CONVEX_AGENT_MODE) return true;
  if (platform !== 'darwin') return true;
  return false;
}

module.exports = {
  BLOCKED_OPEN_HOSTS,
  hostnameFromUrl,
  isBlockedOpenHost,
  isBlockedOpenUrl,
  shouldSkipBrowserOpen,
};
