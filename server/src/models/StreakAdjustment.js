const mongoose = require('mongoose');

/**
 * StreakAdjustment — a host-granted streak credit for ONE IST calendar day.
 *
 * It is deliberately a separate collection: it never creates a Submission,
 * never creates a ScoreTransaction and never touches submission timestamps.
 * It is only read by the streak calculation.
 */
const streakAdjustmentSchema = new mongoose.Schema(
  {
    challenge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Challenge',
      required: [true, 'Challenge reference is required'],
      index: true,
    },
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Participant reference is required'],
      index: true,
    },

    // Protected calendar day as an Asia/Kolkata "YYYY-MM-DD" key.
    date: {
      type: String,
      required: [true, 'Protected date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
      immutable: true,
    },

    reason: {
      type: String,
      required: [true, 'A reason is required for the audit trail'],
      trim: true,
      minlength: [5, 'Reason must be at least 5 characters'],
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },

    status: {
      type: String,
      enum: ['active', 'revoked'],
      default: 'active',
      index: true,
    },

    // Audit trail: who granted it and when.
    grantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Granting host reference is required'],
      immutable: true,
    },
    grantedAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },

    // Audit trail: who revoked it, when and why.
    revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    revokedAt: { type: Date, default: null },
    revokeReason: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { timestamps: true }
);

// Duplicate protection: at most ONE active adjustment per participant/challenge/day.
// Revoked rows are excluded so a day can be re-granted after a revoke while the
// full history is preserved.
streakAdjustmentSchema.index(
  { challenge: 1, participant: 1, date: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);

streakAdjustmentSchema.index({ challenge: 1, createdAt: -1 });

module.exports = mongoose.model('StreakAdjustment', streakAdjustmentSchema);
