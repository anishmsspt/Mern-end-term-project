
const express = require('express');
const router = express.Router();

const {
  createSubmission,
  getMySubmissions,
  getSubmissionById,
  getReviewQueue,
  reviewSubmission,
  getSubmissionAnalytics,
} = require('../controllers/submissionController');

const { requireAuth, requireHost } = require('../middleware/auth');

// All submission routes require authentication
router.use(requireAuth);

// Create daily problem submission (Participants)
router.post('/', createSubmission);

// List participant's own submissions
router.get('/mine', getMySubmissions);

// Host analytics (must be before /:id)
router.get('/analytics/:challengeId', requireHost, getSubmissionAnalytics);

// Host Review Queue
router.get('/review-queue', requireHost, getReviewQueue);

// Host Review Action
router.post('/:id/review', requireHost, reviewSubmission);

// View single submission
router.get('/:id', getSubmissionById);

module.exports = router;
