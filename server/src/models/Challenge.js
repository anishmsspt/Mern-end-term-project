const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Challenge title is required'],
      trim: true,
      minlength: [3, 'Challenge title must be at least 3 characters'],
      maxlength: [100, 'Challenge title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
    joinCode: {
      type: String,
      required: [true, 'Unique join code is required'],
      uppercase: true,
      trim: true,
      unique: true,
      index: true,
      minlength: [6, 'Join code must be at least 6 characters'],
      maxlength: [12, 'Join code cannot exceed 12 characters'],
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Challenge host reference is required'],
      index: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      validate: {
        validator: function (val) {
          return !this.startDate || val > this.startDate;
        },
        message: 'End date must be strictly after start date',
      },
    },
    status: {
      type: String,
      enum: {
        values: ['upcoming', 'active', 'completed', 'archived'],
        message: '{VALUE} is not a valid challenge status',
      },
      default: 'active',
      index: true,
    },
    rules: {
      maxSubmissionsPerDay: {
        type: Number,
        default: 5,
        min: [1, 'Max submissions per day must be at least 1'],
        max: [20, 'Max submissions per day cannot exceed 20'],
      },
      allowMultipleSubmissionsPerDay: {
        type: Boolean,
        default: true,
      },
      requireEvidence: {
        type: Boolean,
        default: false,
      },
      pointsPolicy: {
        type: String,
        enum: ['manual', 'difficulty_preset'],
        default: 'manual',
      },
      defaultPoints: {
        easy: { type: Number, default: 1, min: 0 },
        medium: { type: Number, default: 3, min: 0 },
        hard: { type: Number, default: 5, min: 0 },
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying active challenges by host
challengeSchema.index({ host: 1, status: 1 });

const Challenge = mongoose.model('Challenge', challengeSchema);

module.exports = Challenge;
