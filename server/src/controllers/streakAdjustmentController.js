const mongoose = require('mongoose');
const Challenge = require('../models/Challenge');
const ChallengeMembership = require('../models/ChallengeMembership');
const Submission = require('../models/Submission');
const StreakAdjustment = require('../models/StreakAdjustment');
const { istDateKey } = require('../utils/istDate');
const { calculateStreaks, isValidDateKey } = require('../utils/streaks');

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

/**
 * Load a challenge and verify the requesting user may manage it
 * (the owning host, or an admin). Returns { challenge } or { error: {status, message} }.
 */
const loadManagedChallenge = async (challengeId, user) => {
  if (!isObjectId(challengeId)) {
    return { error: { status: 400, message: 'Invalid challenge ID format.' } };
  }
  const challenge = await Challenge.findById(challengeId);
  if (!challenge) {
    return { error: { status: 404, message: 'Challenge not found.' } };
  }
  const isOwner = challenge.host && challenge.host.equals(user._id);
  if (!isOwner && user.role !== 'admin') {
    return {
      error: {
        status: 403,
        message: 'Forbidden: You are not authorized to manage streak protection for this challenge.',
      },
    };
  }
  return { challenge };
};

const serializeAdjustment = (adj) => ({
  _id: adj._id,
  challenge: adj.challenge,
  participant: adj.participant,
  date: adj.date,
  reason: adj.reason,
  status: adj.status,
  grantedBy: adj.grantedBy,
  grantedAt: adj.grantedAt,
  revokedBy: adj.revokedBy,
  revokedAt: adj.revokedAt,
  revokeReason: adj.revokeReason,
});

/**
 * Compute a participant's streak for a challenge from approved submissions plus
 * ACTIVE streak adjustments. Read-only: touches no submission or score data.
 */
const computeParticipantStreak = async (challengeId, participantId) => {
  const [submissions, adjustments] = await Promise.all([
    Submission.find({ challenge: challengeId, participant: participantId, status: 'Approved' })
      .select('completionDate')
      .lean(),
    StreakAdjustment.find({ challenge: challengeId, participant: participantId, status: 'active' })
      .select('date')
      .lean(),
  ]);
  return calculateStreaks(
    submissions.map((s) => s.completionDate),
    istDateKey(new Date()),
    adjustments.map((a) => a.date)
  );
};

/**
 * Grant a streak credit (Host only)
 * POST /api/streak-adjustments
 * Body: { challengeId, participantId, date: 'YYYY-MM-DD' (IST), reason }
 */
