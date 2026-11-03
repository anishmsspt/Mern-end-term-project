const Submission = require('../models/Submission');
const Challenge = require('../models/Challenge');
const ChallengeMembership = require('../models/ChallengeMembership');
const ScoreTransaction = require('../models/ScoreTransaction');
const { parseLeetCodeUrl } = require('../utils/leetcodeValidator');
const { toLocalDateString, parseDateBoundary } = require('../utils/dateUtils');
const { getProblem } = require('../services/leetcodeClient');
const ProblemCache = require('../models/ProblemCache');
const { pointsForDifficulty } = require('../utils/scoring');
const { parseIstDateBoundary, istDateKey } = require('../utils/istDate');

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

    if (challenge.startDate) {
      const challengeStartDay = parseDateBoundary(challenge.startDate, 'start');
      if (now < challengeStartDay) {
        return res.status(400).json({
          success: false,
          message: `Challenge has not started yet. Starts on ${toLocalDateString(challenge.startDate)}.`,
        });
      }
    }

    if (challenge.endDate) {
      const challengeEndDay = parseDateBoundary(challenge.endDate, 'end');
      if (now > challengeEndDay) {
        return res.status(400).json({
          success: false,
          message: `Challenge has ended. Ended on ${toLocalDateString(challenge.endDate)}.`,
        });
      }
    }

    // Verify participant membership
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

    // Validate LeetCode URL
    const urlValidation = parseLeetCodeUrl(problemUrl);
    if (!urlValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: urlValidation.error,
      });
    }

    const { slug, canonicalUrl } = urlValidation;

    // Resolve difficulty/title server-side
    let authoritativeProblem = await ProblemCache.findOne({ slug });

    if (
      !authoritativeProblem ||
      Date.now() - authoritativeProblem.fetchedAt.getTime() > 30 * 86400000
    ) {
      try {
        const details = await getProblem(slug);

        if (details && ['Easy', 'Medium', 'Hard'].includes(details.difficulty)) {
          authoritativeProblem = await ProblemCache.findOneAndUpdate(
            { slug },
            {
              $set: {
                title: details.title,
                difficulty: details.difficulty,
                fetchedAt: new Date(),
              },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        }
      } catch (lookupError) {
        console.warn(
          `[LeetCode] Difficulty lookup failed for ${slug}: ${lookupError.message}`
        );
      }
    }

    const verifiedDifficulty = ['Easy', 'Medium', 'Hard'].includes(
      authoritativeProblem?.difficulty
    )
      ? authoritativeProblem.difficulty
      : 'Unknown';

    const verifiedTitle = authoritativeProblem?.title || problemTitle.trim();

    // Validate completion date
    const parsedDate = parseDateBoundary(completionDate, 'default');

    if (!parsedDate || isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid completionDate: Must be a valid date string.',
      });
    }

    const completionDateDayStart = parseDateBoundary(completionDate, 'start');
    const todayEnd = parseDateBoundary(new Date(), 'end');

    if (completionDateDayStart > todayEnd) {
      return res.status(400).json({
        success: false,
        message: 'Completion date cannot be set in the future.',
      });
    }

    // Check against challenge start date
    if (challenge.startDate) {
      const challengeStartDay = parseDateBoundary(challenge.startDate, 'start');

      if (completionDateDayStart < challengeStartDay) {
        return res.status(400).json({
          success: false,
          message: `Completion date cannot precede the challenge start date (${toLocalDateString(challenge.startDate)}).`,
        });
      }
    }

    // Prevent duplicate solves
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

    // Check daily submission limit
    if (challenge.rules?.maxSubmissionsPerDay) {
      const dayStart = parseIstDateBoundary(istDateKey(parsedDate), 'start');
      const dayEnd = parseIstDateBoundary(istDateKey(parsedDate), 'end');

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

    // Save submission with server-generated receipt time
    let submission;

    try {
      submission = await Submission.create({
        participant: req.user._id,
        challenge: challenge._id,
        problemTitle: verifiedTitle,
        problemUrl: canonicalUrl,
        problemSlug: slug,
        difficulty: verifiedDifficulty,
        difficultyVerified: verifiedDifficulty !== 'Unknown',
        activeDuplicateKey: `${req.user._id}:${challenge._id}:${slug}`,
        source: 'manual',
        receivedAt: new Date(),
        completionDate: parsedDate,
        notes: notes ? String(notes).trim() : '',
        evidenceUrl: evidenceUrl ? String(evidenceUrl).trim() : '',
        status: 'Pending',
      });
    } catch (createError) {
      if (createError.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'This problem already has a pending or approved submission in this challenge.',
        });
      }

      throw createError;
    }

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

    // Only the submitting participant, challenge host, or admin may view it.
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
    if (req.user.role !== 'host' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Access to the Host review queue is restricted to Host accounts.',
      });
    }

    const { challengeId, participantId, completionDate, status } = req.query;

    // Fetch all challenges owned by this Host.
    const hostChallenges = await Challenge.find({
      host: req.user._id,
    }).select('_id');

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

    // Validate requested challenge ownership.
    let targetChallengeIds = hostChallengeIds;

    if (challengeId) {
      const isOwned = hostChallengeIds.some(
        (id) => id.toString() === challengeId
      );

      if (!isOwned && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You do not have host authorization for the requested challenge.',
        });
      }

      targetChallengeIds = [challengeId];
    }

    // Build query filter.
    const query = {
      challenge: { $in: targetChallengeIds },
    };

    // Default to Pending; allow all or a specific status.
    if (!status || status.toLowerCase() === 'pending') {
      query.status = 'Pending';
    } else if (status.toLowerCase() !== 'all') {
      query.status = status;
    }

    if (participantId) {
      query.participant = participantId;
    }

    if (completionDate) {
      const dayStart = parseIstDateBoundary(completionDate, 'start');

      if (!isNaN(dayStart.getTime())) {
        const dayEnd = parseIstDateBoundary(completionDate, 'end');

        query.completionDate = {
          $gte: dayStart,
          $lte: dayEnd,
        };
      }
    }

    // Pagination and FIFO sorting.
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit) || 20)
    );

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
 * Host Submission Analytics
 *
 * Activity-time semantics:
 * - Automated: original LeetCode submittedAt timestamp.
 * - Manual: server receivedAt timestamp.
 * - Older records without either timestamp fall back to createdAt.
 *
 * All statuses are included.
 */
