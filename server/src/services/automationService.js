
const crypto = require('crypto');
const AutomationEnrollment = require('../models/AutomationEnrollment');
const ProblemCache = require('../models/ProblemCache');
const Submission = require('../models/Submission');
const Challenge = require('../models/Challenge');
const ChallengeMembership = require('../models/ChallengeMembership');
const leetcode = require('./leetcodeClient');
const { istDateKey, parseIstDateBoundary } = require('../utils/istDate');

const VERIFICATION_TTL_MS = 30 * 60 * 1000;
const SYNC_INTERVAL_MS = 10 * 60 * 1000;
const MANUAL_SYNC_COOLDOWN_MS = 5 * 60 * 1000;
const LEASE_MS = 7 * 60 * 1000;

async function startVerification({ userId, challengeId, username }) {
  const normalized = String(username || '').trim().replace(/^@/, '').toLowerCase();

  if (!/^[a-z0-9_-]{1,50}$/.test(normalized)) {
    throw new Error('Enter a valid LeetCode username.');
  }

  const [challenge, membership] = await Promise.all([
    Challenge.findById(challengeId),
    ChallengeMembership.findOne({
      user: userId,
      challenge: challengeId,
      status: 'active',
    }),
  ]);

  if (!challenge || challenge.status !== 'active') {
    throw new Error('Challenge is not active or does not exist.');
  }

  if (!challenge.automation?.enabled) {
    throw new Error('The challenge host has not enabled automation.');
  }

  if (!membership) {
    throw new Error('Join this challenge before enabling automation.');
  }

  const verificationCode = `UNANIMOUS-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;

  const enrollment = await AutomationEnrollment.findOneAndUpdate(
    { user: userId, challenge: challengeId },
    {
      $set: {
        leetcodeUsername: normalized,
        verificationCode,
        verificationExpiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
        verificationAttempts: 0,
        verifiedAt: null,
        consentedAt: new Date(),
        status: 'pending_verification',
        lastError: '',
        leaseUntil: null,
        leaseToken: '',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return {
    enrollment,
    verificationCode,
    expiresAt: enrollment.verificationExpiresAt,
  };
}

async function confirmVerification({ userId, challengeId }) {
  const enrollment = await AutomationEnrollment.findOne({
    user: userId,
    challenge: challengeId,
  });

  if (!enrollment || enrollment.status !== 'pending_verification') {
    throw new Error('Start account verification first.');
  }

  if (!enrollment.verificationExpiresAt || enrollment.verificationExpiresAt < new Date()) {
    throw new Error('Verification code expired. Start verification again.');
  }

  if (enrollment.verificationAttempts >= 5) {
    throw new Error('Too many verification attempts. Start verification again later.');
  }

  enrollment.verificationAttempts += 1;

  let profile;

  try {
    profile = await leetcode.getPublicProfile(enrollment.leetcodeUsername);
  } catch (error) {
    await enrollment.save();
    throw new Error(`Could not verify with LeetCode right now: ${error.message}`);
  }

  const aboutMe = String(profile?.profile?.aboutMe || '');

  if (
    !profile ||
    profile.username?.toLowerCase() !== enrollment.leetcodeUsername ||
    !aboutMe.includes(enrollment.verificationCode)
  ) {
    await enrollment.save();
    throw new Error('Verification code was not found in your public LeetCode About Me.');
  }

  enrollment.status = 'active';
  enrollment.verifiedAt = new Date();
  enrollment.enrolledAt = new Date();

  // No historical backfill on new enrollment/re-enrollment.
  enrollment.checkpointTimestamp = Math.floor(
    enrollment.enrolledAt.getTime() / 1000
  );

  enrollment.checkpointSubmissionId = '';
  enrollment.nextSyncAt = new Date();
  enrollment.lastError = '';
  enrollment.consecutiveFailures = 0;
  enrollment.verificationCode = '';
  enrollment.verificationExpiresAt = null;

  await enrollment.save();

  return enrollment;
}

async function setEnrollmentStatus(userId, challengeId, status) {
  const enrollment = await AutomationEnrollment.findOne({
    user: userId,
    challenge: challengeId,
  });

  if (!enrollment) {
    throw new Error('Automation enrollment not found.');
  }

  if (status === 'active' && !enrollment.verifiedAt) {
    throw new Error('Verify your LeetCode account before resuming automation.');
  }

  enrollment.status = status;

  if (status === 'active') {
    enrollment.nextSyncAt = new Date();
  }

  if (status === 'disconnected') {
    enrollment.leaseUntil = null;
    enrollment.leaseToken = '';
  }

  await enrollment.save();

  return enrollment;
}

async function syncEnrollment(enrollmentId, { manual = false } = {}) {
  const leaseToken = crypto.randomBytes(12).toString('hex');
  const now = new Date();

  const filter = {
    _id: enrollmentId,
    status: 'active',
    $or: [
      { leaseUntil: null },
      { leaseUntil: { $lt: now } },
    ],
  };

  if (manual) {
    filter.$and = [
      {
        $or: [
          { lastManualSyncAt: null },
          {
            lastManualSyncAt: {
              $lt: new Date(now.getTime() - MANUAL_SYNC_COOLDOWN_MS),
            },
          },
        ],
      },
    ];
  }

  const enrollment = await AutomationEnrollment.findOneAndUpdate(
    filter,
    {
      $set: {
        leaseUntil: new Date(now.getTime() + LEASE_MS),
        leaseToken,
        ...(manual ? { lastManualSyncAt: now } : {}),
      },
    },
    { new: true }
  );

  if (!enrollment) {
    return {
      skipped: true,
      reason: 'Sync is already running, paused, or on cooldown.',
    };
  }

  try {
    const challenge = await Challenge.findById(enrollment.challenge);

    const membership = await ChallengeMembership.findOne({
      user: enrollment.user,
      challenge: enrollment.challenge,
      status: 'active',
    });

    if (!challenge?.automation?.enabled || challenge.status !== 'active' || !membership) {
      await AutomationEnrollment.updateOne(
        { _id: enrollment._id, leaseToken },
        { $unset: { leaseUntil: 1, leaseToken: 1 } }
      );

      return {
        skipped: true,
        reason: 'Challenge automation or membership is inactive.',
      };
    }

    const recent = await leetcode.getRecentAccepted(
      enrollment.leetcodeUsername,
      20
    );

    const ordered = [...recent].sort(
      (a, b) => Number(a.timestamp) - Number(b.timestamp)
    );

    const checkpoint = Number(enrollment.checkpointTimestamp || 0);
    const oldest = ordered.length ? Number(ordered[0].timestamp) : 0;

    const gapDetected =
      ordered.length === 20 &&
      checkpoint > 0 &&
      oldest > checkpoint + 1;

    let imported = 0;
    let skipped = 0;

    let maxTimestamp = checkpoint;
    let maxId = enrollment.checkpointSubmissionId;

    for (const item of ordered) {
      const stillActive = await AutomationEnrollment.exists({
        _id: enrollment._id,
        status: 'active',
        leaseToken,
      });

      if (!stillActive) break;

      const timestamp = Number(item.timestamp);

      if (
        !item.id ||
        !item.titleSlug ||
        !timestamp ||
        timestamp < Math.floor(enrollment.enrolledAt.getTime() / 1000)
      ) {
        skipped += 1;
        continue;
      }

      if (timestamp > maxTimestamp) {
        maxTimestamp = timestamp;
        maxId = String(item.id);
      }

      // Original LeetCode submission timestamp.
      const submittedAt = new Date(timestamp * 1000);

      if (submittedAt < enrollment.enrolledAt) {
        skipped += 1;
        continue;
      }

      // Duplicate detection.
      const duplicate = await Submission.findOne({
        challenge: challenge._id,
        $or: [
          { 'leetcode.submissionId': String(item.id) },
          {
            participant: enrollment.user,
            problemSlug: item.titleSlug,
            status: { $in: ['Pending', 'Approved'] },
          },
        ],
      }).select('_id');

      if (duplicate) {
        skipped += 1;
        continue;
      }

      // Resolve problem details.
      let problem = await ProblemCache.findOne({
        slug: item.titleSlug,
      });

      if (
        !problem ||
        Date.now() - problem.fetchedAt.getTime() > 30 * 86400000
      ) {
        await leetcode.sleep(300);

        const details = await leetcode.getProblem(item.titleSlug);

        if (
          !details ||
          !['Easy', 'Medium', 'Hard'].includes(details.difficulty)
        ) {
          throw new Error(
            `Could not verify LeetCode difficulty for ${item.titleSlug}; checkpoint will be retained for retry.`
          );
        }

        problem = await ProblemCache.findOneAndUpdate(
          { slug: item.titleSlug },
          {
            $set: {
              title: details.title,
              difficulty: details.difficulty,
              fetchedAt: new Date(),
            },
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          }
        );
      }

      if (!['Easy', 'Medium', 'Hard'].includes(problem.difficulty)) {
        throw new Error(
          `Cached LeetCode difficulty is invalid for ${item.titleSlug}; checkpoint will be retained for retry.`
        );
      }

      // Daily submission limits use original submission date.
      const dayStart = parseIstDateBoundary(
        istDateKey(submittedAt),
        'start'
      );

      const dayEnd = parseIstDateBoundary(
        istDateKey(submittedAt),
        'end'
      );

      if (
        submittedAt < parseIstDateBoundary(challenge.startDate, 'start') ||
        submittedAt > parseIstDateBoundary(challenge.endDate, 'end')
      ) {
        skipped += 1;
        continue;
      }

      if (challenge.rules?.maxSubmissionsPerDay) {
        const count = await Submission.countDocuments({
          participant: enrollment.user,
          challenge: challenge._id,
          completionDate: {
            $gte: dayStart,
            $lte: dayEnd,
          },
          status: { $in: ['Pending', 'Approved'] },
        });

        if (count >= challenge.rules.maxSubmissionsPerDay) {
          skipped += 1;
          continue;
        }
      }

      // Create submission with automatic timestamp tracking.
      try {
        const receivedAt = new Date();

        await Submission.create({
          participant: enrollment.user,
          challenge: challenge._id,

          problemTitle: problem.title,
          problemUrl: `https://leetcode.com/problems/${item.titleSlug}/`,
          problemSlug: item.titleSlug,

          activeDuplicateKey: `${enrollment.user}:${challenge._id}:${item.titleSlug}`,

          difficulty: problem.difficulty,
          difficultyVerified: true,

          // Original LeetCode submission date.
          completionDate: submittedAt,

          // Submission source.
          source: 'automated',

          // Time when our backend detected/imported this submission.
          receivedAt,

          // Original LeetCode submission information.
          leetcode: {
            submissionId: String(item.id),
            username: enrollment.leetcodeUsername,
            submittedAt,
            enrollment: enrollment._id,
          },

          status: 'Pending',

          notes: 'Automatically imported from verified LeetCode account.',
        });

        imported += 1;
      } catch (error) {
        if (error.code === 11000) {
          skipped += 1;
        } else {
          throw error;
        }
      }
    }

    await AutomationEnrollment.updateOne(
      { _id: enrollment._id, leaseToken },
      {
        $set: {
          checkpointTimestamp: maxTimestamp,
          checkpointSubmissionId: maxId,
          lastSyncAt: new Date(),
          lastSuccessAt: new Date(),
          nextSyncAt: new Date(Date.now() + SYNC_INTERVAL_MS),

          lastError: gapDetected
            ? 'Gap detected: LeetCode exposes only the latest 20 accepted submissions; older activity may have been missed.'
            : '',

          consecutiveFailures: 0,
        },
        $unset: {
          leaseUntil: 1,
          leaseToken: 1,
        },
      }
    );

    return {
      imported,
      skipped,
      gapDetected,
    };
  } catch (error) {
    const failures = Number(enrollment.consecutiveFailures || 0) + 1;

    const delay =
      Math.min(60, 2 ** Math.min(failures, 6)) * 60000;

    await AutomationEnrollment.updateOne(
      { _id: enrollment._id, leaseToken },
      {
        $set: {
          lastSyncAt: new Date(),
          lastError: error.message,
          consecutiveFailures: failures,

          nextSyncAt: new Date(Date.now() + delay),

          ...(error.status === 403 || error.status === 429
            ? {
                lastError: `${error.message}. Sync paused temporarily; retry after backoff.`,
              }
            : {}),
        },
        $unset: {
          leaseUntil: 1,
          leaseToken: 1,
        },
      }
    );

    throw error;
  }
}

