/**
 * Admin Router — handles all /api/admin/* requests.
 * Called from the main server.js request handler.
 *
 * Routes:
 *   POST   /api/admin/auth/login
 *   POST   /api/admin/auth/logout
 *   GET    /api/admin/auth/me
 *
 *   GET    /api/admin/users
 *   POST   /api/admin/users
 *   PUT    /api/admin/users/:id
 *   DELETE /api/admin/users/:id
 *
 *   GET    /api/admin/orders
 *   PUT    /api/admin/orders/:id/status
 *   GET    /api/admin/inquiries
 *   PUT    /api/admin/inquiries/:id
 *   GET    /api/admin/products
 *   PUT    /api/admin/products/:id
 *
 *   GET    /api/admin/integrations
 *   PUT    /api/admin/integrations
 *   POST   /api/admin/integrations/test
 */

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const opsRoutes = require('./routes/operations');
const wizardRoutes = require('./routes/setup-wizard');

/**
 * Returns true if this router handled the request.
 */
async function adminRouter(req, res) {
  const { method, url } = req;
  // Strip query string for matching
  const pathname = url.split('?')[0];

  // ── Auth ──────────────────────────────────────────────────────────────────
  if (pathname === '/api/admin/auth/login' && method === 'POST') {
    return authRoutes.handleLogin(req, res);
  }
  if (pathname === '/api/admin/auth/logout' && method === 'POST') {
    return authRoutes.handleLogout(req, res);
  }
  if (pathname === '/api/admin/auth/me' && method === 'GET') {
    return authRoutes.handleMe(req, res);
  }

  // ── Admin Users ───────────────────────────────────────────────────────────
  if (pathname === '/api/admin/users' && method === 'GET') {
    return userRoutes.handleListUsers(req, res);
  }
  if (pathname === '/api/admin/users' && method === 'POST') {
    return userRoutes.handleCreateUser(req, res);
  }
  const userPut = pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (userPut && method === 'PUT') {
    return userRoutes.handleUpdateUser(req, res, userPut[1]);
  }
  const userDel = pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (userDel && method === 'DELETE') {
    return userRoutes.handleDeleteUser(req, res, userDel[1]);
  }

  // ── Orders ────────────────────────────────────────────────────────────────
  if (pathname === '/api/admin/orders' && method === 'GET') {
    return opsRoutes.handleGetOrders(req, res);
  }
  const orderStatus = pathname.match(/^\/api\/admin\/orders\/([^/]+)\/status$/);
  if (orderStatus && method === 'PUT') {
    return opsRoutes.handleUpdateOrderStatus(req, res, orderStatus[1]);
  }

  // ── Inquiries ─────────────────────────────────────────────────────────────
  if (pathname === '/api/admin/inquiries' && method === 'GET') {
    return opsRoutes.handleGetInquiries(req, res);
  }
  const inquiryUpdate = pathname.match(/^\/api\/admin\/inquiries\/([^/]+)$/);
  if (inquiryUpdate && method === 'PUT') {
    return opsRoutes.handleUpdateInquiry(req, res, inquiryUpdate[1]);
  }

  // ── Products ──────────────────────────────────────────────────────────────
  if (pathname === '/api/admin/products' && method === 'GET') {
    return opsRoutes.handleGetProducts(req, res);
  }
  const productUpdate = pathname.match(/^\/api\/admin\/products\/([^/]+)$/);
  if (productUpdate && method === 'PUT') {
    return opsRoutes.handleUpdateProduct(req, res, productUpdate[1]);
  }

  // ── Integrations ──────────────────────────────────────────────────────────
  if (pathname === '/api/admin/integrations' && method === 'GET') {
    return wizardRoutes.handleGetIntegrations(req, res);
  }
  if (pathname === '/api/admin/integrations' && method === 'PUT') {
    return wizardRoutes.handleSaveIntegrations(req, res);
  }
  if (pathname === '/api/admin/integrations/test' && method === 'POST') {
    return wizardRoutes.handleTestIntegration(req, res);
  }

  // Not matched
  return false;
}

module.exports = { adminRouter };
