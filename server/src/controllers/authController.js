const User = require('../models/User');
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

module.exports = {
  register,
  login,
  getMe,
};
