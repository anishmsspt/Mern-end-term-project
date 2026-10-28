const mongoose = require('mongoose');
const Challenge = require('../models/Challenge');
const ChallengeMembership = require('../models/ChallengeMembership');
const Submission = require('../models/Submission');

/**
 * Get Leaderboard for a challenge
 * Calculated strictly from approved qualifying submissions and score records
 * Route: GET /api/leaderboard/:challengeId
 */
const getChallengeLeaderboard = async (req, res, next) => {
  try {
    const { challengeId } = req.params;
    const { timeframe } = req.query; // 'overall' (default) or 'weekly'

    if (!mongoose.Types.ObjectId.isValid(challengeId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid challenge ID format.',
      });
    }

    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found.',
      });
    }

    // Match criteria: strictly approved submissions belonging to this challenge
    const matchStage = {
      challenge: challenge._id,
      status: 'Approved',
    };

    // If weekly filter requested: submissions in the last 7 days or within active week
    if (timeframe === 'weekly') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      matchStage.completionDate = { $gte: oneWeekAgo };
    }

    // Aggregation pipeline to derive authoritative standings
    const leaderboardData = await Submission.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$participant',
          totalPoints: { $sum: '$pointsAwarded' },
          solvedCount: { $sum: 1 },
          lastSolvedAt: { $max: '$completionDate' },
          easyCount: {
            $sum: { $cond: [{ $eq: ['$difficulty', 'Easy'] }, 1, 0] },
          },
          mediumCount: {
            $sum: { $cond: [{ $eq: ['$difficulty', 'Medium'] }, 1, 0] },
          },
          hardCount: {
            $sum: { $cond: [{ $eq: ['$difficulty', 'Hard'] }, 1, 0] },
          },
        },
      },
      // Deterministic tie-breaking rules:
      // 1. Total Points descending
      // 2. Solved Count descending
      // 3. Earliest last solve timestamp ascending (faster solver wins tie)
      {
        $sort: {
          totalPoints: -1,
          solvedCount: -1,
          lastSolvedAt: 1,
        },
      },
      // Lookup participant profile details safely
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 1,
          participantId: '$_id',
          name: '$user.name',
          email: '$user.email',
          leetcodeUsername: '$user.leetcodeUsername',
          totalPoints: 1,
          solvedCount: 1,
          lastSolvedAt: 1,
          easyCount: 1,
          mediumCount: 1,
          hardCount: 1,
        },
      },
    ]);

    // Format rankings and incorporate members with 0 approved solves
    const allMembers = await ChallengeMembership.find({
      challenge: challenge._id,
      role: 'participant',
      status: 'active',
    }).populate('user', 'name email leetcodeUsername');

    const rankedParticipantMap = new Map();
    leaderboardData.forEach((entry, index) => {
      rankedParticipantMap.set(entry.participantId.toString(), {
        rank: index + 1,
        ...entry,
      });
    });

    const fullLeaderboard = [];
    let currentRank = 1;

    // Add all participants with solved problems
    leaderboardData.forEach((entry) => {
      fullLeaderboard.push({
        rank: currentRank++,
        participantId: entry.participantId,
        name: entry.name,
        email: entry.email,
        leetcodeUsername: entry.leetcodeUsername,
        totalPoints: entry.totalPoints,
        solvedCount: entry.solvedCount,
        lastSolvedAt: entry.lastSolvedAt,
        easyCount: entry.easyCount,
        mediumCount: entry.mediumCount,
        hardCount: entry.hardCount,
      });
    });

    // Append participants with 0 solves at the bottom
    allMembers.forEach((member) => {
      if (member.user && !rankedParticipantMap.has(member.user._id.toString())) {
        fullLeaderboard.push({
          rank: currentRank++,
          participantId: member.user._id,
          name: member.user.name,
          email: member.user.email,
          leetcodeUsername: member.user.leetcodeUsername,
          totalPoints: 0,
          solvedCount: 0,
          lastSolvedAt: null,
          easyCount: 0,
          mediumCount: 0,
          hardCount: 0,
        });
      }
    });

    return res.status(200).json({
      success: true,
      challenge: {
        _id: challenge._id,
        title: challenge.title,
        joinCode: challenge.joinCode,
        startDate: challenge.startDate,
        endDate: challenge.endDate,
      },
      timeframe: timeframe || 'overall',
      totalParticipants: fullLeaderboard.length,
      leaderboard: fullLeaderboard,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getChallengeLeaderboard,
};
