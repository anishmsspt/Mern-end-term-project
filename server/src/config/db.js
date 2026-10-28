const mongoose = require('mongoose');

let mongoMemoryServer = null;
let dbInfo = {
  status: 'disconnected',
  type: 'none',
  uri: null,
  isPersistent: false,
};

/**
 * Connect to MongoDB or development-only in-memory server
 */
const connectDB = async () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const configuredUri = process.env.MONGODB_URI && process.env.MONGODB_URI.trim();

  try {
    if (configuredUri) {
      // Primary production / standard database connection
      console.log('[Database] Connecting to configured MongoDB instance...');
      const conn = await mongoose.connect(configuredUri);
      
      dbInfo = {
        status: 'connected',
        type: 'persistent-mongodb',
        host: conn.connection.host,
        dbName: conn.connection.name,
        isPersistent: true,
      };
      console.log(`[Database] Connected successfully to ${dbInfo.host}/${dbInfo.dbName} (Persistent)`);
      return conn;
    }

    // Safety check: Never allow in-memory fallback in production
    if (isProduction) {
      throw new Error(
        'FATAL: MONGODB_URI is required in production mode. In-memory database fallback is strictly prohibited in production.'
      );
    }

    // Development / test fallback with explicit warnings
    if (process.env.USE_MEMORY_DB === 'true' || process.env.NODE_ENV === 'test') {
      console.warn('================================================================');
      console.warn('⚠️  [DEV WARNING] No MONGODB_URI provided.');
      console.warn('⚠️  [DEV WARNING] Starting ephemeral development-only MongoDB Memory Server.');
      console.warn('⚠️  [DEV WARNING] THIS DATABASE IS STRICTLY NON-PERSISTENT.');
      console.warn('⚠️  [DEV WARNING] All data will be reset when the process terminates.');
      console.warn('================================================================');

      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoMemoryServer = await MongoMemoryServer.create();
      const memoryUri = mongoMemoryServer.getUri();

      const conn = await mongoose.connect(memoryUri);
      dbInfo = {
        status: 'connected',
        type: 'memory-server',
        host: 'localhost (in-memory)',
        dbName: conn.connection.name,
        isPersistent: false,
      };
      console.log(`[Database] Connected to ephemeral In-Memory MongoDB (${dbInfo.dbName})`);
      return conn;
    }

    throw new Error(
      'MONGODB_URI is not set and USE_MEMORY_DB is not enabled. Please set MONGODB_URI in your .env file.'
    );
  } catch (error) {
    dbInfo = {
      status: 'error',
      type: 'none',
      error: error.message,
      isPersistent: false,
    };
    console.error(`[Database Error] Connection failure: ${error.message}`);
    throw error;
  }
};

/**
 * Disconnect from database and stop in-memory server if running
 */
const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
      mongoMemoryServer = null;
    }
    dbInfo = { status: 'disconnected', type: 'none', isPersistent: false };
    console.log('[Database] Disconnected successfully.');
  } catch (err) {
    console.error(`[Database Error] Disconnection error: ${err.message}`);
  }
};

/**
 * Get current database status and metadata
 */
const getDBStatus = () => {
  const readyStateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  return {
    ...dbInfo,
    readyState: readyStateMap[mongoose.connection.readyState] || 'unknown',
  };
};

module.exports = {
  connectDB,
  disconnectDB,
  getDBStatus,
};
