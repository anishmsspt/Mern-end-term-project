const express = require('express');
const router = express.Router();
const {
  createSubmission,
  getMySubmissions,
  getSubmissionById,
  getReviewQueue,
  reviewSubmission,
} = require('../controllers/submissionController');
const { requireAuth, requireHost } = require('../middleware/auth');

// All submission routes require authentication
router.use(requireAuth);

// Create daily problem submission (Participants)
router.post('/', createSubmission);

// List participant's own submissions
router.get('/mine', getMySubmissions);

// Host Review Queue (Hosts only, placed before /:id)
router.get('/review-queue', requireHost, getReviewQueue);

// Host Review Action: Approve or Reject
router.post('/:id/review', requireHost, reviewSubmission);

// View single submission (enforces owner or challenge-host access isolation)
router.get('/:id', getSubmissionById);

module.exports = router;
