#!/usr/bin/env node
'use strict';

const assert = require('assert');
const path = require('path');

const libDir = path.join(__dirname, '..', 'lib');
const session = require(path.join(libDir, 'session'));
const sessionFromRequest = require(path.join(libDir, 'sessionFromRequest'));
const consumerHostGate = require(path.join(libDir, 'consumerHostGate'));

assert.strictEqual(typeof session.resolveSessionFromRequest, 'function', 'session.js must export resolveSessionFromRequest');
assert.strictEqual(typeof sessionFromRequest.resolveSessionFromRequest, 'function', 'sessionFromRequest.js must export resolveSessionFromRequest');
assert.strictEqual(typeof consumerHostGate, 'function', 'consumerHostGate must be middleware function');
assert.strictEqual(typeof consumerHostGate.isGatewayOwner, 'function', 'isGatewayOwner helper must exist');

const fakeReq = {
  headers: { host: 'askmyk.io' },
  socket: { remoteAddress: '203.0.113.1' },
  query: {},
};

assert.strictEqual(consumerHostGate.isGatewayOwner({ headers: { host: 'localhost' }, socket: { remoteAddress: '127.0.0.1' } }), true);
assert.strictEqual(consumerHostGate.isGatewayOwner(fakeReq), false);

console.log('OK: resolveSessionFromRequest export and consumerHostGate wiring verified');
