const crypto = require('crypto');

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'myk_io_session';
const AUTH_SECRET = process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || '';

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;

  for (const cookie of String(cookieHeader).split(';')) {
    const [name, ...valueParts] = cookie.trim().split('=');
    if (!name || valueParts.length === 0) continue;
    cookies[name] = decodeURIComponent(valueParts.join('='));
  }

  return cookies;
}

function signPayload(encodedPayload) {
  return crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(encodedPayload)
    .digest('base64url');
}

function constantTimeEqual(a, b) {
  return crypto.timingSafeEqual(
    crypto.createHash('sha256').update(String(a)).digest(),
    crypto.createHash('sha256').update(String(b)).digest()
  );
}

function decodeSessionPayload(token) {
  const [encodedPayload, signature] = String(token).split('.');
  if (!encodedPayload || !signature) return null;
  if (!constantTimeEqual(signature, signPayload(encodedPayload))) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (typeof payload.sub !== 'string' || typeof payload.exp !== 'number') return null;
    if (payload.exp <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function extractRemoteAccessToken(req) {
  const authHeader = String(req.headers.authorization || '').trim();
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }

  const queryToken = req.query && req.query.token;
  if (typeof queryToken === 'string' && queryToken.trim()) {
    return queryToken.trim();
  }

  return '';
}

function getConfiguredRemoteAccessToken() {
  return String(
    process.env.REMOTE_ACCESS_TOKEN ||
      process.env.GATEWAY_REMOTE_TOKEN ||
      process.env.ASKMYK_REMOTE_TOKEN ||
      ''
  ).trim();
}

/**
 * Resolve the active session for an Express request.
 * Returns null when no valid owner cookie or remote access token is present.
 */
function resolveSessionFromRequest(req) {
  if (!req) return null;

  const cookies = parseCookies(req.headers.cookie);
  const cookieToken = cookies[SESSION_COOKIE_NAME];
  if (cookieToken && AUTH_SECRET) {
    const payload = decodeSessionPayload(cookieToken);
    if (payload) {
      return {
        source: 'cookie',
        role: 'owner',
        sub: payload.sub,
        exp: payload.exp,
      };
    }
  }

  const providedToken = extractRemoteAccessToken(req);
  const configuredToken = getConfiguredRemoteAccessToken();
  if (providedToken && configuredToken && constantTimeEqual(providedToken, configuredToken)) {
    return {
      source: 'remote',
      role: 'remote',
      sub: 'remote',
    };
  }

  return null;
}

module.exports = {
  resolveSessionFromRequest,
  SESSION_COOKIE_NAME,
};
