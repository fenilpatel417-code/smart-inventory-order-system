const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Category = require('../src/models/Category');
const Supplier = require('../src/models/Supplier');
const StockMovement = require('../src/models/StockMovement');

const TEST_DB_URI = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/smart_inventory_test';

let adminToken;
let staffToken;
let testCategory;
let testSupplier;
let testProduct;

beforeAll(async () => {
  await mongoose.connect(TEST_DB_URI);
  await Promise.all([
    User.deleteMany({}),
    Product.deleteMany({}),
    Category.deleteMany({}),
    Supplier.deleteMany({}),
  ]);

  // Create admin
  const adminRes = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Admin Inv', email: 'admininv@example.com', password: 'Password123!', role: 'admin' });
  adminToken = adminRes.body.data.accessToken;

  // Create staff
  const staffRes = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Staff Inv', email: 'staffinv@example.com', password: 'Password123!', role: 'staff' });
  staffToken = staffRes.body.data.accessToken;
});

afterAll(async () => {
  await Promise.all([
    User.deleteMany({}),
    Product.deleteMany({}),
    Category.deleteMany({}),
    Supplier.deleteMany({}),
  ]);
  await mongoose.connection.close();
});

describe('Phase 2: Inventory, Category, and Supplier APIs', () => {
  test('POST /api/v1/categories - Create Category', async () => {
    const res = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ name: 'Electronics', description: 'Gadgets and hardware' });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Electronics');
    testCategory = res.body.data;
  });

  test('POST /api/v1/suppliers - Create Supplier', async () => {
    const res = await request(app)
      .post('/api/v1/suppliers')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        name: 'Apex Wholesale',
        contactPerson: 'John Smith',
        email: 'john@apexwholesale.com',
        phone: '555-0199',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Apex Wholesale');
    testSupplier = res.body.data;
  });

  test('POST /api/v1/products - Create Product', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        name: 'Wireless Mechanical Keyboard',
        sku: 'KB-WL-001',
        category: testCategory._id,
        supplier: testSupplier._id,
        price: 89.99,
        costPrice: 45.0,
        quantity: 25,
        reorderLevel: 5,
        description: 'RGB mechanical keyboard with hot-swappable switches',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.sku).toBe('KB-WL-001');
    expect(res.body.data.quantity).toBe(25);
    testProduct = res.body.data;
  });

  test('POST /api/v1/products - Reject Duplicate SKU', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        name: 'Another Keyboard',
        sku: 'KB-WL-001', // same SKU
        category: testCategory._id,
        supplier: testSupplier._id,
        price: 99.0,
        costPrice: 50.0,
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/v1/products/:id/adjust-stock - Stock adjustment and movement log', async () => {
    // Add 10 units
    const addRes = await request(app)
      .post(`/api/v1/products/${testProduct._id}/adjust-stock`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        type: 'in',
        quantity: 10,
        reason: 'purchase_order_received',
        notes: 'Restock shipment received',
      });

    expect(addRes.status).toBe(200);
    expect(addRes.body.data.product.quantity).toBe(35);

    // Deduct 5 units
    const deductRes = await request(app)
      .post(`/api/v1/products/${testProduct._id}/adjust-stock`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        type: 'out',
        quantity: 5,
        reason: 'damaged',
        notes: 'Damaged in warehouse inspection',
      });

    expect(deductRes.status).toBe(200);
    expect(deductRes.body.data.product.quantity).toBe(30);

    // Reject deducting more than available
    const failRes = await request(app)
      .post(`/api/v1/products/${testProduct._id}/adjust-stock`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        type: 'out',
        quantity: 100,
        reason: 'damaged',
      });

    expect(failRes.status).toBe(400);
    expect(failRes.body.message).toContain('Insufficient stock');
  });

  test('GET /api/v1/products/export/csv - Stream CSV file', async () => {
    const res = await request(app)
      .get('/api/v1/products/export/csv')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('KB-WL-001');
    expect(res.text).toContain('Wireless Mechanical Keyboard');
  });

  test('DELETE /api/v1/products/:id - Staff forbidden, Admin permitted', async () => {
    // Staff cannot delete
    const staffRes = await request(app)
      .delete(`/api/v1/products/${testProduct._id}`)
      .set('Authorization', `Bearer ${staffToken}`);
    expect(staffRes.status).toBe(403);

    // Admin can delete
    const adminRes = await request(app)
      .delete(`/api/v1/products/${testProduct._id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminRes.status).toBe(200);
  });
});
