const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');

describe('Server Health and Diagnostic Tests', () => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.USE_MEMORY_DB = 'true';
    await connectDB();
  });

  after(async () => {
    await disconnectDB();
  });

  test('GET /api/health returns 200 OK with operational payload', async () => {
    const res = await request(app).get('/api/health');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.status, 'healthy');
    assert.equal(typeof res.body.uptimeSeconds, 'number');
    assert.equal(res.body.database.status, 'connected');
    assert.ok(res.body.timestamp);
  });

  test('GET /api/nonexistent-route returns 404', async () => {
    const res = await request(app).get('/api/nonexistent-route');

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /Resource not found/);
  });
});
