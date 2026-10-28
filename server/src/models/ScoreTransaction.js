const mongoose = require('mongoose');

const scoreTransactionSchema = new mongoose.Schema(
  {
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Participant reference is required'],
      index: true,
    },
    challenge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Challenge',
      required: [true, 'Challenge reference is required'],
      index: true,
    },
    submission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission',
      required: [true, 'Submission reference is required'],
      unique: true, // Prevents duplicate score transactions for the same submission
      index: true,
    },
    points: {
      type: Number,
      required: [true, 'Points value is required'],
      min: [1, 'Awarded points in a transaction must be at least 1'],
    },
    awardedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Awarding Host reference is required'],
    },
    reason: {
      type: String,
      trim: true,
      default: 'Daily LeetCode Problem Solved',
    },
    awardedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for aggregating participant points in a challenge
scoreTransactionSchema.index({ challenge: 1, participant: 1 });
scoreTransactionSchema.index({ challenge: 1, awardedAt: -1 });

const ScoreTransaction = mongoose.model('ScoreTransaction', scoreTransactionSchema);

module.exports = ScoreTransaction;
