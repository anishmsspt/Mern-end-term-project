const express = require('express');
const router = express.Router();
const {
  grantAdjustment,
  listAdjustments,
  revokeAdjustment,
  getMyAdjustments,
} = require('../controllers/streakAdjustmentController');
const { requireAuth, requireHost } = require('../middleware/auth');

// All streak-adjustment routes require authentication
router.use(requireAuth);

// Participant: own protected days (must be before parameterised routes)
router.get('/mine', getMyAdjustments);

// Host-only management
router.post('/', requireHost, grantAdjustment);
router.get('/challenge/:challengeId', requireHost, listAdjustments);
router.post('/:id/revoke', requireHost, revokeAdjustment);

module.exports = router;
