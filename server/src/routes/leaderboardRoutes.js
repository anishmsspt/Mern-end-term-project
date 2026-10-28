const express = require('express');
const router = express.Router();
const { getChallengeLeaderboard } = require('../controllers/leaderboardController');
const { requireAuth } = require('../middleware/auth');

// Leaderboard is accessible to all authenticated users
router.use(requireAuth);

router.get('/:challengeId', getChallengeLeaderboard);

module.exports = router;
