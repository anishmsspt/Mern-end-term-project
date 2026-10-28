const jwt = require('jsonwebtoken');

/**
 * JWT Authentication Strategy & Architecture Decisions:
 * 
 * Strategy: Stateless Bearer Token via Authorization header.
 * 
 * Trade-offs Analysis:
 * 1. Why Bearer Tokens over Cookies:
 *    - Cross-origin compatibility: Avoids third-party cookie restrictions in modern browsers
 *      when frontend (e.g. Vercel) and backend (e.g. Render) reside on separate domains.
 *    - CSRF immunity: Request bodies and headers cannot be forged by ambient cross-site requests.
 *    - Tooling interoperability: Works seamlessly with Supertest, Postman, curl, and automated test runners.
 * 
 * 2. Token Lifetime & Revocation:
 *    - Configurable lifetime via JWT_EXPIRES_IN (default: 7 days).
 *    - Client logout behavior cleanly clears the token from client-side state/storage.
 *    - Authorization middleware re-verifies that the user still exists and is 'active' in the database
 *      on each authenticated request, preventing deleted or suspended accounts from continuing access.
 */

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable is missing in production!');
    }
    return 'fallback_dev_jwt_secret_do_not_use_in_prod';
  }
  return secret;
};

/**
 * Generate signed JWT for authenticated user
 * @param {Object} user - User document
 * @returns {string} Signed JWT token
 */
const generateToken = (user) => {
  const payload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  };

  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(payload, getSecret(), { expiresIn });
};

/**
 * Verify and decode JWT token
 * @param {string} token - Bearer token string
 * @returns {Object} Decoded payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, getSecret());
};

module.exports = {
  generateToken,
  verifyToken,
};
