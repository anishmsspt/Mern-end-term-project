const express = require('express');
const router = express.Router();
const { register, login, getMe, provisionHost } = require('../controllers/authController');
const { requireAuth, requireHost } = require('../middleware/auth');

// Public authentication routes
router.post('/register', register);
router.post('/login', login);

// Development-only one-time Host provisioning (secured by PROVISION_HOST_SECRET)
router.post('/provision-host', provisionHost);

// Protected user identity route
router.get('/me', requireAuth, getMe);

// Protected Host-only verification route for authorization verification & testing
router.get('/host-only', requireAuth, requireHost, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Authorized: Host privilege verified.',
    user: req.user.toJSON(),
  });
});

module.exports = router;