const grantAdjustment = async (req, res, next) => {
  try {
    const { challengeId, participantId, date } = req.body;
    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';

    if (!challengeId || !participantId || !date || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: challengeId, participantId, date and reason are required.',
      });
    }
    if (!isObjectId(participantId)) {
      return res.status(400).json({ success: false, message: 'Invalid participant ID format.' });
    }
    if (reason.length < 5 || reason.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Reason must be between 5 and 500 characters.',
      });
    }
    if (!isValidDateKey(date)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date. Use a real calendar date in YYYY-MM-DD format (Asia/Kolkata).',
      });
    }

    const { challenge, error } = await loadManagedChallenge(challengeId, req.user);
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    // Date must fall inside the challenge window and not be in the future (IST).
    const startKey = istDateKey(challenge.startDate);
    const endKey = istDateKey(challenge.endDate);
    const todayKey = istDateKey(new Date());

    if (date < startKey || date > endKey) {
      return res.status(400).json({
        success: false,
        message: `Date must be within the challenge window (${startKey} to ${endKey}).`,
      });
    }
    if (date > todayKey) {
      return res.status(400).json({
        success: false,
        message: 'Streak protection cannot be granted for a future date.',
      });
    }

    // Participant must belong to this challenge.
    const membership = await ChallengeMembership.findOne({
      challenge: challenge._id,
      user: participantId,
      role: 'participant',
      status: 'active',
    });
    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'Participant is not an active member of this challenge.',
      });
    }

    // A day with a real approved submission needs no protection.
    const approvedThatDay = await Submission.find({
      challenge: challenge._id,
      participant: participantId,
      status: 'Approved',
    })
      .select('completionDate')
      .lean();
    if (approvedThatDay.some((s) => istDateKey(new Date(s.completionDate)) === date)) {
      return res.status(409).json({
        success: false,
        message: 'Participant already has an approved submission on this date; protection is not needed.',
      });
    }

    const existing = await StreakAdjustment.findOne({
      challenge: challenge._id,
      participant: participantId,
      date,
      status: 'active',
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An active streak protection already exists for this participant and date.',
      });
    }

    let adjustment;
    try {
      adjustment = await StreakAdjustment.create({
        challenge: challenge._id,
        participant: participantId,
        date,
        reason,
        grantedBy: req.user._id,
      });
    } catch (err) {
      if (err.code === 11000) {
        // Concurrent grant lost the race against the unique partial index.
        return res.status(409).json({
          success: false,
          message: 'An active streak protection already exists for this participant and date.',
        });
      }
      throw err;
    }

    const streak = await computeParticipantStreak(challenge._id, participantId);

    return res.status(201).json({
      success: true,
      message: 'Streak protection granted.',
      adjustment: serializeAdjustment(adjustment),
      streak,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List adjustment history for a challenge (Host only)
 * GET /api/streak-adjustments/challenge/:challengeId?participantId=&status=
 */
const listAdjustments = async (req, res, next) => {
  try {
    const { challenge, error } = await loadManagedChallenge(req.params.challengeId, req.user);
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    const filter = { challenge: challenge._id };
    if (req.query.participantId) {
      if (!isObjectId(req.query.participantId)) {
        return res.status(400).json({ success: false, message: 'Invalid participant ID format.' });
      }
      filter.participant = req.query.participantId;
    }
    if (req.query.status) {
      if (!['active', 'revoked'].includes(req.query.status)) {
        return res.status(400).json({ success: false, message: "Status must be 'active' or 'revoked'." });
      }
      filter.status = req.query.status;
    }

    const adjustments = await StreakAdjustment.find(filter)
      .populate('participant', 'name email leetcodeUsername')
      .populate('grantedBy', 'name email')
      .populate('revokedBy', 'name email')
      .sort({ date: -1, createdAt: -1 });

    res.set('Cache-Control', 'no-store');
    return res.status(200).json({
      success: true,
      count: adjustments.length,
      adjustments: adjustments.map((adj) => ({
        ...serializeAdjustment(adj),
        participant: adj.participant,
        grantedBy: adj.grantedBy,
        revokedBy: adj.revokedBy,
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Revoke a previously granted adjustment (Host only). The record is kept for audit.
 * POST /api/streak-adjustments/:id/revoke   Body: { reason? }
 */
const revokeAdjustment = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid adjustment ID format.' });
    }

    const adjustment = await StreakAdjustment.findById(id);
    if (!adjustment) {
      return res.status(404).json({ success: false, message: 'Streak adjustment not found.' });
    }

    const { challenge, error } = await loadManagedChallenge(adjustment.challenge, req.user);
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    if (adjustment.status === 'revoked') {
      return res.status(409).json({
        success: false,
        message: 'This streak adjustment has already been revoked.',
      });
    }

    // Atomic transition so two concurrent revokes cannot both succeed.
    const revoked = await StreakAdjustment.findOneAndUpdate(
      { _id: adjustment._id, status: 'active' },
      {
        $set: {
          status: 'revoked',
          revokedBy: req.user._id,
          revokedAt: new Date(),
          revokeReason: typeof req.body.reason === 'string' ? req.body.reason.trim().slice(0, 500) : '',
        },
      },
      { new: true }
    );
    if (!revoked) {
      return res.status(409).json({
        success: false,
        message: 'This streak adjustment has already been revoked.',
      });
    }

    const streak = await computeParticipantStreak(challenge._id, revoked.participant);

    return res.status(200).json({
      success: true,
      message: 'Streak protection revoked.',
      adjustment: serializeAdjustment(revoked),
      streak,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * The authenticated participant's own protected days + streak summary.
 * GET /api/streak-adjustments/mine?challengeId=...
 */
const getMyAdjustments = async (req, res, next) => {
  try {
    const { challengeId } = req.query;
    if (!challengeId || !isObjectId(challengeId)) {
      return res.status(400).json({ success: false, message: 'A valid challengeId query parameter is required.' });
    }

    const membership = await ChallengeMembership.findOne({
      challenge: challengeId,
      user: req.user._id,
      status: 'active',
    });
    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not an active member of this challenge.',
      });
    }

    const adjustments = await StreakAdjustment.find({
      challenge: challengeId,
      participant: req.user._id,
      status: 'active',
    })
      .populate('grantedBy', 'name')
      .sort({ date: -1 });

    const streak = await computeParticipantStreak(challengeId, req.user._id);

    res.set('Cache-Control', 'no-store');
    return res.status(200).json({
      success: true,
      streak,
      adjustments: adjustments.map((adj) => ({
        _id: adj._id,
        date: adj.date,
        reason: adj.reason,
        grantedBy: adj.grantedBy ? { name: adj.grantedBy.name } : null,
        grantedAt: adj.grantedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  grantAdjustment,
  listAdjustments,
  revokeAdjustment,
  getMyAdjustments,
  computeParticipantStreak,
};
