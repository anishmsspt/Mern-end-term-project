
const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      enum: ['manual', 'automated'],
      default: 'manual',
      index: true,
    },

    // When our backend first receives the submission.
    receivedAt: {
      type: Date,
      default: Date.now,
      immutable: true,
      index: true,
    },

    activeDuplicateKey: { type: String, default: undefined },

    leetcode: {
      submissionId: { type: String, default: '' },
      username: { type: String, default: '' },

      // Original submission timestamp from LeetCode.
      submittedAt: { type: Date, default: null },

      enrollment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AutomationEnrollment',
        default: null,
      },
    },

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

    problemTitle: {
      type: String,
      required: [true, 'Problem title is required'],
      trim: true,
      minlength: [2, 'Problem title must be at least 2 characters'],
      maxlength: [150, 'Problem title cannot exceed 150 characters'],
    },

    problemUrl: {
      type: String,
      required: [true, 'Canonical LeetCode problem URL is required'],
      trim: true,
    },

    problemSlug: {
      type: String,
      required: [true, 'Canonical problem slug is required'],
      lowercase: true,
      trim: true,
      index: true,
    },

    difficultyVerified: { type: Boolean, default: false },

    difficulty: {
      type: String,
      enum: {
        values: ['Easy', 'Medium', 'Hard', 'Unknown'],
        message: '{VALUE} is not a valid difficulty level',
      },
      default: 'Unknown',
    },

    completionDate: {
      type: Date,
      required: [true, 'Reported completion date is required'],
      index: true,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
      default: '',
    },

    evidenceUrl: {
      type: String,
      trim: true,
      default: '',
    },

    status: {
      type: String,
      enum: {
        values: ['Pending', 'Approved', 'Rejected', 'ResubmissionRequested'],
        message: '{VALUE} is not a valid submission status',
      },
      default: 'Pending',
      index: true,
    },

    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    reviewNotes: {
      type: String,
      trim: true,
      default: '',
    },

    rejectionReason: {
      type: String,
      trim: true,
      default: '',
    },

    pointsAwarded: {
      type: Number,
      default: 0,
      min: [0, 'Points awarded cannot be negative'],
    },
  },
  {
    timestamps: true,
  }
);

// Participant submission history
submissionSchema.index({
  participant: 1,
  challenge: 1,
  createdAt: -1,
});

// Host review queue
submissionSchema.index({
  challenge: 1,
  status: 1,
  createdAt: 1,
});

// Duplicate check
submissionSchema.index({
  participant: 1,
  challenge: 1,
  problemSlug: 1,
  status: 1,
});

// Time-based analytics
submissionSchema.index({
  challenge: 1,
  receivedAt: -1,
});

submissionSchema.index({
  challenge: 1,
  source: 1,
  receivedAt: -1,
});

// An accepted LeetCode submission can be imported only once per challenge.
submissionSchema.index(
  { activeDuplicateKey: 1 },
  { unique: true, sparse: true }
);

submissionSchema.index(
  { challenge: 1, 'leetcode.submissionId': 1 },
  {
    unique: true,
    partialFilterExpression: {
      'leetcode.submissionId': { $type: 'string', $gt: '' },
    },
  }
);

const Submission = mongoose.model('Submission', submissionSchema);

module.exports = Submission;
