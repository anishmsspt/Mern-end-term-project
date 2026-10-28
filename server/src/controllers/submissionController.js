const Submission = require('../models/Submission');
const Challenge = require('../models/Challenge');
const ChallengeMembership = require('../models/ChallengeMembership');
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

module.exports = {
  createSubmission,
  getMySubmissions,
  getSubmissionById,
};
