/**
 * Compatibility barrel for modules that import from ./session.
 * AskMyk consumerHostGate expects a named resolveSessionFromRequest export.
 */
const sessionFromRequest = require('./sessionFromRequest');

module.exports = {
  ...sessionFromRequest,
  resolveSessionFromRequest: sessionFromRequest.resolveSessionFromRequest,
  // Common aliases used during refactors — keeps older imports working.
  getSessionFromRequest: sessionFromRequest.resolveSessionFromRequest,
  parseSessionFromRequest: sessionFromRequest.resolveSessionFromRequest,
};
