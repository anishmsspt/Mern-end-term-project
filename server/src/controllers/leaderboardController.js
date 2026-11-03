const mongoose = require('mongoose');
const Challenge = require('../models/Challenge');
const ChallengeMembership = require('../models/ChallengeMembership');
const Submission = require('../models/Submission');
const StreakAdjustment = require('../models/StreakAdjustment');
const { calculateStreaks } = require('../utils/streaks');
const { istDateKey } = require('../utils/istDate');

// Streak calculation (IST calendar days) lives in utils/streaks.js so the
// leaderboard and the participant streak endpoint share one implementation.
// Active host streak adjustments count as completed days; they never add points.

/**
 * Case-insensitive, locale-aware name comparison used as the secondary
 * (display) sorting rule. Falls back to the participant id so the order is
 * always fully deterministic.
 */
const compareByName = (a, b) => {
  const byName = String(a.name || '').localeCompare(String(b.name || ''), undefined, {
    sensitivity: 'base',
  });
  if (byName !== 0) return byName;
  return String(a.participantId).localeCompare(String(b.participantId));
};

/**
 * Sort entries by totalPoints (desc) then name (asc) and assign
 * standard competition ranks ("1224"): equal scores share a rank and the
 * following rank skips the number of tied entries (1, 2, 2, 4).
 *
 * Mutates and returns a new sorted array of entries with a `rank` property.
 */
const rankEntries = (entries) => {
  const sorted = [...entries].sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    return compareByName(a, b);
  });

  let previousPoints = null;
  let previousRank = 0;

  return sorted.map((entry, index) => {
    const rank = entry.totalPoints === previousPoints ? previousRank : index + 1;
    previousPoints = entry.totalPoints;
    previousRank = rank;
    return { ...entry, rank };
  });
};

/**
 * Get Leaderboard for a challenge
 *
 * Challenge membership is the source of truth for WHO is on the leaderboard.
 * Approved submissions only decide HOW MANY points each member has.
 *
 * Route: GET /api/leaderboard/:challengeId
 * Query: timeframe = 'overall' (default) | 'weekly'
 */
const getChallengeLeaderboard = async (req, res, next) => {
  try {
    const { challengeId } = req.params;
    const timeframe = req.query.timeframe === 'weekly' ? 'weekly' : 'overall';

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

    // 1. Every active participant of THIS challenge (source of truth)
    const memberships = await ChallengeMembership.find({
      challenge: challenge._id,
      role: 'participant',
      status: 'active',
    }).populate('user', 'name email leetcodeUsername');

    // 2. Approved submissions of THIS challenge, grouped per participant
    const matchStage = {
      challenge: challenge._id,
      status: 'Approved',
    };

    if (timeframe === 'weekly') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      matchStage.completionDate = { $gte: oneWeekAgo };
    }

    const approvedGroups = await Submission.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$participant',
          totalPoints: { $sum: '$pointsAwarded' },
          solvedCount: { $sum: 1 },
          lastSolvedAt: { $max: '$completionDate' },
          easyCount: { $sum: { $cond: [{ $eq: ['$difficulty', 'Easy'] }, 1, 0] } },
          mediumCount: { $sum: { $cond: [{ $eq: ['$difficulty', 'Medium'] }, 1, 0] } },
          hardCount: { $sum: { $cond: [{ $eq: ['$difficulty', 'Hard'] }, 1, 0] } },
        },
      },
    ]);

    // Streaks always use the participant's full approved history, even in weekly view.
    const approvedDates = await Submission.aggregate([
      { $match: { challenge: challenge._id, status: 'Approved' } },
      { $group: { _id: '$participant', completionDates: { $addToSet: '$completionDate' } } },
    ]);
    // Active (non-revoked) host adjustments add protected calendar days only.
    const activeAdjustments = await StreakAdjustment.aggregate([
      { $match: { challenge: challenge._id, status: 'active' } },
      { $group: { _id: '$participant', dates: { $addToSet: '$date' } } },
    ]);
    const adjustmentsByParticipant = new Map(
      activeAdjustments.map((group) => [String(group._id), group.dates])
    );
    const todayKey = istDateKey(new Date());
    const streakParticipantIds = new Set([
      ...approvedDates.map((group) => String(group._id)),
      ...adjustmentsByParticipant.keys(),
    ]);
    const approvedDatesByParticipant = new Map(
      approvedDates.map((group) => [String(group._id), group.completionDates])
    );
    const streaksByParticipant = new Map(
      [...streakParticipantIds].map((id) => [
        id,
        calculateStreaks(
          approvedDatesByParticipant.get(id) || [],
          todayKey,
          adjustmentsByParticipant.get(id) || []
        ),
      ])
    );

    const approvedByParticipant = new Map();
    approvedGroups.forEach((group) => {
      approvedByParticipant.set(String(group._id), group);
    });

    // 3. Merge: one entry per member, defaulting to 0 when nothing is approved.
    //    Approved submissions from users who are not active members are ignored.
    const entriesByParticipant = new Map();
    memberships.forEach((membership) => {
      const user = membership.user;
      if (!user) return; // dangling reference (deleted user)

      const participantId = String(user._id);
      if (entriesByParticipant.has(participantId)) return; // defensive de-duplication

      const stats = approvedByParticipant.get(participantId);
      const solvedCount = stats ? stats.solvedCount : 0;
      const streak = streaksByParticipant.get(participantId) || { currentStreak: 0, longestStreak: 0, activeDays: 0, protectedDays: 0 };

      entriesByParticipant.set(participantId, {
        participantId,
        userId: participantId, // alias kept for client compatibility
        name: user.name,
        email: user.email,
        leetcodeUsername: user.leetcodeUsername || '',
        totalPoints: stats ? stats.totalPoints : 0,
        solvedCount,
        approvedSubmissions: solvedCount,
        lastSolvedAt: stats ? stats.lastSolvedAt : null,
        easyCount: stats ? stats.easyCount : 0,
        mediumCount: stats ? stats.mediumCount : 0,
        hardCount: stats ? stats.hardCount : 0,
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        activeDays: streak.activeDays,
        protectedDays: streak.protectedDays || 0,
      });
    });

    // 4. Rank (points desc, then name) using standard competition ranking
    const fullLeaderboard = rankEntries([...entriesByParticipant.values()]);

    // Always serve fresh standings (points change whenever a host reviews)
    res.set('Cache-Control', 'no-store');

    return res.status(200).json({
      success: true,
      challenge: {
        _id: challenge._id,
        title: challenge.title,
        description: challenge.description,
        joinCode: challenge.joinCode,
        startDate: challenge.startDate,
        endDate: challenge.endDate,
      },
      timeframe,
      totalParticipants: fullLeaderboard.length,
      leaderboard: fullLeaderboard,
      standings: fullLeaderboard, // Aliased for client & test interoperability
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getChallengeLeaderboard,
  rankEntries,
};
