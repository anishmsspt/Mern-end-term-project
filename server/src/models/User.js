const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [emailRegex, 'Please provide a valid email address'],
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // Hidden by default on queries
    },
    role: {
      type: String,
      enum: {
        values: ['participant', 'host', 'admin'],
        message: '{VALUE} is not a valid role',
      },
      default: 'participant',
      index: true,
    },
    leetcodeUsername: {
      type: String,
      trim: true,
      default: '',
      maxlength: [50, 'LeetCode username cannot exceed 50 characters'],
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [250, 'Bio cannot exceed 250 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

/**
 * Compare plain text password with stored hash
 */
userSchema.methods.comparePassword = async function (plainPassword) {
  if (!this.passwordHash) {
    throw new Error('Password hash not loaded on user document');
  }
  return bcrypt.compare(plainPassword, this.passwordHash);
};

/**
 * Static utility to hash plain password with standard work factor
 */
userSchema.statics.hashPassword = async function (plainPassword) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainPassword, salt);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
