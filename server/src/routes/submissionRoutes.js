const express = require('express');
const router = express.Router();
const {
  createSubmission,
  getMySubmissions,
  getSubmissionById,
} = require('../controllers/submissionController');
const { requireAuth } = require('../middleware/auth');

// All submission routes require authentication
router.use(requireAuth);

// Create daily problem submission
router.post('/', createSubmission);

// List participant's own submissions
router.get('/mine', getMySubmissions);

// View single submission (enforces owner or challenge-host access isolation)
router.get('/:id', getSubmissionById);

module.exports = router;
