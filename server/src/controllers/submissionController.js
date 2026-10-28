const Submission = require('../models/Submission');
const Challenge = require('../models/Challenge');
const ChallengeMembership = require('../models/ChallengeMembership');
const ScoreTransaction = require('../models/ScoreTransaction');
const { parseLeetCodeUrl } = require('../utils/leetcodeValidator');

/**
 * Submit a solved LeetCode problem
 * Authenticated Participant only
 */
const createSubmission = async (req, res, next) => {
  try {
    const {
      challengeId,
      problemTitle,
      problemUrl,
      difficulty,
      completionDate,
      notes,
      evidenceUrl,
    } = req.body;

    // Role check: Only participants can submit activity
    if (req.user.role !== 'participant') {
      return res.status(403).json({
        success: false,
        message: 'Only registered challenge participants may submit problem solutions.',
      });
    }

    if (!challengeId || !problemTitle || !problemUrl || !completionDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: challengeId, problemTitle, problemUrl, and completionDate are required.',
      });
    }

    // Verify challenge exists and is active
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found.',
      });
    }

    if (challenge.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Submissions are closed: Challenge is currently '${challenge.status}'.`,
      });
    }

    const now = new Date();
    if (challenge.startDate && now < challenge.startDate) {
      return res.status(400).json({
        success: false,
        message: `Challenge has not started yet. Starts on ${challenge.startDate.toLocaleDateString()}.`,
      });
    }

    if (challenge.endDate && now > challenge.endDate) {
      return res.status(400).json({
        success: false,
        message: `Challenge has ended. Ended on ${challenge.endDate.toLocaleDateString()}.`,
      });
    }

    // Verify participant membership in this challenge
    const membership = await ChallengeMembership.findOne({
      user: req.user._id,
      challenge: challenge._id,
      status: 'active',
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You must be an active registered member of this challenge to submit problems.',
      });
    }

    // Validate LeetCode URL and extract canonical slug
    const urlValidation = parseLeetCodeUrl(problemUrl);
    if (!urlValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: urlValidation.error,
      });
    }

    const { slug, canonicalUrl } = urlValidation;

    // Validate completion date
    const parsedDate = new Date(completionDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid completionDate: Must be a valid ISO date string.',
      });
    }

    // Future date validation
    if (parsedDate > now) {
      return res.status(400).json({
        success: false,
        message: 'Completion date cannot be set in the future.',
      });
    }

    // Check against challenge start date
    if (challenge.startDate && parsedDate < challenge.startDate) {
      return res.status(400).json({
        success: false,
        message: `Completion date cannot precede the challenge start date (${challenge.startDate.toLocaleDateString()}).`,
      });
    }

    // Duplicate solve prevention:
    // A participant cannot submit a problem if they already have a Pending or Approved submission for it
    const existingQualifying = await Submission.findOne({
      participant: req.user._id,
      challenge: challenge._id,
      problemSlug: slug,
      status: { $in: ['Pending', 'Approved'] },
    });

    if (existingQualifying) {
      return res.status(409).json({
        success: false,
        message: `Duplicate solve rejected: You already have a '${existingQualifying.status}' submission for problem '${slug}' in this challenge.`,
        existingSubmissionId: existingQualifying._id,
      });
    }

    // Check daily submission limit rule if configured
    if (challenge.rules?.maxSubmissionsPerDay) {
      const dayStart = new Date(parsedDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(parsedDate);
      dayEnd.setHours(23, 59, 59, 999);

      const daySubmissionsCount = await Submission.countDocuments({
        participant: req.user._id,
        challenge: challenge._id,
        completionDate: { $gte: dayStart, $lte: dayEnd },
        status: { $in: ['Pending', 'Approved'] },
      });

      if (daySubmissionsCount >= challenge.rules.maxSubmissionsPerDay) {
        return res.status(429).json({
          success: false,
          message: `Daily submission limit reached: Challenge allows at most ${challenge.rules.maxSubmissionsPerDay} submissions per day.`,
        });
      }
    }

    // Save submission with guaranteed initial status 'Pending'
    const submission = await Submission.create({
      participant: req.user._id,
      challenge: challenge._id,
      problemTitle: problemTitle.trim(),
      problemUrl: canonicalUrl,
      problemSlug: slug,
      difficulty: difficulty || 'Unknown',
      completionDate: parsedDate,
      notes: notes ? String(notes).trim() : '',
      evidenceUrl: evidenceUrl ? String(evidenceUrl).trim() : '',
      status: 'Pending',
    });

    return res.status(201).json({
      success: true,
      message: 'Problem submission received! Status is Pending review by Host.',
      submission,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get submissions for the authenticated participant
 * Supports optional ?challengeId=... filter
 */
const getMySubmissions = async (req, res, next) => {
  try {
    const { challengeId, status } = req.query;

    const filter = {
      participant: req.user._id,
    };

    if (challengeId) {
      filter.challenge = challengeId;
    }

    if (status) {
      filter.status = status;
    }

    const submissions = await Submission.find(filter)
      .populate('challenge', 'title joinCode')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: submissions.length,
      submissions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single submission by ID with strict Data Isolation
 */
const getSubmissionById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const submission = await Submission.findById(id)
      .populate('participant', 'name email leetcodeUsername')
      .populate('challenge', 'title joinCode host');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found.',
      });
    }

    // Participant Data Isolation Check:
    // Only the submitting participant OR the Host who owns the challenge may view this submission
    const isOwner = submission.participant._id.equals(req.user._id);
    const isChallengeHost =
      submission.challenge &&
      submission.challenge.host &&
      submission.challenge.host.equals(req.user._id);
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isChallengeHost && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to inspect this participant\'s submission.',
      });
    }

    return res.status(200).json({
      success: true,
      submission,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Host Review Queue
 * Retrieves submissions for challenges managed by the authenticated Host
 */
const getReviewQueue = async (req, res, next) => {
  try {
    // Role check: Only Host or Admin accounts may access the review queue
    if (req.user.role !== 'host' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Access to the Host review queue is restricted to Host accounts.',
      });
    }

    const { challengeId, participantId, completionDate, status } = req.query;

    // 1. Fetch all challenges owned by this Host
    const hostChallenges = await Challenge.find({ host: req.user._id }).select('_id');
    const hostChallengeIds = hostChallenges.map((c) => c._id);

    if (hostChallengeIds.length === 0) {
      return res.status(200).json({
        success: true,
        total: 0,
        page: 1,
        totalPages: 0,
        submissions: [],
      });
    }

    // 2. Validate challengeId filter if provided
    let targetChallengeIds = hostChallengeIds;
    if (challengeId) {
      const isOwned = hostChallengeIds.some((id) => id.toString() === challengeId);
      if (!isOwned && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You do not have host authorization for the requested challenge.',
        });
      }
      targetChallengeIds = [challengeId];
    }

    // 3. Build query filter
    const query = {
      challenge: { $in: targetChallengeIds },
    };

    // Default to 'Pending' if no status is specified; allow 'all' or specific status
    if (!status || status.toLowerCase() === 'pending') {
      query.status = 'Pending';
    } else if (status.toLowerCase() !== 'all') {
      query.status = status;
    }

    if (participantId) {
      query.participant = participantId;
    }

    if (completionDate) {
      const dayStart = new Date(completionDate);
      if (!isNaN(dayStart.getTime())) {
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(completionDate);
        dayEnd.setHours(23, 59, 59, 999);
        query.completionDate = { $gte: dayStart, $lte: dayEnd };
      }
    }

    // 4. Pagination & deterministic sorting (FIFO: oldest pending first)
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [total, submissions] = await Promise.all([
      Submission.countDocuments(query),
      Submission.find(query)
        .populate('participant', 'name email leetcodeUsername')
        .populate('challenge', 'title joinCode rules')
        .populate('reviewer', 'name email')
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      submissions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Host Review Action: Approve or Reject a submission
 * Enforces atomic conditional updates and host-to-challenge authorization
 */
const reviewSubmission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { decision, pointsAwarded, reviewNotes } = req.body;

    // Role check: Only Host or Admin
    if (req.user.role !== 'host' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only challenge Hosts are authorized to review submissions.',
      });
    }

    // Validate decision
    const normalizedDecision = decision && String(decision).toLowerCase().trim();
    if (normalizedDecision !== 'approve' && normalizedDecision !== 'reject') {
      return res.status(400).json({
        success: false,
        message: "Invalid review decision: Must be either 'approve' or 'reject'.",
      });
    }

    // Find submission and verify challenge ownership
    const submission = await Submission.findById(id).populate('challenge');
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found.',
      });
    }

    // Host-to-Challenge authorization check
    const isChallengeHost =
      submission.challenge &&
      submission.challenge.host &&
      submission.challenge.host.equals(req.user._id);

    if (!isChallengeHost && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to review submissions for this challenge.',
      });
    }

    // State validation: Can only review Pending submissions
    if (submission.status !== 'Pending') {
      return res.status(409).json({
        success: false,
        message: `Conflict: This submission has already been reviewed (current status: '${submission.status}').`,
        submission,
      });
    }

    const MAX_POINTS = 100;

    if (normalizedDecision === 'approve') {
      // Validate pointsAwarded: strictly positive integer within bounds
      if (
        pointsAwarded === undefined ||
        pointsAwarded === null ||
        typeof pointsAwarded !== 'number' ||
        !Number.isInteger(pointsAwarded) ||
        pointsAwarded <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: 'Approval requires a positive integer point value (pointsAwarded > 0). Fractional, zero, or negative points are invalid.',
        });
      }

      if (pointsAwarded > MAX_POINTS) {
        return res.status(400).json({
          success: false,
          message: `Approval points cannot exceed the maximum limit of ${MAX_POINTS} points.`,
        });
      }

      // Atomic conditional update ensuring concurrent requests cannot double-approve
      const updatedSubmission = await Submission.findOneAndUpdate(
        { _id: id, status: 'Pending' },
        {
          $set: {
            status: 'Approved',
            pointsAwarded,
            reviewer: req.user._id,
            reviewedAt: new Date(),
            reviewNotes: reviewNotes ? String(reviewNotes).trim() : 'Approved by Host',
            rejectionReason: '',
          },
        },
        { new: true }
      )
        .populate('participant', 'name email leetcodeUsername')
        .populate('challenge', 'title joinCode');

      if (!updatedSubmission) {
        return res.status(409).json({
          success: false,
          message: 'Conflict: This submission was already reviewed by another simultaneous request.',
        });
      }

      // Persist immutable ScoreTransaction audit record
      await ScoreTransaction.findOneAndUpdate(
        { submission: updatedSubmission._id },
        {
          $setOnInsert: {
            participant: updatedSubmission.participant._id,
            challenge: updatedSubmission.challenge._id,
            submission: updatedSubmission._id,
            points: pointsAwarded,
            awardedBy: req.user._id,
            reason: `Approved solve: ${updatedSubmission.problemTitle}`,
            awardedAt: new Date(),
          },
        },
        { upsert: true, new: true }
      );

      return res.status(200).json({
        success: true,
        message: `Submission approved successfully. ${pointsAwarded} points allocated.`,
        submission: updatedSubmission,
      });
    }

    if (normalizedDecision === 'reject') {
      // Validate rejection reason: non-empty string required
      const reason = reviewNotes || req.body.rejectionReason;
      if (!reason || typeof reason !== 'string' || !reason.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Rejection requires a non-empty reviewNotes or rejectionReason explaining why the submission was rejected.',
        });
      }

      // Atomic conditional update
      const updatedSubmission = await Submission.findOneAndUpdate(
        { _id: id, status: 'Pending' },
        {
          $set: {
            status: 'Rejected',
            pointsAwarded: 0,
            reviewer: req.user._id,
            reviewedAt: new Date(),
            reviewNotes: reason.trim(),
            rejectionReason: reason.trim(),
          },
        },
        { new: true }
      )
        .populate('participant', 'name email leetcodeUsername')
        .populate('challenge', 'title joinCode');

      if (!updatedSubmission) {
        return res.status(409).json({
          success: false,
          message: 'Conflict: This submission was already reviewed by another simultaneous request.',
        });
      }

      // Persist immutable ScoreTransaction audit record
      await ScoreTransaction.findOneAndUpdate(
        { submission: updatedSubmission._id },
        {
          $setOnInsert: {
            participant: updatedSubmission.participant._id,
            challenge: updatedSubmission.challenge._id,
            submission: updatedSubmission._id,
            points: pointsAwarded,
            awardedBy: req.user._id,
            reason: `Approved solve: ${updatedSubmission.problemTitle}`,
            awardedAt: new Date(),
          },
        },
        { upsert: true, new: true }
      );

      return res.status(200).json({
        success: true,
        message: 'Submission rejected. Feedback recorded and 0 points awarded.',
        submission: updatedSubmission,
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSubmission,
  getMySubmissions,
  getSubmissionById,
  getReviewQueue,
  reviewSubmission,
};
