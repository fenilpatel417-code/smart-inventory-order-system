const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Category = require('../src/models/Category');
const Supplier = require('../src/models/Supplier');
const PurchaseOrder = require('../src/models/PurchaseOrder');
const StockMovement = require('../src/models/StockMovement');
const Notification = require('../src/models/Notification');
const { runStockCheck } = require('../src/jobs/stockCheckerJob');

const TEST_DB_URI = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/smart_inventory_test';

let staffToken;
let supplier;
let product;

beforeAll(async () => {
  await mongoose.connect(TEST_DB_URI);
  await Promise.all([
    User.deleteMany({}),
    Product.deleteMany({}),
    Category.deleteMany({}),
    Supplier.deleteMany({}),
    PurchaseOrder.deleteMany({}),
    StockMovement.deleteMany({}),
    Notification.deleteMany({}),
  ]);

  const userRes = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Admin Alerts', email: 'adminalerts@example.com', password: 'Password123!', role: 'admin' });
  staffToken = userRes.body.data.accessToken;

  const cat = await Category.create({ name: 'Beverages' });
  supplier = await Supplier.create({
    name: 'Artisan Roasters',
    contactPerson: 'Marco',
    email: 'marco@artisan.com',
    phone: '555-8888',
  });

  product = await Product.create({
    name: 'Dark Roast Espresso',
    sku: 'ESP-DRK-01',
    category: cat._id,
    supplier: supplier._id,
    price: 18.0,
    costPrice: 9.0,
    quantity: 2, // Low stock! reorderLevel is 10
    reorderLevel: 10,
  });
});

afterAll(async () => {
  await Promise.all([
    User.deleteMany({}),
    Product.deleteMany({}),
    Category.deleteMany({}),
    Supplier.deleteMany({}),
    PurchaseOrder.deleteMany({}),
    StockMovement.deleteMany({}),
    Notification.deleteMany({}),
  ]);
  await mongoose.connection.close();
});

describe('Phase 4: Low-Stock Alerts, Purchase Orders & Notifications', () => {
  let createdPO;

  test('POST /api/v1/purchase-orders - Place Purchase Order to Supplier', async () => {
    const res = await request(app)
      .post('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        supplier: supplier._id,
        items: [{ product: product._id, quantity: 20, unitCost: 9.0 }],
        notes: 'Urgent restocking for espresso beans',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.poNumber).toMatch(/^PO-/);
    expect(res.body.data.status).toBe('ordered');
    expect(res.body.data.totalAmount).toBe(180);
    createdPO = res.body.data;
  });

  test('PUT /api/v1/purchase-orders/:id/receive - Mark Received and Auto-Increment Stock', async () => {
    const res = await request(app)
      .put(`/api/v1/purchase-orders/${createdPO._id}/receive`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('received');

    // Verify product stock increased by 20 (from 2 to 22)
    const updatedProd = await Product.findById(product._id);
    expect(updatedProd.quantity).toBe(22);

    // Verify StockMovement logged
    const movement = await StockMovement.findOne({
      referenceId: createdPO._id,
      reason: 'purchase_order_received',
    });
    expect(movement).toBeDefined();
    expect(movement.quantity).toBe(20);
  });

  test('GET /api/v1/notifications - Retrieve Notifications & Unread Count', async () => {
    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.notifications.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.unreadCount).toBeGreaterThanOrEqual(1);

    // Mark single as read
    const notifId = res.body.data.notifications[0]._id;
    const readRes = await request(app)
      .put(`/api/v1/notifications/${notifId}/read`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(readRes.status).toBe(200);
    expect(readRes.body.data.isRead).toBe(true);
  });

  test('StockChecker Job - Detect Low Stock and Dispatch Digest', async () => {
    // Force a product down to 0 stock
    await Product.findByIdAndUpdate(product._id, { quantity: 0 });

    const result = await runStockCheck();
    expect(result.count).toBeGreaterThanOrEqual(1);

    // Verify Out of Stock notification created
    const notif = await Notification.findOne({
      referenceId: product._id,
      type: 'out_of_stock',
    });
    expect(notif).toBeDefined();
  });
});
