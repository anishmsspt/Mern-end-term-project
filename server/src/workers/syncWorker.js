require('dotenv').config();
const { connectDB, disconnectDB } = require('../config/db');
const { runDueSyncs } = require('../services/automationService');
async function main() {
  await connectDB();
  try {
    const results = await runDueSyncs({ once: true });
    console.log(JSON.stringify({ worker: 'leetcode-sync', completedAt: new Date().toISOString(), processed: results.syncs?.length || 0, manualResolved: results.manualResolved || 0, results }, null, 2));
  } finally { await disconnectDB(); }
}
main().catch((error) => { console.error('[sync-worker]', error); process.exitCode = 1; });
