const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
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

// Indexes for common queries
// 1. Participant looking up their submissions in a challenge
submissionSchema.index({ participant: 1, challenge: 1, createdAt: -1 });

// 2. Host review queue: filtering by challenge and review status
submissionSchema.index({ challenge: 1, status: 1, createdAt: 1 });

// 3. Duplicate check acceleration
submissionSchema.index({ participant: 1, challenge: 1, problemSlug: 1, status: 1 });

const Submission = mongoose.model('Submission', submissionSchema);

module.exports = Submission;
