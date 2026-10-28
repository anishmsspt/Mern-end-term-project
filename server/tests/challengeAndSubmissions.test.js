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

describe('Phase 3: Challenge Membership & Daily Submissions Tests', () => {
  let hostUser;
  let hostToken;
  let participantA;
  let participantAToken;
  let participantB;
  let participantBToken;
  let activeChallenge;

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

    hostUser = await User.create({
      name: 'Professor Host',
      email: 'host@university.edu',
      passwordHash: hash,
      role: 'host',
    });

    participantA = await User.create({
      name: 'Alice Coder',
      email: 'alice@university.edu',
      passwordHash: hash,
      role: 'participant',
    });

    participantB = await User.create({
      name: 'Bob Coder',
      email: 'bob@university.edu',
      passwordHash: hash,
      role: 'participant',
    });

    hostToken = generateToken(hostUser);
    participantAToken = generateToken(participantA);
    participantBToken = generateToken(participantB);

    // Create an active challenge
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 2); // Started 2 days ago
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 10); // Ends in 10 days

    activeChallenge = await Challenge.create({
      title: 'Winter Algorithms Sprint',
      joinCode: 'WINTER26',
      host: hostUser._id,
      startDate,
      endDate,
      status: 'active',
      rules: {
        maxSubmissionsPerDay: 3,
        allowMultipleSubmissionsPerDay: true,
      },
    });
  });

  describe('1. Challenge Membership Workflow (POST /api/challenges/join)', () => {
    test('Participant successfully joins active challenge using valid joinCode', async () => {
      const res = await request(app)
        .post('/api/challenges/join')
        .set('Authorization', `Bearer ${participantAToken}`)
        .send({ joinCode: 'WINTER26' });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.challenge.joinCode, 'WINTER26');
      assert.equal(res.body.membership.role, 'participant');

      // Verify DB record
      const count = await ChallengeMembership.countDocuments({
        user: participantA._id,
        challenge: activeChallenge._id,
      });
      assert.equal(count, 1);
    });

    test('Case-insensitivity: Participant can join with lowercase joinCode', async () => {
      const res = await request(app)
        .post('/api/challenges/join')
        .set('Authorization', `Bearer ${participantBToken}`)
        .send({ joinCode: 'winter26' });

      assert.equal(res.status, 201);
      assert.equal(res.body.challenge.joinCode, 'WINTER26');
    });

    test('Prevents duplicate membership: Joining same challenge twice returns 409 Conflict', async () => {
      // First join
      await request(app)
        .post('/api/challenges/join')
        .set('Authorization', `Bearer ${participantAToken}`)
        .send({ joinCode: 'WINTER26' });

      // Second join
      const res = await request(app)
        .post('/api/challenges/join')
        .set('Authorization', `Bearer ${participantAToken}`)
        .send({ joinCode: 'WINTER26' });

      assert.equal(res.status, 409);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /already a.*member/i);
    });

    test('Rejects invalid joinCode with 404 Not Found', async () => {
      const res = await request(app)
        .post('/api/challenges/join')
        .set('Authorization', `Bearer ${participantAToken}`)
        .send({ joinCode: 'NONEXISTENT99' });

      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /no challenge found/i);
    });

    test('Host account is forbidden from joining challenges as a participant', async () => {
      const res = await request(app)
        .post('/api/challenges/join')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ joinCode: 'WINTER26' });

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /cannot join challenges as participants/i);
    });
  });

  describe('2. Daily Problem Submissions (POST /api/submissions)', () => {
    beforeEach(async () => {
      // Participant A joins the challenge
      await ChallengeMembership.create({
        user: participantA._id,
        challenge: activeChallenge._id,
        role: 'participant',
        status: 'active',
      });
    });

    test('Participant successfully submits solved problem with initial Pending status', async () => {
      const payload = {
        challengeId: activeChallenge._id.toString(),
        problemTitle: 'Two Sum',
        problemUrl: 'https://leetcode.com/problems/two-sum/description/',
        difficulty: 'Easy',
        completionDate: new Date().toISOString(),
        notes: 'Used a single-pass hash map for O(n) time complexity.',
      };

      const res = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${participantAToken}`)
        .send(payload);

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.submission.status, 'Pending');
      assert.equal(res.body.submission.problemSlug, 'two-sum');
      assert.equal(res.body.submission.problemUrl, 'https://leetcode.com/problems/two-sum/');
      assert.equal(res.body.submission.difficulty, 'Easy');
      assert.equal(res.body.submission.pointsAwarded, 0);
    });

    test('Non-member participant is rejected with 403 Forbidden', async () => {
      // Participant B is not a member yet
      const payload = {
        challengeId: activeChallenge._id.toString(),
        problemTitle: 'Two Sum',
        problemUrl: 'https://leetcode.com/problems/two-sum/',
        completionDate: new Date().toISOString(),
      };

      const res = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${participantBToken}`)
        .send(payload);

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /must be an active registered member/i);
    });

    test('Rejects malformed LeetCode URLs with 400 Bad Request', async () => {
      // Wrong domain
      const res1 = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${participantAToken}`)
        .send({
          challengeId: activeChallenge._id.toString(),
          problemTitle: 'Two Sum',
          problemUrl: 'https://hackerrank.com/challenges/two-sum',
          completionDate: new Date().toISOString(),
        });
      assert.equal(res1.status, 400);
      assert.match(res1.body.message, /leetcode\.com/i);

      // Missing problem slug
      const res2 = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${participantAToken}`)
        .send({
          challengeId: activeChallenge._id.toString(),
          problemTitle: 'Explore Card',
          problemUrl: 'https://leetcode.com/explore/',
          completionDate: new Date().toISOString(),
        });
      assert.equal(res2.status, 400);
    });

    test('Rejects completion date in the future with 400 Bad Request', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);

      const res = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${participantAToken}`)
        .send({
          challengeId: activeChallenge._id.toString(),
          problemTitle: 'Two Sum',
          problemUrl: 'https://leetcode.com/problems/two-sum/',
          completionDate: tomorrow.toISOString(),
        });

      assert.equal(res.status, 400);
      assert.match(res.body.message, /future/i);
    });

    test('Allows submission on exact challenge start date (e.g. October 29, 2026)', async () => {
      // Create a challenge that starts today
      const todayChallenge = await Challenge.create({
        title: 'Today Sprint',
        joinCode: 'TODAY26',
        host: hostUser._id,
        startDate: new Date('2026-10-29T00:00:00.000Z'),
        endDate: new Date('2026-11-29T23:59:59.999Z'),
      });

      await ChallengeMembership.create({
        user: participantA._id,
        challenge: todayChallenge._id,
        role: 'participant',
        status: 'active',
      });

      const res = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${participantAToken}`)
        .send({
          challengeId: todayChallenge._id.toString(),
          problemTitle: 'Valid Start Date Problem',
          problemUrl: 'https://leetcode.com/problems/valid-parentheses/',
          completionDate: '2026-10-29',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.submission.problemSlug, 'valid-parentheses');
    });

    test('Rejects completion date preceding challenge start date (e.g. day before start)', async () => {
      const futureChallenge = await Challenge.create({
        title: 'Future Sprint',
        joinCode: 'FUTUR26',
        host: hostUser._id,
        startDate: new Date('2026-10-29T00:00:00.000Z'),
        endDate: new Date('2026-11-29T23:59:59.999Z'),
      });

      await ChallengeMembership.create({
        user: participantA._id,
        challenge: futureChallenge._id,
        role: 'participant',
        status: 'active',
      });

      const res = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${participantAToken}`)
        .send({
          challengeId: futureChallenge._id.toString(),
          problemTitle: 'Early Problem',
          problemUrl: 'https://leetcode.com/problems/climbing-stairs/',
          completionDate: '2026-10-28', // Day before start date
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /cannot precede the challenge start date/i);
    });

    test('Allows submission with today local YYYY-MM-DD date format', async () => {
      const now = new Date();
      const localTodayYmd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      const res = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${participantAToken}`)
        .send({
          challengeId: activeChallenge._id.toString(),
          problemTitle: 'Today Local Problem',
          problemUrl: 'https://leetcode.com/problems/merge-two-sorted-lists/',
          completionDate: localTodayYmd,
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
    });

    test('PREVENTS DUPLICATE SOLVE: Rejects second submission of already Pending/Approved problem', async () => {
      const payload = {
        challengeId: activeChallenge._id.toString(),
        problemTitle: 'Two Sum',
        problemUrl: 'https://leetcode.com/problems/two-sum/',
        completionDate: new Date().toISOString(),
      };

      // First submission
      await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${participantAToken}`)
        .send(payload);

      // Attempt duplicate submission
      const res = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${participantAToken}`)
        .send(payload);

      assert.equal(res.status, 409);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /duplicate solve/i);
    });

    test('Enforces daily submission limit rule with 429 Too Many Requests', async () => {
      const today = new Date().toISOString();

      // Submit 3 problems (the max limit)
      await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${participantAToken}`)
        .send({
          challengeId: activeChallenge._id.toString(),
          problemTitle: 'Prob 1',
          problemUrl: 'https://leetcode.com/problems/problem-one/',
          completionDate: today,
        });

      await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${participantAToken}`)
        .send({
          challengeId: activeChallenge._id.toString(),
          problemTitle: 'Prob 2',
          problemUrl: 'https://leetcode.com/problems/problem-two/',
          completionDate: today,
        });

      await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${participantAToken}`)
        .send({
          challengeId: activeChallenge._id.toString(),
          problemTitle: 'Prob 3',
          problemUrl: 'https://leetcode.com/problems/problem-three/',
          completionDate: today,
        });

      // 4th submission on the same day should exceed limit of 3
      const res4 = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${participantAToken}`)
        .send({
          challengeId: activeChallenge._id.toString(),
          problemTitle: 'Prob 4',
          problemUrl: 'https://leetcode.com/problems/problem-four/',
          completionDate: today,
        });

      assert.equal(res4.status, 429);
      assert.match(res4.body.message, /daily submission limit reached/i);
    });
  });

  describe('3. Participant Data Isolation (GET /api/submissions/:id)', () => {
    let subA;

    beforeEach(async () => {
      await ChallengeMembership.create({
        user: participantA._id,
        challenge: activeChallenge._id,
        role: 'participant',
        status: 'active',
      });

      await ChallengeMembership.create({
        user: participantB._id,
        challenge: activeChallenge._id,
        role: 'participant',
        status: 'active',
      });

      subA = await Submission.create({
        participant: participantA._id,
        challenge: activeChallenge._id,
        problemTitle: 'Private Problem Solve',
        problemUrl: 'https://leetcode.com/problems/private-problem/',
        problemSlug: 'private-problem',
        completionDate: new Date(),
        status: 'Pending',
      });
    });

    test('Participant A CAN view their own submission', async () => {
      const res = await request(app)
        .get(`/api/submissions/${subA._id}`)
        .set('Authorization', `Bearer ${participantAToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.submission._id, subA._id.toString());
    });

    test('DATA ISOLATION: Participant B CANNOT view Participant A private submission (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/submissions/${subA._id}`)
        .set('Authorization', `Bearer ${participantBToken}`);

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /forbidden.*permission/i);
    });

    test('Challenge Host CAN view Participant A submission for review', async () => {
      const res = await request(app)
        .get(`/api/submissions/${subA._id}`)
        .set('Authorization', `Bearer ${hostToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.submission._id, subA._id.toString());
    });
  });
});