const getSubmissionAnalytics = async (req, res, next) => {
  try {
    if (req.user.role !== 'host' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only challenge Hosts may access submission analytics.',
      });
    }

    const { challengeId } = req.params;

    const challenge = await Challenge.findById(challengeId)
      .select('_id title host');

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found.',
      });
    }

    const isChallengeHost =
      challenge.host && challenge.host.equals(req.user._id);

    if (!isChallengeHost && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to view analytics for this challenge.',
      });
    }

    const analyticsResult = await Submission.aggregate([
      {
        $match: {
          challenge: challenge._id,
        },
      },
      {
        $addFields: {
          activityTime: {
            $cond: [
              {
                $and: [
                  { $eq: ['$source', 'automated'] },
                  { $ne: ['$leetcode.submittedAt', null] },
                ],
              },
              '$leetcode.submittedAt',
              { $ifNull: ['$receivedAt', '$createdAt'] },
            ],
          },
        },
      },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                firstSubmissionAt: { $min: '$activityTime' },
                lastSubmissionAt: { $max: '$activityTime' },
              },
            },
          ],

          statusBreakdown: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],

          sourceBreakdown: [
            {
              $group: {
                _id: '$source',
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],

          hourlyActivity: [
            {
              $group: {
                _id: {
                  $hour: {
                    date: '$activityTime',
                    timezone: 'Asia/Kolkata',
                  },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],

          dailyActivity: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$activityTime',
                    timezone: 'Asia/Kolkata',
                  },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],

          participantActivity: [
            {
              $group: {
                _id: '$participant',
                total: { $sum: 1 },

                manual: {
                  $sum: {
                    $cond: [
                      { $eq: ['$source', 'manual'] },
                      1,
                      0,
                    ],
                  },
                },

                automated: {
                  $sum: {
                    $cond: [
                      { $eq: ['$source', 'automated'] },
                      1,
                      0,
                    ],
                  },
                },

                firstSubmissionAt: {
                  $min: '$activityTime',
                },

                lastSubmissionAt: {
                  $max: '$activityTime',
                },
              },
            },
            { $sort: { total: -1, lastSubmissionAt: -1 } },
          ],
        },
      },
    ]);

    const result = analyticsResult[0] || {};

    const summary = result.summary?.[0] || {
      total: 0,
      firstSubmissionAt: null,
      lastSubmissionAt: null,
    };

    // Resolve participant names and usernames.
    const memberships = await ChallengeMembership.find({
      challenge: challenge._id,
    }).populate('user', 'name email leetcodeUsername');

    const participantById = new Map();

    memberships.forEach((membership) => {
      if (membership.user) {
        participantById.set(
          membership.user._id.toString(),
          membership.user
        );
      }
    });

    const participantActivity = (
      result.participantActivity || []
    ).map((item) => {
      const participant = participantById.get(
        item._id.toString()
      );

      return {
        participant: participant
          ? {
              _id: participant._id,
              name: participant.name,
              email: participant.email,
              leetcodeUsername: participant.leetcodeUsername,
            }
          : {
              _id: item._id,
            },

        total: item.total,
        manual: item.manual,
        automated: item.automated,
        firstSubmissionAt: item.firstSubmissionAt,
        lastSubmissionAt: item.lastSubmissionAt,
      };
    });

    const hourlyCounts = new Map(
      (result.hourlyActivity || []).map((item) => [
        item._id,
        item.count,
      ])
    );

    // Return all 24 IST hours, including zero-activity hours.
    const hourlyActivity = Array.from(
      { length: 24 },
      (_, hour) => ({
        hour,
        count: hourlyCounts.get(hour) || 0,
      })
    );

    return res.status(200).json({
      success: true,

      challenge: {
        _id: challenge._id,
        title: challenge.title,
      },

      summary: {
        total: summary.total,
        firstSubmissionAt: summary.firstSubmissionAt,
        lastSubmissionAt: summary.lastSubmissionAt,
      },

      statusBreakdown: result.statusBreakdown || [],
      sourceBreakdown: result.sourceBreakdown || [],

      hourlyActivity,

      dailyActivity: (result.dailyActivity || []).map((item) => ({
        date: item._id,
        count: item.count,
      })),

      participantActivity,

      timezone: 'Asia/Kolkata',

      activityTimeDefinitions: {
        automated: 'Original LeetCode submission time (leetcode.submittedAt)',
        manual: 'Time the Unanimous backend received the submission (receivedAt)',
        legacyFallback: 'Database creation time (createdAt) when the relevant timestamp is unavailable',
      },
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
    const { action, decision, reviewNotes } = req.body;

    // Role check: Only Host or Admin
    if (req.user.role !== 'host' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only challenge Hosts are authorized to review submissions.',
      });
    }

    // Validate decision
    const normalizedDecision = String(
      decision ?? action ?? ''
    ).toLowerCase().trim();

    if (
      normalizedDecision !== 'approve' &&
      normalizedDecision !== 'reject'
    ) {
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

    // Can only review Pending submissions
    if (submission.status !== 'Pending') {
      return res.status(409).json({
        success: false,
        message: `Conflict: This submission has already been reviewed (current status: '${submission.status}').`,
        submission,
      });
    }

    if (normalizedDecision === 'approve') {
      if (
        !submission.difficultyVerified ||
        !['Easy', 'Medium', 'Hard'].includes(submission.difficulty)
      ) {
        return res.status(409).json({
          success: false,
          message: 'Cannot approve until the problem difficulty has been verified by LeetCode.',
        });
      }

      const serverPoints = pointsForDifficulty(submission.difficulty);

      // Atomic update prevents concurrent double approval.
      const updatedSubmission = await Submission.findOneAndUpdate(
        { _id: id, status: 'Pending' },
        {
          $set: {
            status: 'Approved',
            pointsAwarded: serverPoints,
            reviewer: req.user._id,
            reviewedAt: new Date(),
            reviewNotes: reviewNotes
              ? String(reviewNotes).trim()
              : 'Approved by Host',
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

      // Persist immutable ScoreTransaction audit record.
      await ScoreTransaction.findOneAndUpdate(
        { submission: updatedSubmission._id },
        {
          $setOnInsert: {
            participant: updatedSubmission.participant._id,
            challenge: updatedSubmission.challenge._id,
            submission: updatedSubmission._id,
            points: serverPoints,
            awardedBy: req.user._id,
            reason: `Approved ${updatedSubmission.difficulty} solve: ${updatedSubmission.problemTitle}`,
            awardedAt: new Date(),
          },
        },
        { upsert: true, new: true }
      );

      return res.status(200).json({
        success: true,
        message: `Submission approved successfully. ${serverPoints} points allocated.`,
        submission: updatedSubmission,
      });
    }

    if (normalizedDecision === 'reject') {
      const reason = reviewNotes || req.body.rejectionReason;

      if (
        !reason ||
        typeof reason !== 'string' ||
        !reason.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: 'Rejection requires a non-empty reviewNotes or rejectionReason explaining why the submission was rejected.',
        });
      }

      // Atomic conditional update.
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
          $unset: {
            activeDuplicateKey: 1,
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

      // Rejection awards no points, so no ScoreTransaction is written.

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
  getSubmissionAnalytics,
  reviewSubmission,
};
