const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');

const TEST_DB_URI = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/smart_inventory_test';

beforeAll(async () => {
  await mongoose.connect(TEST_DB_URI);
  await User.deleteMany({});
});

afterAll(async () => {
  await User.deleteMany({});
  await mongoose.connection.close();
});

describe('Phase 1: Auth & RBAC API Endpoints', () => {
  let adminToken;
  let staffToken;
  let refreshTokenCookie;

  test('POST /api/v1/auth/register - Register Admin user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Admin Test',
        email: 'admintest@example.com',
        password: 'Password123!',
        role: 'admin',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.role).toBe('admin');
    expect(res.body.data.accessToken).toBeDefined();
    adminToken = res.body.data.accessToken;

    const cookieHeader = res.headers['set-cookie'];
    expect(cookieHeader).toBeDefined();
    refreshTokenCookie = cookieHeader[0];
  });

  test('POST /api/v1/auth/register - Register Staff user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Staff Test',
        email: 'stafftest@example.com',
        password: 'Password123!',
        role: 'staff',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('staff');
    staffToken = res.body.data.accessToken;
  });

  test('POST /api/v1/auth/login - Fail with invalid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admintest@example.com',
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/v1/auth/login - Succeed with valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admintest@example.com',
        password: 'Password123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
  });

  test('GET /api/v1/auth/me - Access profile with Bearer token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('admintest@example.com');
  });

  test('GET /api/v1/users - Admin can view users list', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  test('GET /api/v1/users - Staff is FORBIDDEN (403 RBAC)', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
