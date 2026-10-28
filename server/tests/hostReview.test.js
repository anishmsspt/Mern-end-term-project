const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Challenge = require('../src/models/Challenge');
const ChallengeMembership = require('../src/models/ChallengeMembership');
const Submission = require('../src/models/Submission');
const { generateToken } = require('../src/utils/token');

describe('Phase 4: Host Review Queue & Approval/Rejection Workflow Tests', () => {
  let hostA;
  let hostAToken;
  let hostB;
  let hostBToken;
  let participant1;
  let participant1Token;
  let participant2;
  let participant2Token;
  let challengeA;
  let challengeB;
  let submission1;

  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.USE_MEMORY_DB = 'true';
    process.env.JWT_SECRET = 'test_secret_for_automated_runner_123';
    await connectDB();
  });

  after(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Challenge.deleteMany({});
    await ChallengeMembership.deleteMany({});
    await Submission.deleteMany({});

    const hash = await User.hashPassword('Pass12345!');

    // Host A (Owns Challenge A)
    hostA = await User.create({
      name: 'Host Alice',
      email: 'host.a@university.edu',
      passwordHash: hash,
      role: 'host',
    });

    // Host B (Owns Challenge B)
    hostB = await User.create({
      name: 'Host Bob',
      email: 'host.b@university.edu',
      passwordHash: hash,
      role: 'host',
    });

    // Participants
    participant1 = await User.create({
      name: 'Charlie Student',
      email: 'charlie@university.edu',
      passwordHash: hash,
      role: 'participant',
    });

    participant2 = await User.create({
      name: 'Diana Student',
      email: 'diana@university.edu',
      passwordHash: hash,
      role: 'participant',
    });

    hostAToken = generateToken(hostA);
    hostBToken = generateToken(hostB);
    participant1Token = generateToken(participant1);
    participant2Token = generateToken(participant2);

    const now = new Date();
    const start = new Date(now.getTime() - 86400000 * 2);
    const end = new Date(now.getTime() + 86400000 * 10);

    challengeA = await Challenge.create({
      title: 'Challenge Alpha',
      joinCode: 'ALPHA26',
      host: hostA._id,
      startDate: start,
      endDate: end,
      status: 'active',
    });

    challengeB = await Challenge.create({
      title: 'Challenge Beta',
      joinCode: 'BETA26',
      host: hostB._id,
      startDate: start,
      endDate: end,
      status: 'active',
    });

    // Participant 1 joins Challenge A
    await ChallengeMembership.create({
      user: participant1._id,
      challenge: challengeA._id,
      role: 'participant',
      status: 'active',
    });

    // Submission 1 in Challenge A
    submission1 = await Submission.create({
      participant: participant1._id,
      challenge: challengeA._id,
      problemTitle: '3Sum',
      problemUrl: 'https://leetcode.com/problems/3sum/',
      problemSlug: '3sum',
      difficulty: 'Medium',
      completionDate: new Date(),
      status: 'Pending',
      notes: 'Used two pointers approach.',
    });
  });

  describe('1. Review Queue Access & Filtering (GET /api/submissions/review-queue)', () => {
    test('Host can retrieve pending submissions for their own challenge', async () => {
      const res = await request(app)
        .get('/api/submissions/review-queue')
        .set('Authorization', `Bearer ${hostAToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.total, 1);
      assert.equal(res.body.submissions.length, 1);
      assert.equal(res.body.submissions[0].problemSlug, '3sum');
      assert.equal(res.body.submissions[0].status, 'Pending');
      assert.equal(res.body.submissions[0].participant.email, 'charlie@university.edu');
      assert.equal(res.body.submissions[0].participant.passwordHash, undefined, 'Never expose passwordHash');
    });

    test('Host sees empty queue if they own no submissions in that challenge', async () => {
      // Host B owns Challenge B, which currently has 0 submissions
      const res = await request(app)
        .get('/api/submissions/review-queue')
        .set('Authorization', `Bearer ${hostBToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.total, 0);
      assert.equal(res.body.submissions.length, 0);
    });

    test('PARTICIPANTS ARE STRICTLY FORBIDDEN: Participant receives 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/submissions/review-queue')
        .set('Authorization', `Bearer ${participant1Token}`);

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /forbidden/i);
    });

    test('Host cannot filter by a challengeId they do not own (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/submissions/review-queue?challengeId=${challengeA._id}`)
        .set('Authorization', `Bearer ${hostBToken}`);

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /forbidden.*not have host authorization/i);
    });
  });

  describe('2. Submission Approval Workflow (POST /api/submissions/:id/review)', () => {
    test('Valid approval transitions status to Approved, records reviewer and awards points', async () => {
      const res = await request(app)
        .post(`/api/submissions/${submission1._id}/review`)
        .set('Authorization', `Bearer ${hostAToken}`)
        .send({
          decision: 'approve',
          pointsAwarded: 25,
          reviewNotes: 'Excellent two-pointer implementation!',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.submission.status, 'Approved');
      assert.equal(res.body.submission.pointsAwarded, 25);
      assert.equal(res.body.submission.reviewer, hostA._id.toString());
      assert.ok(res.body.submission.reviewedAt);

      // Verify in DB
      const dbSub = await Submission.findById(submission1._id);
      assert.equal(dbSub.status, 'Approved');
      assert.equal(dbSub.pointsAwarded, 25);
    });

    test('CROSS-HOST ENFORCEMENT: Host B cannot review submissions for Host A challenge', async () => {
      const res = await request(app)
        .post(`/api/submissions/${submission1._id}/review`)
        .set('Authorization', `Bearer ${hostBToken}`)
        .send({
          decision: 'approve',
          pointsAwarded: 20,
        });

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /not authorized to review submissions for this challenge/i);
    });

    test('PARTICIPANT IS FORBIDDEN: Participant cannot approve submissions or award points', async () => {
      const res = await request(app)
        .post(`/api/submissions/${submission1._id}/review`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .send({
          decision: 'approve',
          pointsAwarded: 100,
        });

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });

    test('Point validation rejects zero, negative, fractional, and non-numeric points', async () => {
      // 0 points
      const resZero = await request(app)
        .post(`/api/submissions/${submission1._id}/review`)
        .set('Authorization', `Bearer ${hostAToken}`)
        .send({ decision: 'approve', pointsAwarded: 0 });
      assert.equal(resZero.status, 400);

      // Negative points
      const resNeg = await request(app)
        .post(`/api/submissions/${submission1._id}/review`)
        .set('Authorization', `Bearer ${hostAToken}`)
        .send({ decision: 'approve', pointsAwarded: -10 });
      assert.equal(resNeg.status, 400);

      // Fractional points
      const resFrac = await request(app)
        .post(`/api/submissions/${submission1._id}/review`)
        .set('Authorization', `Bearer ${hostAToken}`)
        .send({ decision: 'approve', pointsAwarded: 12.5 });
      assert.equal(resFrac.status, 400);

      // Over maximum limit (> 100)
      const resMax = await request(app)
        .post(`/api/submissions/${submission1._id}/review`)
        .set('Authorization', `Bearer ${hostAToken}`)
        .send({ decision: 'approve', pointsAwarded: 150 });
      assert.equal(resMax.status, 400);

      // Non-numeric / missing points
      const resMissing = await request(app)
        .post(`/api/submissions/${submission1._id}/review`)
        .set('Authorization', `Bearer ${hostAToken}`)
        .send({ decision: 'approve', pointsAwarded: 'many' });
      assert.equal(resMissing.status, 400);
    });

    test('PREVENTS DOUBLE-APPROVAL: Already approved submission cannot be approved again (409 Conflict)', async () => {
      // First approval
      await request(app)
        .post(`/api/submissions/${submission1._id}/review`)
        .set('Authorization', `Bearer ${hostAToken}`)
        .send({ decision: 'approve', pointsAwarded: 15 });

      // Second approval attempt
      const resSecond = await request(app)
        .post(`/api/submissions/${submission1._id}/review`)
        .set('Authorization', `Bearer ${hostAToken}`)
        .send({ decision: 'approve', pointsAwarded: 20 });

      assert.equal(resSecond.status, 409);
      assert.equal(resSecond.body.success, false);
      assert.match(resSecond.body.message, /already been reviewed/i);

      // Verify points in DB did NOT change
      const dbSub = await Submission.findById(submission1._id);
      assert.equal(dbSub.pointsAwarded, 15);
    });
  });

  describe('3. Submission Rejection Workflow', () => {
    test('Rejection without a reason is rejected with 400 Bad Request', async () => {
      const res = await request(app)
        .post(`/api/submissions/${submission1._id}/review`)
        .set('Authorization', `Bearer ${hostAToken}`)
        .send({
          decision: 'reject',
          reviewNotes: '', // Empty reason
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /rejection requires a non-empty/i);
    });

    test('Valid rejection records reason, sets status to Rejected, and awards 0 points', async () => {
      const res = await request(app)
        .post(`/api/submissions/${submission1._id}/review`)
        .set('Authorization', `Bearer ${hostAToken}`)
        .send({
          decision: 'reject',
          reviewNotes: 'The problem link does not match the reported completion code.',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.submission.status, 'Rejected');
      assert.equal(res.body.submission.pointsAwarded, 0);
      assert.equal(
        res.body.submission.rejectionReason,
        'The problem link does not match the reported completion code.'
      );

      // Verify in DB
      const dbSub = await Submission.findById(submission1._id);
      assert.equal(dbSub.status, 'Rejected');
      assert.equal(dbSub.pointsAwarded, 0);
    });

    test('Already rejected submission cannot be reviewed again without resubmission', async () => {
      // First rejection
      await request(app)
        .post(`/api/submissions/${submission1._id}/review`)
        .set('Authorization', `Bearer ${hostAToken}`)
        .send({ decision: 'reject', reviewNotes: 'Initial rejection' });

      // Second attempt to approve or review
      const res = await request(app)
        .post(`/api/submissions/${submission1._id}/review`)
        .set('Authorization', `Bearer ${hostAToken}`)
        .send({ decision: 'approve', pointsAwarded: 10 });

      assert.equal(res.status, 409);
      assert.match(res.body.message, /already been reviewed/i);
    });
  });

  describe('4. Participant View of Review Outcome', () => {
    test('Participant can view review outcome, feedback, and awarded points', async () => {
      // Host approves submission
      await request(app)
        .post(`/api/submissions/${submission1._id}/review`)
        .set('Authorization', `Bearer ${hostAToken}`)
        .send({
          decision: 'approve',
          pointsAwarded: 30,
          reviewNotes: 'Great explanation!',
        });

      // Participant fetches their submission
      const res = await request(app)
        .get(`/api/submissions/${submission1._id}`)
        .set('Authorization', `Bearer ${participant1Token}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.submission.status, 'Approved');
      assert.equal(res.body.submission.pointsAwarded, 30);
      assert.equal(res.body.submission.reviewNotes, 'Great explanation!');
    });

    test('Participant 2 cannot view Participant 1 reviewed submission (Data Isolation)', async () => {
      const res = await request(app)
        .get(`/api/submissions/${submission1._id}`)
        .set('Authorization', `Bearer ${participant2Token}`);

      assert.equal(res.status, 403);
      assert.match(res.body.message, /forbidden/i);
    });
  });
});
