const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { connectDB, disconnectDB, getDBStatus } = require('../src/config/db');

describe('Database Configuration & Persistence Guard Tests', () => {
  afterEach(async () => {
    await disconnectDB();
  });

  test('FATAL ERROR: Never allow in-memory fallback in production when MONGODB_URI is missing', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalUri = process.env.MONGODB_URI;
    const originalUseMemory = process.env.USE_MEMORY_DB;

    process.env.NODE_ENV = 'production';
    delete process.env.MONGODB_URI;
    process.env.USE_MEMORY_DB = 'true';

    await assert.rejects(
      async () => {
        await connectDB();
      },
      {
        message: /FATAL: MONGODB_URI is required in production mode\. In-memory database fallback is strictly prohibited in production\./,
      }
    );

    // Restore env
    process.env.NODE_ENV = originalEnv;
    process.env.MONGODB_URI = originalUri;
    process.env.USE_MEMORY_DB = originalUseMemory;
  });

  test('CLEAR ERROR: Clear failure when MONGODB_URI is missing and USE_MEMORY_DB is false in development', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalUri = process.env.MONGODB_URI;
    const originalUseMemory = process.env.USE_MEMORY_DB;

    process.env.NODE_ENV = 'development';
    delete process.env.MONGODB_URI;
    process.env.USE_MEMORY_DB = 'false';

    await assert.rejects(
      async () => {
        await connectDB();
      },
      {
        message: /MONGODB_URI is not set and USE_MEMORY_DB is not enabled/,
      }
    );

    process.env.NODE_ENV = originalEnv;
    process.env.MONGODB_URI = originalUri;
    process.env.USE_MEMORY_DB = originalUseMemory;
  });

  test('PERSISTENCE FLAG: Connecting via persistent URI reports isPersistent = true', async () => {
    // Connect to local or test persistent mongo if URI provided
    const uri = 'mongodb://127.0.0.1:27017/unanimous_test_persistence_check';
    const originalUri = process.env.MONGODB_URI;
    process.env.MONGODB_URI = uri;

    try {
      await connectDB();
      const status = getDBStatus();
      assert.equal(status.status, 'connected');
      assert.equal(status.type, 'persistent-mongodb');
      assert.equal(status.isPersistent, true);
    } catch (err) {
      // If local standalone mongod is not running on 27017, verify error handling without fallback
      assert.ok(err);
      const status = getDBStatus();
      assert.equal(status.status, 'error');
      assert.equal(status.isPersistent, false);
    } finally {
      process.env.MONGODB_URI = originalUri;
    }
  });
});
