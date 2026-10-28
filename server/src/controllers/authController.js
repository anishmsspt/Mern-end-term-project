const User = require('../models/User');
const Challenge = require('../models/Challenge');
const { generateToken } = require('../utils/token');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Register a new user
 * Note: Public registration strictly creates 'participant' accounts.
 * Any role specified in req.body is intentionally overridden.
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, leetcodeUsername, bio } = req.body;

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Name is required and must be at least 2 characters long.',
      });
    }

    // Validate email
    if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'A valid email address is required.',
      });
    }

    // Validate password
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check for duplicate account
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    // Hash password securely
    const passwordHash = await User.hashPassword(password);

    // Explicitly enforce role as 'participant' to prevent privilege escalation
    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'participant',
      leetcodeUsername: leetcodeUsername ? String(leetcodeUsername).trim() : '',
      bio: bio ? String(bio).trim() : '',
    });

    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: newUser.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Log in with existing credentials
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Both email and password are required.',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Query user including passwordHash for comparison
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

    // Generic error message to prevent user enumeration
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Account is suspended. Please contact administrator.',
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user details
 */
const getMe = async (req, res, next) => {
  try {
    // req.user is guaranteed to be populated by requireAuth middleware
    return res.status(200).json({
      success: true,
      user: req.user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * One-time development-only Host provisioning endpoint
 * Creates Host directly in the currently running database instance.
 * Strictly blocked in production. Requires PROVISION_HOST_SECRET.
 */
const provisionHost = async (req, res, next) => {
  try {
    // 1. Production safety block
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Host provisioning endpoint is strictly disabled in production.',
      });
    }

    // 2. Secret authentication check
    const expectedSecret = process.env.PROVISION_HOST_SECRET && process.env.PROVISION_HOST_SECRET.trim();
    if (!expectedSecret) {
      return res.status(503).json({
        success: false,
        message: 'Service Unavailable: PROVISION_HOST_SECRET is not configured on the server.',
      });
    }

    const providedSecret = req.headers['x-provision-secret'] || (req.body && req.body.secret);
    if (!providedSecret || providedSecret !== expectedSecret) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid or missing provisioning secret.',
      });
    }

    // 3. Prevent duplicate Host or overwriting existing Host
    const existingHost = await User.findOne({ role: 'host' });
    if (existingHost) {
      return res.status(409).json({
        success: false,
        message: `Conflict: A Host account already exists (${existingHost.email}). Provisioning aborted.`,
      });
    }

    // 4. Resolve credentials from request body or fallback to BOOTSTRAP_HOST_* env
    const email = (req.body && req.body.email) || process.env.BOOTSTRAP_HOST_EMAIL || 'host@unanimous.dev';
    const password = (req.body && req.body.password) || process.env.BOOTSTRAP_HOST_PASSWORD || 'HostAdmin2026!';
    const name = (req.body && req.body.name) || process.env.BOOTSTRAP_HOST_NAME || 'Primary Challenge Host';
    const leetcodeUsername = (req.body && req.body.leetcodeUsername) || process.env.BOOTSTRAP_HOST_LEETCODE || 'unanimous_host';

    // Validate email & password format
    if (!email || !emailRegex.test(String(email).trim())) {
      return res.status(400).json({
        success: false,
        message: 'A valid email address is required.',
      });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Host password must be at least 8 characters long.',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Check if an account with this email already exists with another role
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: `Conflict: An account with email '${normalizedEmail}' already exists.`,
      });
    }

    // 5. Create Host user reusing User.hashPassword
    const passwordHash = await User.hashPassword(password);
    const hostUser = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'host',
      leetcodeUsername: String(leetcodeUsername).trim(),
      bio: 'Lead organizer & challenge coordinator for the Unanimous LeetCode Hub.',
    });

    // 6. Create initial challenge if none exists (following bootstrap script conventions)
    const existingChallenge = await Challenge.findOne({ host: hostUser._id });
    let createdChallenge = null;
    if (!existingChallenge) {
      const startDate = new Date();
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      createdChallenge = await Challenge.create({
        title: 'Spring 2026 Competitive Programming Sprint',
        description: 'Daily algorithmic challenge sprint for student developers.',
        joinCode: 'SPRINT26',
        host: hostUser._id,
        startDate,
        endDate,
        status: 'active',
        rules: {
          maxSubmissionsPerDay: 5,
          allowMultipleSubmissionsPerDay: true,
          requireEvidence: false,
          pointsPolicy: 'manual',
          defaultPoints: { easy: 1, medium: 3, hard: 5 },
        },
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Host account provisioned successfully in running database.',
      host: hostUser.toJSON(),
      challenge: createdChallenge,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  provisionHost,
};
