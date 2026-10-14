const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Category = require('../src/models/Category');
const Supplier = require('../src/models/Supplier');
const Customer = require('../src/models/Customer');
const Order = require('../src/models/Order');
const StockMovement = require('../src/models/StockMovement');

const TEST_DB_URI = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/smart_inventory_test';

let staffToken;
let customer;
let product1;
let product2;

beforeAll(async () => {
  await mongoose.connect(TEST_DB_URI);
  await Promise.all([
    User.deleteMany({}),
    Product.deleteMany({}),
    Category.deleteMany({}),
    Supplier.deleteMany({}),
    Customer.deleteMany({}),
    Order.deleteMany({}),
    StockMovement.deleteMany({}),
  ]);

  // Auth user
  const userRes = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Staff Order', email: 'stafforder@example.com', password: 'Password123!', role: 'staff' });
  staffToken = userRes.body.data.accessToken;

  // Category & Supplier
  const cat = await Category.create({ name: 'Books', description: 'Tech Books' });
  const sup = await Supplier.create({ name: 'Press Direct', contactPerson: 'Alice', email: 'alice@press.com', phone: '555-4321' });

  // Products with initial stock
  product1 = await Product.create({
    name: 'Clean Code Handbook',
    sku: 'BK-CLN-01',
    category: cat._id,
    supplier: sup._id,
    price: 40.0,
    costPrice: 20.0,
    quantity: 10,
    reorderLevel: 2,
  });

  product2 = await Product.create({
    name: 'Refactoring Guide',
    sku: 'BK-REF-02',
    category: cat._id,
    supplier: sup._id,
    price: 50.0,
    costPrice: 25.0,
    quantity: 5,
    reorderLevel: 2,
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
    StockMovement.deleteMany({}),
  ]);
  await mongoose.connection.close();
});

describe('Phase 3: Customer and Order Fulfillment with Atomic Stock Logic', () => {
  let createdOrder;

  test('POST /api/v1/customers - Create Customer', async () => {
    const res = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        name: 'Sarah Connor',
        email: 'sarah@example.com',
        phone: '555-9000',
        address: { street: '12 Cyber St', city: 'Los Angeles', state: 'CA', postalCode: '90001' },
      });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Sarah Connor');
    customer = res.body.data;
  });

  test('POST /api/v1/orders - Create Order with auto-calculated total and line items', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        customer: customer._id,
        items: [
          { product: product1._id, quantity: 2 }, // 2 * $40 = $80
          { product: product2._id, quantity: 1 }, // 1 * $50 = $50
        ],
        taxRate: 0.1, // 10% tax on $130 = $13
        discount: 10, // -$10
        shippingCost: 5, // +$5
        // Expected total: 130 + 13 + 5 - 10 = 138
      });

    expect(res.status).toBe(201);
    expect(res.body.data.orderNumber).toMatch(/^ORD-/);
    expect(res.body.data.subtotal).toBe(130);
    expect(res.body.data.taxAmount).toBe(13);
    expect(res.body.data.total).toBe(138);
    expect(res.body.data.orderStatus).toBe('pending');
    expect(res.body.data.stockDeducted).toBe(false);

    createdOrder = res.body.data;
  });

  test('PUT /api/v1/orders/:id/status - Confirm Order (Atomic Stock Deduction)', async () => {
    const res = await request(app)
      .put(`/api/v1/orders/${createdOrder._id}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        status: 'confirmed',
        note: 'Customer confirmed payment via transfer',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.orderStatus).toBe('confirmed');
    expect(res.body.data.stockDeducted).toBe(true);

    // Verify product quantities were decremented
    const updatedP1 = await Product.findById(product1._id);
    const updatedP2 = await Product.findById(product2._id);
    expect(updatedP1.quantity).toBe(8); // 10 - 2
    expect(updatedP2.quantity).toBe(4); // 5 - 1

    // Verify StockMovement logs exist
    const movements = await StockMovement.find({ referenceId: createdOrder._id, reason: 'order_confirmed' });
    expect(movements.length).toBe(2);
  });

  test('PUT /api/v1/orders/:id/status - Reject Invalid Status Transition', async () => {
    // Cannot jump from 'confirmed' directly to 'delivered' (must pack & ship first)
    const res = await request(app)
      .put(`/api/v1/orders/${createdOrder._id}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'delivered' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Invalid status transition');
  });

  test('PUT /api/v1/orders/:id/status - Cancel Order and Restore Stock Atomically', async () => {
    const res = await request(app)
      .put(`/api/v1/orders/${createdOrder._id}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        status: 'cancelled',
        note: 'Customer requested cancellation',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.orderStatus).toBe('cancelled');
    expect(res.body.data.stockDeducted).toBe(false);

    // Verify stock restored
    const restoredP1 = await Product.findById(product1._id);
    const restoredP2 = await Product.findById(product2._id);
    expect(restoredP1.quantity).toBe(10);
    expect(restoredP2.quantity).toBe(5);

    // Verify restoration movements
    const cancelMovements = await StockMovement.find({ referenceId: createdOrder._id, reason: 'order_cancelled' });
    expect(cancelMovements.length).toBe(2);
  });

  test('GET /api/v1/orders/:id/invoice - Download PDF Invoice', async () => {
    const res = await request(app)
      .get(`/api/v1/orders/${createdOrder._id}/invoice`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toContain(`invoice-${createdOrder.orderNumber}.pdf`);
  });
});
