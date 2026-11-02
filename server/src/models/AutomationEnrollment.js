const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  challenge: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true, index: true },
  leetcodeUsername: { type: String, required: true, trim: true, lowercase: true },
  verificationCode: { type: String, default: '' },
  verificationExpiresAt: { type: Date, default: null },
  verificationAttempts: { type: Number, default: 0 },
  verifiedAt: { type: Date, default: null },
  consentedAt: { type: Date, default: null },
  status: { type: String, enum: ['pending_verification', 'active', 'paused', 'disconnected'], default: 'pending_verification', index: true },
  enrolledAt: { type: Date, default: Date.now },
  lastSyncAt: { type: Date, default: null },
  lastSuccessAt: { type: Date, default: null },
  nextSyncAt: { type: Date, default: Date.now, index: true },
  lastError: { type: String, default: '' },
  consecutiveFailures: { type: Number, default: 0 },
  checkpointTimestamp: { type: Number, default: 0 },
  checkpointSubmissionId: { type: String, default: '' },
  leaseUntil: { type: Date, default: null },
  leaseToken: { type: String, default: '' },
  lastManualSyncAt: { type: Date, default: null },
}, { timestamps: true });
schema.index({ user: 1, challenge: 1 }, { unique: true });
schema.index({ challenge: 1, leetcodeUsername: 1 }, { unique: true, partialFilterExpression: { status: { $in: ['pending_verification', 'active', 'paused'] } } });
schema.index({ status: 1, nextSyncAt: 1 });
module.exports = mongoose.model('AutomationEnrollment', schema);
