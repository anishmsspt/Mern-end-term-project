const express = require('express');
const router = express.Router();
const {
  joinChallenge,
  getMyChallenges,
  createChallenge,
  getChallengeById,
} = require('../controllers/challengeController');
const { requireAuth, requireHost } = require('../middleware/auth');

// All challenge routes require authentication
router.use(requireAuth);

// Participant & Host challenge lookup
router.get('/mine', getMyChallenges);

// Participant joins challenge via joinCode
router.post('/join', joinChallenge);

// Host creates new challenge
router.post('/', requireHost, createChallenge);

// Get single challenge details
router.get('/:id', getChallengeById);

module.exports = router;
