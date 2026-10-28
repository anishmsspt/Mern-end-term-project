const crypto = require('crypto');
const Challenge = require('../models/Challenge');
const ChallengeMembership = require('../models/ChallengeMembership');

/**
 * Join an active challenge using a valid join code
 * Restricted to authenticated Participants
 */
const joinChallenge = async (req, res, next) => {
  try {
    const { joinCode } = req.body;

    if (!joinCode || typeof joinCode !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Join code is required.',
      });
    }

    // Role check: Only Participants may join as challenge participants
    if (req.user.role !== 'participant') {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Accounts with role '${req.user.role}' cannot join challenges as participants.`,
      });
    }

    const normalizedCode = joinCode.trim().toUpperCase();

    // Find challenge by joinCode
    const challenge = await Challenge.findOne({ joinCode: normalizedCode });
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: `No challenge found with join code '${normalizedCode}'. Please verify and try again.`,
      });
    }

    // Check challenge lifecycle status
    if (challenge.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Cannot join challenge: Challenge status is currently '${challenge.status}'.`,
      });
    }

    const now = new Date();

    // Check challenge start date
    if (challenge.startDate && now < challenge.startDate) {
      return res.status(400).json({
        success: false,
        message: `Cannot join challenge: This challenge does not begin until ${challenge.startDate.toLocaleDateString()}.`,
      });
    }

    // Check challenge end date
    if (challenge.endDate && now > challenge.endDate) {
      return res.status(400).json({
        success: false,
        message: `Cannot join challenge: This challenge concluded on ${challenge.endDate.toLocaleDateString()}.`,
      });
    }

    // Check for existing membership (duplicate prevention)
    const existingMembership = await ChallengeMembership.findOne({
      user: req.user._id,
      challenge: challenge._id,
    });

    if (existingMembership) {
      return res.status(409).json({
        success: false,
        message: 'You are already a registered member of this challenge.',
        membership: existingMembership,
        challenge,
      });
    }

    // Create membership
    const membership = await ChallengeMembership.create({
      user: req.user._id,
      challenge: challenge._id,
      role: 'participant',
      status: 'active',
    });

    return res.status(201).json({
      success: true,
      message: `Successfully joined '${challenge.title}'!`,
      membership,
      challenge,
    });
  } catch (error) {
    // Handle unique constraint race condition gracefully
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'You are already a member of this challenge.',
      });
    }
    next(error);
  }
};

/**
 * List challenges relevant to the authenticated user
 * - Hosts see challenges they own
 * - Participants see challenges they have joined
 */
const getMyChallenges = async (req, res, next) => {
  try {
    if (req.user.role === 'host' || req.user.role === 'admin') {
      const challenges = await Challenge.find({ host: req.user._id }).sort({ createdAt: -1 });
      return res.status(200).json({
        success: true,
        challenges,
      });
    }

    // Participant lookup
    const memberships = await ChallengeMembership.find({
      user: req.user._id,
      status: 'active',
    })
      .populate('challenge')
      .sort({ createdAt: -1 });

    const challenges = memberships
      .map((m) => m.challenge)
      .filter((c) => c !== null);

    return res.status(200).json({
      success: true,
      challenges,
      memberships,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new challenge (Host only)
 */
const createChallenge = async (req, res, next) => {
  try {
    const {
      title,
      description,
      joinCode,
      startDate,
      endDate,
      rules,
    } = req.body;

    if (!title || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Title, startDate, and endDate are required fields.',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: 'Challenge endDate must be strictly after startDate.',
      });
    }

    // Generate joinCode if not provided
    const finalCode = (joinCode || crypto.randomBytes(4).toString('hex')).toUpperCase().trim();

    // Check joinCode collision
    const existing = await Challenge.findOne({ joinCode: finalCode });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Join code '${finalCode}' is already in use by another challenge. Please choose another code.`,
      });
    }

    const challenge = await Challenge.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      joinCode: finalCode,
      host: req.user._id,
      startDate: start,
      endDate: end,
      status: 'active',
      rules: rules || {},
    });

    return res.status(201).json({
      success: true,
      message: 'Challenge created successfully.',
      challenge,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single challenge details
 */
const getChallengeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const challenge = await Challenge.findById(id).populate('host', 'name email leetcodeUsername');

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found.',
      });
    }

    const participantCount = await ChallengeMembership.countDocuments({
      challenge: challenge._id,
      status: 'active',
    });

    return res.status(200).json({
      success: true,
      challenge,
      participantCount,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  joinChallenge,
  getMyChallenges,
  createChallenge,
  getChallengeById,
};
