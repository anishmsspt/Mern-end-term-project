const mongoose = require('mongoose');

const challengeMembershipSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    challenge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Challenge',
      required: [true, 'Challenge reference is required'],
      index: true,
    },
    role: {
      type: String,
      enum: ['participant', 'host'],
      default: 'participant',
    },
    status: {
      type: String,
      enum: ['active', 'left', 'suspended'],
      default: 'active',
      index: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index ensuring a user can only have one active membership per challenge
challengeMembershipSchema.index({ user: 1, challenge: 1 }, { unique: true });

const ChallengeMembership = mongoose.model('ChallengeMembership', challengeMembershipSchema);

module.exports = ChallengeMembership;