async function resolveUnknownManualSubmissions() {
  const unresolved = await Submission.find({
    $and: [
      {
        $or: [
          { source: 'manual' },
          { source: { $exists: false } },
        ],
      },
      { status: 'Pending' },
      { difficultyVerified: { $ne: true } },
    ],
  })
    .sort({ createdAt: 1 })
    .limit(25);

  let resolved = 0;
  let rateLimited = false;

  for (const submission of unresolved) {
    try {
      let cached = await ProblemCache.findOne({
        slug: submission.problemSlug,
      });

      if (!cached) {
        await leetcode.sleep(300);

        const details = await leetcode.getProblem(submission.problemSlug);

        if (
          !details ||
          !['Easy', 'Medium', 'Hard'].includes(details.difficulty)
        ) {
          continue;
        }

        cached = await ProblemCache.create({
          slug: submission.problemSlug,
          title: details.title,
          difficulty: details.difficulty,
        });
      }

      if (['Easy', 'Medium', 'Hard'].includes(cached.difficulty)) {
        await Submission.updateOne(
          {
            _id: submission._id,
            status: 'Pending',
            difficultyVerified: { $ne: true },
          },
          {
            $set: {
              difficulty: cached.difficulty,
              difficultyVerified: true,
              problemTitle: cached.title,
            },
          }
        );

        resolved += 1;
      }
    } catch (error) {
      rateLimited = true;
      break;
    }
  }

  return {
    resolved,
    rateLimited,
  };
}

async function runDueSyncs({ once = true } = {}) {
  const manualResolution = await resolveUnknownManualSubmissions();

  const manualResolved = manualResolution.resolved;

  const due = await AutomationEnrollment.find({
    status: 'active',
    nextSyncAt: { $lte: new Date() },
  })
    .select('_id')
    .limit(100);

  const results = [];

  if (manualResolution.rateLimited) {
    return {
      manualResolved,
      syncs: results,
      circuitBroken: true,
    };
  }

  for (const item of due) {
    try {
      results.push({
        enrollmentId: String(item._id),
        ...(await syncEnrollment(item._id)),
      });
    } catch (error) {
      results.push({
        enrollmentId: String(item._id),
        error: error.message,
      });

      if (error.status === 403 || error.status === 429) {
        break;
      }
    }
  }

  return {
    manualResolved,
    syncs: results,
  };
}

module.exports = {
  startVerification,
  confirmVerification,
  setEnrollmentStatus,
  syncEnrollment,
  runDueSyncs,
  VERIFICATION_TTL_MS,
  SYNC_INTERVAL_MS,
};
