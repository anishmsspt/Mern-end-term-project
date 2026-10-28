const { verifyToken } = require('../utils/token');
const User = require('../models/User');

/**
 * Middleware: Verify JWT Bearer token and attach active user to req.user
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Missing or malformed Bearer token.',
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Authentication token has expired. Please log in again.',
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token.',
      });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated user account no longer exists.',
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'User account has been suspended. Please contact administrator.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware factory: Enforce role-based access control (RBAC)
 * @param  {...string} allowedRoles - Array of authorized roles
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before checking permissions.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: This resource requires one of [${allowedRoles.join(', ')}] role(s). Current role: '${req.user.role}'`,
      });
    }

    next();
  };
};

// Role-specific convenience guards
const requireHost = requireRole('host', 'admin');
const requireParticipant = requireRole('participant');

module.exports = {
  requireAuth,
  requireRole,
  requireHost,
  requireParticipant,
};
