const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Category = require('../src/models/Category');
const Supplier = require('../src/models/Supplier');
const Customer = require('../src/models/Customer');
const Order = require('../src/models/Order');

const TEST_DB_URI = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/smart_inventory_test';

let adminToken;
let staffToken;

beforeAll(async () => {
  await mongoose.connect(TEST_DB_URI);
  await Promise.all([
    User.deleteMany({}),
    Product.deleteMany({}),
    Category.deleteMany({}),
    Supplier.deleteMany({}),
    Customer.deleteMany({}),
    Order.deleteMany({}),
  ]);

  // Admin & Staff users
  const adminRes = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Report Admin', email: 'reportadmin@example.com', password: 'Password123!', role: 'admin' });
  adminToken = adminRes.body.data.accessToken;

  const staffRes = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Report Staff', email: 'reportstaff@example.com', password: 'Password123!', role: 'staff' });
  staffToken = staffRes.body.data.accessToken;

  // Categories & Suppliers
  const cat = await Category.create({ name: 'Appliances' });
  const sup = await Supplier.create({ name: 'Mega Supply', contactPerson: 'Bob', email: 'bob@mega.com', phone: '555-7777' });
  const cust = await Customer.create({ name: 'Alice Walker', email: 'alice.w@example.com', phone: '555-1234' });

  // Products
  const p1 = await Product.create({
    name: 'Air Fryer Deluxe',
    sku: 'AP-AF-01',
    category: cat._id,
    supplier: sup._id,
    price: 120.0,
    costPrice: 60.0,
    quantity: 15,
    reorderLevel: 5,
  });

  const p2 = await Product.create({
    name: 'Espresso Maker Pro',
    sku: 'AP-EM-02',
    category: cat._id,
    supplier: sup._id,
    price: 200.0,
    costPrice: 100.0,
    quantity: 3, // Low stock
    reorderLevel: 5,
  });

  // Orders
  await Order.create({
    orderNumber: 'ORD-TEST-001',
    customer: cust._id,
    items: [{ product: p1._id, name: p1.name, sku: p1.sku, quantity: 2, price: 120, subtotal: 240 }],
    subtotal: 240,
    taxRate: 0.1,
    taxAmount: 24,
    discount: 0,
    shippingCost: 0,
    total: 264,
    orderStatus: 'delivered',
    paymentStatus: 'paid',
  });

  await Order.create({
    orderNumber: 'ORD-TEST-002',
    customer: cust._id,
    items: [{ product: p2._id, name: p2.name, sku: p2.sku, quantity: 1, price: 200, subtotal: 200 }],
    subtotal: 200,
    taxRate: 0.1,
    taxAmount: 20,
    discount: 10,
    shippingCost: 10,
    total: 220,
    orderStatus: 'confirmed',
    paymentStatus: 'paid',
  });
});

afterAll(async () => {
  await Promise.all([
    User.deleteMany({}),
    Product.deleteMany({}),
    Category.deleteMany({}),
    Supplier.deleteMany({}),
    Customer.deleteMany({}),
    Order.deleteMany({}),
  ]);
  await mongoose.connection.close();
});

describe('Phase 5: Sales Analytics, Aggregations, and Reports', () => {
  test('GET /api/v1/dashboard/kpis - Admin sees financial + operational metrics', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/kpis')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.totalRevenue).toBe(484); // 264 + 220
    expect(res.body.data.totalProducts).toBe(2);
    expect(res.body.data.lowStockCount).toBe(1); // p2 has 3 <= 5
  });

  test('GET /api/v1/dashboard/kpis - Staff sees operational metrics without financials', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/kpis')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.totalProducts).toBe(2);
    expect(res.body.data.totalRevenue).toBeUndefined(); // Masked for staff
  });

  test('GET /api/v1/dashboard/charts - Returns aggregated trend and breakdown series', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/charts?period=monthly')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.salesTrend).toBeDefined();
    expect(res.body.data.topProducts).toBeDefined();
    expect(res.body.data.salesByCategory).toBeDefined();
    expect(res.body.data.statusDistribution).toBeDefined();
  });

  test('GET /api/v1/reports/sales - Staff is Forbidden (403 RBAC)', async () => {
    const res = await request(app)
      .get('/api/v1/reports/sales')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/v1/reports/sales - Admin retrieves sales report and CSV export', async () => {
    const jsonRes = await request(app)
      .get('/api/v1/reports/sales')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(jsonRes.status).toBe(200);
    expect(jsonRes.body.data.summary.totalRevenue).toBe(484);

    const csvRes = await request(app)
      .get('/api/v1/reports/sales?exportFormat=csv')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(csvRes.status).toBe(200);
    expect(csvRes.headers['content-type']).toContain('text/csv');
  });

  test('GET /api/v1/reports/inventory-valuation - Admin calculates asset cost vs retail potential', async () => {
    const res = await request(app)
      .get('/api/v1/reports/inventory-valuation')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.summary.totalUnits).toBe(18); // 15 + 3
    expect(res.body.data.summary.totalCostValue).toBe(1200); // 15*60 + 3*100 = 900 + 300 = 1200
    expect(res.body.data.summary.totalRetailValue).toBe(2400); // 15*120 + 3*200 = 1800 + 600 = 2400
  });
});
