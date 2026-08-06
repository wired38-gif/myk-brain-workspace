/**
 * Simple JSON-based database for admin portal.
 * Stores data in /data/*.json files to keep zero-native-dep philosophy.
 * For production, swap this out for a real DB (Postgres/SQLite/etc).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readCollection(name) {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return [];
  }
}

function writeCollection(name, data) {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, `${name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function generateId() {
  return crypto.randomBytes(12).toString('hex');
}

// ──────────────────────────────────────────────
// Admin Users
// ──────────────────────────────────────────────

function getAdminUsers() {
  return readCollection('admin_users');
}

function findAdminUserByEmail(email) {
  return getAdminUsers().find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

function findAdminUserById(id) {
  return getAdminUsers().find(u => u.id === id) || null;
}

function createAdminUser({ email, passwordHash, role = 'admin', createdBy = 'system' }) {
  const users = getAdminUsers();
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('Email already exists');
  }
  const user = {
    id: generateId(),
    email: email.toLowerCase().trim(),
    passwordHash,
    role,
    createdBy,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  users.push(user);
  writeCollection('admin_users', users);
  return sanitizeUser(user);
}

function updateAdminUser(id, { email, passwordHash }) {
  const users = getAdminUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) throw new Error('User not found');
  if (email) {
    const conflict = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.id !== id);
    if (conflict) throw new Error('Email already taken by another admin');
    users[idx].email = email.toLowerCase().trim();
  }
  if (passwordHash) users[idx].passwordHash = passwordHash;
  users[idx].updatedAt = new Date().toISOString();
  writeCollection('admin_users', users);
  return sanitizeUser(users[idx]);
}

function deleteAdminUser(id) {
  let users = getAdminUsers();
  const user = users.find(u => u.id === id);
  if (!user) throw new Error('User not found');
  users = users.filter(u => u.id !== id);
  writeCollection('admin_users', users);
  return true;
}

function sanitizeUser(user) {
  const { passwordHash: _p, ...safe } = user;
  return safe;
}

// ──────────────────────────────────────────────
// Orders (demo data store)
// ──────────────────────────────────────────────

function getOrders() {
  const orders = readCollection('orders');
  if (orders.length === 0) return seedOrders();
  return orders;
}

function updateOrderStatus(id, status) {
  const orders = getOrders();
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) throw new Error('Order not found');
  orders[idx].status = status;
  orders[idx].updatedAt = new Date().toISOString();
  writeCollection('orders', orders);
  return orders[idx];
}

// ──────────────────────────────────────────────
// Customer Inquiries
// ──────────────────────────────────────────────

function getInquiries() {
  const items = readCollection('inquiries');
  if (items.length === 0) return seedInquiries();
  return items;
}

function updateInquiryStatus(id, { status, reply }) {
  const items = getInquiries();
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) throw new Error('Inquiry not found');
  if (status) items[idx].status = status;
  if (reply) items[idx].reply = reply;
  items[idx].updatedAt = new Date().toISOString();
  writeCollection('inquiries', items);
  return items[idx];
}

// ──────────────────────────────────────────────
// Products
// ──────────────────────────────────────────────

function getProducts() {
  const products = readCollection('products');
  if (products.length === 0) return seedProducts();
  return products;
}

function updateProduct(id, updates) {
  const products = getProducts();
  const idx = products.findIndex(p => p.id === id);
  if (idx === -1) throw new Error('Product not found');
  Object.assign(products[idx], updates, { updatedAt: new Date().toISOString() });
  writeCollection('products', products);
  return products[idx];
}

// ──────────────────────────────────────────────
// Integration Settings
// ──────────────────────────────────────────────

function getIntegrationSettings() {
  const settings = readCollection('integrations');
  if (!Array.isArray(settings) || settings.length === 0) {
    return defaultIntegrationSettings();
  }
  return settings[0];
}

function saveIntegrationSettings(updates) {
  const current = getIntegrationSettings();
  const merged = { ...current, ...updates, updatedAt: new Date().toISOString() };
  writeCollection('integrations', [merged]);
  return merged;
}

// ──────────────────────────────────────────────
// Demo seed data
// ──────────────────────────────────────────────

function seedOrders() {
  const now = new Date();
  const orders = Array.from({ length: 12 }, (_, i) => ({
    id: generateId(),
    orderNumber: `QC-${10001 + i}`,
    customer: { name: ['Sarah Johnson', 'Marcus Williams', 'Aisha Patel', 'James Carter', 'Nina Rodriguez', 'Devon Brooks', 'Tanya Lee', 'Omar Hassan', 'Priya Sharma', 'Luke Mitchell', 'Fatima Ali', 'Chris Evans'][i], email: `customer${i + 1}@example.com`, address: `${100 + i} Main St, New York, NY 10001` },
    items: [{ name: ['Custom Embroidery Set', 'Premium Stitch Pack', 'Logo Design Kit', 'Monogram Bundle', 'Patch Collection', 'Thread Assortment', 'Fabric Starter Kit', 'Custom Name Plate', 'Deluxe Embroidery', 'Birthday Set', 'Wedding Bundle', 'Kids Design Pack'][i], qty: Math.floor(Math.random() * 3) + 1, price: (Math.random() * 50 + 15).toFixed(2) }],
    total: (Math.random() * 150 + 20).toFixed(2),
    status: ['pending', 'processing', 'shipped', 'delivered', 'pending', 'processing', 'shipped', 'delivered', 'processing', 'shipped', 'delivered', 'pending'][i],
    channel: ['Etsy', 'Website', 'Amazon', 'TikTok Shop', 'Etsy', 'Website', 'Amazon', 'Etsy', 'Website', 'TikTok Shop', 'Etsy', 'Amazon'][i],
    createdAt: new Date(now - (i * 86400000 * 2)).toISOString(),
    updatedAt: new Date(now - (i * 86400000)).toISOString(),
  }));
  writeCollection('orders', orders);
  return orders;
}

function seedInquiries() {
  const now = new Date();
  const inquiries = [
    { id: generateId(), name: 'Emma Thompson', email: 'emma@example.com', subject: 'Custom order request', message: 'Hi! I would like to order a custom embroidery set for my daughter\'s birthday. Can you do personalized designs?', status: 'new', reply: '', createdAt: new Date(now - 86400000).toISOString(), updatedAt: new Date(now - 86400000).toISOString() },
    { id: generateId(), name: 'Robert Kim', email: 'robert@example.com', subject: 'Shipping question', message: 'When will my order QC-10003 ship? I need it by Friday.', status: 'pending', reply: '', createdAt: new Date(now - 86400000 * 2).toISOString(), updatedAt: new Date(now - 86400000 * 2).toISOString() },
    { id: generateId(), name: 'Maria Garcia', email: 'maria@example.com', subject: 'Return request', message: 'The colors on my embroidery set don\'t match what I ordered. I\'d like to return it.', status: 'new', reply: '', createdAt: new Date(now - 86400000 * 3).toISOString(), updatedAt: new Date(now - 86400000 * 3).toISOString() },
    { id: generateId(), name: 'David Chen', email: 'david@example.com', subject: 'Bulk order inquiry', message: 'We are a school looking to order 50 custom patches. Do you offer bulk discounts?', status: 'replied', reply: 'Hi David! Yes, we offer 20% off for orders of 25+ items. Please email us directly for a custom quote.', createdAt: new Date(now - 86400000 * 4).toISOString(), updatedAt: new Date(now - 86400000 * 3).toISOString() },
    { id: generateId(), name: 'Layla Osei', email: 'layla@example.com', subject: 'Product availability', message: 'Do you have the wedding monogram bundle in gold thread?', status: 'pending', reply: '', createdAt: new Date(now - 86400000 * 5).toISOString(), updatedAt: new Date(now - 86400000 * 5).toISOString() },
  ];
  writeCollection('inquiries', inquiries);
  return inquiries;
}

function seedProducts() {
  const products = [
    { id: generateId(), name: 'Custom Embroidery Set', sku: 'CES-001', price: '29.99', inventory: 45, category: 'Sets', image: '', sales: 127, status: 'active', updatedAt: new Date().toISOString() },
    { id: generateId(), name: 'Premium Stitch Pack', sku: 'PSP-002', price: '19.99', inventory: 88, category: 'Packs', image: '', sales: 203, status: 'active', updatedAt: new Date().toISOString() },
    { id: generateId(), name: 'Logo Design Kit', sku: 'LDK-003', price: '49.99', inventory: 22, category: 'Kits', image: '', sales: 65, status: 'active', updatedAt: new Date().toISOString() },
    { id: generateId(), name: 'Monogram Bundle', sku: 'MB-004', price: '34.99', inventory: 15, category: 'Bundles', image: '', sales: 89, status: 'active', updatedAt: new Date().toISOString() },
    { id: generateId(), name: 'Patch Collection', sku: 'PC-005', price: '24.99', inventory: 67, category: 'Collections', image: '', sales: 156, status: 'active', updatedAt: new Date().toISOString() },
    { id: generateId(), name: 'Thread Assortment', sku: 'TA-006', price: '14.99', inventory: 0, category: 'Supplies', image: '', sales: 312, status: 'out_of_stock', updatedAt: new Date().toISOString() },
    { id: generateId(), name: 'Fabric Starter Kit', sku: 'FSK-007', price: '39.99', inventory: 30, category: 'Kits', image: '', sales: 44, status: 'active', updatedAt: new Date().toISOString() },
    { id: generateId(), name: 'Wedding Bundle', sku: 'WB-008', price: '79.99', inventory: 8, category: 'Bundles', image: '', sales: 28, status: 'active', updatedAt: new Date().toISOString() },
  ];
  writeCollection('products', products);
  return products;
}

function defaultIntegrationSettings() {
  return {
    etsy: { apiKey: '', shopId: '', connected: false },
    amazon: { sellerId: '', mwsToken: '', connected: false },
    tiktokShop: { appKey: '', appSecret: '', connected: false },
    emailMarketing: { provider: 'mailchimp', apiKey: '', listId: '', connected: false },
    stripe: { publishableKey: '', secretKey: '', webhookSecret: '', connected: false },
    paypal: { clientId: '', clientSecret: '', connected: false },
    updatedAt: new Date().toISOString(),
  };
}

module.exports = {
  getAdminUsers,
  findAdminUserByEmail,
  findAdminUserById,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  sanitizeUser,
  getOrders,
  updateOrderStatus,
  getInquiries,
  updateInquiryStatus,
  getProducts,
  updateProduct,
  getIntegrationSettings,
  saveIntegrationSettings,
};
