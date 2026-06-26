const path = require('path');

function loadResolveSessionFromRequest() {
  const candidates = ['./sessionFromRequest', './session', './auth/session', './auth'];

  for (const candidate of candidates) {
    try {
      const mod = require(candidate);
      if (typeof mod.resolveSessionFromRequest === 'function') {
        return mod.resolveSessionFromRequest;
      }
      if (typeof mod === 'function') {
        return mod;
      }
      if (mod.default && typeof mod.default.resolveSessionFromRequest === 'function') {
        return mod.default.resolveSessionFromRequest;
      }
      if (mod.default && typeof mod.default === 'function') {
        return mod.default;
      }
    } catch (err) {
      if (err.code !== 'MODULE_NOT_FOUND') {
        throw err;
      }
    }
  }

  throw new Error(
    'resolveSessionFromRequest is not exported. Add myks-app/lib/sessionFromRequest.js or export resolveSessionFromRequest from lib/session.js.'
  );
}

const resolveSessionFromRequest = loadResolveSessionFromRequest();

function requestHostname(req) {
  const forwarded = String(req.headers['x-forwarded-host'] || '').trim();
  if (forwarded) {
    return forwarded.split(',')[0].trim().split(':')[0].toLowerCase();
  }
  return String(req.headers.host || '').trim().split(':')[0].toLowerCase();
}

function isLoopbackRequest(req) {
  const hostname = requestHostname(req);
  if (['127.0.0.1', 'localhost', '::1', '[::1]'].includes(hostname)) {
    return true;
  }

  const remote = String(req.socket?.remoteAddress || req.connection?.remoteAddress || '');
  return remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1';
}

function isGatewayOwner(req) {
  if (isLoopbackRequest(req)) {
    return true;
  }

  const session = resolveSessionFromRequest(req);
  return Boolean(session && (session.role === 'owner' || session.source === 'cookie'));
}

function consumerHostGate(req, res, next) {
  try {
    if (isGatewayOwner(req)) {
      return next();
    }

    const session = resolveSessionFromRequest(req);
    if (session && session.role === 'remote') {
      return next();
    }

    if (req.path && req.path.startsWith('/api/')) {
      return res.status(401).json({
        success: false,
        error:
          'Remote access token required. Open the tunnel URL with ?token=YOUR_TOKEN or send Authorization: Bearer.',
      });
    }

    return res.status(403).send('Forbidden');
  } catch (err) {
    return next(err);
  }
}

module.exports = consumerHostGate;
module.exports.consumerHostGate = consumerHostGate;
module.exports.isGatewayOwner = isGatewayOwner;
module.exports.resolveSessionFromRequest = resolveSessionFromRequest;
