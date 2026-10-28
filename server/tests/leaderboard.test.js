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

describe('Priority 3: Authoritative Dynamic Leaderboard Tests', () => {
  let host;
  let hostToken;
  let participantAlice;
  let participantBob;
  let participantCharlie;
  let challenge;

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

    host = await User.create({
      name: 'Host General',
      email: 'general@hub.com',
      passwordHash: hash,
      role: 'host',
    });
    hostToken = generateToken(host);

    participantAlice = await User.create({
      name: 'Alice Top',
      email: 'alice@hub.com',
      passwordHash: hash,
      role: 'participant',
      leetcodeUsername: 'alicetop',
    });

    participantBob = await User.create({
      name: 'Bob RunnerUp',
      email: 'bob@hub.com',
      passwordHash: hash,
      role: 'participant',
      leetcodeUsername: 'bobrunner',
    });

    participantCharlie = await User.create({
      name: 'Charlie Zero',
      email: 'charlie@hub.com',
      passwordHash: hash,
      role: 'participant',
    });

    challenge = await Challenge.create({
      title: 'Cinematic Sprint 2026',
      joinCode: 'CINEMA26',
      host: host._id,
      startDate: new Date(Date.now() - 86400000 * 5),
      endDate: new Date(Date.now() + 86400000 * 25),
      status: 'active',
    });

    // Register all three members
    for (const p of [participantAlice, participantBob, participantCharlie]) {
      await ChallengeMembership.create({
        user: p._id,
        challenge: challenge._id,
        role: 'participant',
        status: 'active',
      });
    }

    // Alice has 2 Approved solves (25 pts + 15 pts = 40 pts)
    await Submission.create({
      participant: participantAlice._id,
      challenge: challenge._id,
      problemTitle: 'LRU Cache',
      problemUrl: 'https://leetcode.com/problems/lru-cache/',
      problemSlug: 'lru-cache',
      difficulty: 'Medium',
      completionDate: new Date(),
      status: 'Approved',
      pointsAwarded: 25,
      reviewer: host._id,
      reviewedAt: new Date(),
    });

    await Submission.create({
      participant: participantAlice._id,
      challenge: challenge._id,
      problemTitle: 'Valid Parentheses',
      problemUrl: 'https://leetcode.com/problems/valid-parentheses/',
      problemSlug: 'valid-parentheses',
      difficulty: 'Easy',
      completionDate: new Date(),
      status: 'Approved',
      pointsAwarded: 15,
      reviewer: host._id,
      reviewedAt: new Date(),
    });

    // Bob has 1 Approved solve (20 pts) and 1 Pending solve (contributes 0 pts) and 1 Rejected (contributes 0 pts)
    await Submission.create({
      participant: participantBob._id,
      challenge: challenge._id,
      problemTitle: 'Binary Search',
      problemUrl: 'https://leetcode.com/problems/binary-search/',
      problemSlug: 'binary-search',
      difficulty: 'Easy',
      completionDate: new Date(),
      status: 'Approved',
      pointsAwarded: 20,
      reviewer: host._id,
      reviewedAt: new Date(),
    });

    await Submission.create({
      participant: participantBob._id,
      challenge: challenge._id,
      problemTitle: 'Trapping Rain Water',
      problemUrl: 'https://leetcode.com/problems/trapping-rain-water/',
      problemSlug: 'trapping-rain-water',
      difficulty: 'Hard',
      completionDate: new Date(),
      status: 'Pending',
      pointsAwarded: 0,
    });

    await Submission.create({
      participant: participantBob._id,
      challenge: challenge._id,
      problemTitle: 'Two Sum II',
      problemUrl: 'https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/',
      problemSlug: 'two-sum-ii-input-array-is-sorted',
      difficulty: 'Medium',
      completionDate: new Date(),
      status: 'Rejected',
      pointsAwarded: 0,
    });
  });

  test('GET /api/leaderboard/:challengeId returns accurate rankings strictly from approved points', async () => {
    const res = await request(app)
      .get(`/api/leaderboard/${challenge._id}`)
      .set('Authorization', `Bearer ${hostToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.totalParticipants, 3);

    const board = res.body.leaderboard;

    // Rank 1: Alice with 40 points and 2 solved
    assert.equal(board[0].name, 'Alice Top');
    assert.equal(board[0].totalPoints, 40);
    assert.equal(board[0].solvedCount, 2);
    assert.equal(board[0].rank, 1);
    assert.equal(board[0].mediumCount, 1);
    assert.equal(board[0].easyCount, 1);

    // Rank 2: Bob with exactly 20 points (Pending & Rejected contribute 0)
    assert.equal(board[1].name, 'Bob RunnerUp');
    assert.equal(board[1].totalPoints, 20);
    assert.equal(board[1].solvedCount, 1);
    assert.equal(board[1].rank, 2);

    // Rank 3: Charlie with 0 points and 0 solved
    assert.equal(board[2].name, 'Charlie Zero');
    assert.equal(board[2].totalPoints, 0);
    assert.equal(board[2].solvedCount, 0);
    assert.equal(board[2].rank, 3);
  });

  test('Supports weekly timeframe query parameter', async () => {
    const res = await request(app)
      .get(`/api/leaderboard/${challenge._id}?timeframe=weekly`)
      .set('Authorization', `Bearer ${hostToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.timeframe, 'weekly');
    assert.ok(Array.isArray(res.body.leaderboard));
  });

  test('Rejects invalid challenge ID with 400 Bad Request', async () => {
    const res = await request(app)
      .get('/api/leaderboard/not-a-valid-id')
      .set('Authorization', `Bearer ${hostToken}`);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });
});
