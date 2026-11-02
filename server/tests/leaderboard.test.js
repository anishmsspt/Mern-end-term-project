const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Challenge = require('../src/models/Challenge');
const ChallengeMembership = require('../src/models/ChallengeMembership');
const Submission = require('../src/models/Submission');
const ScoreTransaction = require('../src/models/ScoreTransaction');
const { generateToken } = require('../src/utils/token');
const { rankEntries } = require('../src/controllers/leaderboardController');

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
    await ScoreTransaction.deleteMany({});

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

  // ---------------------------------------------------------------------------
  // Helpers for the extended scenarios
  // ---------------------------------------------------------------------------
  const makeUser = async (name, email, role = 'participant') =>
    User.create({
      name,
      email,
      passwordHash: await User.hashPassword('Pass12345!'),
      role,
    });

  const joinViaApi = (user, joinCode) =>
    request(app)
      .post('/api/challenges/join')
      .set('Authorization', `Bearer ${generateToken(user)}`)
      .send({ joinCode });

  const submitViaApi = (user, challengeId, slug) =>
    request(app)
      .post('/api/submissions')
      .set('Authorization', `Bearer ${generateToken(user)}`)
      .send({
        challengeId: String(challengeId),
        problemTitle: `Problem ${slug}`,
        problemUrl: `https://leetcode.com/problems/${slug}/`,
        difficulty: 'Easy',
        completionDate: new Date().toISOString(),
      });

  const reviewViaApi = (reviewer, submissionId, body) =>
    request(app)
      .post(`/api/submissions/${submissionId}/review`)
      .set('Authorization', `Bearer ${generateToken(reviewer)}`)
      .send(body);

  const getBoard = (token, challengeId, query = '') =>
    request(app)
      .get(`/api/leaderboard/${challengeId}${query}`)
      .set('Authorization', `Bearer ${token}`);

  const addApproved = (user, chal, slug, points) =>
    Submission.create({
      participant: user._id,
      challenge: chal._id,
      problemTitle: slug,
      problemUrl: `https://leetcode.com/problems/${slug}/`,
      problemSlug: slug,
      difficulty: 'Easy',
      completionDate: new Date(),
      status: 'Approved',
      pointsAwarded: points,
      reviewer: host._id,
      reviewedAt: new Date(),
    });

  const joinNewChallenge = async (title, code) => {
    const c = await Challenge.create({
      title,
      joinCode: code,
      host: host._id,
      startDate: new Date(Date.now() - 86400000),
      endDate: new Date(Date.now() + 86400000 * 10),
      status: 'active',
    });
    return c;
  };

  describe('Every joined participant appears (membership is the source of truth)', () => {
    test('1. Newly joined participant appears immediately with 0 points (via real join endpoint)', async () => {
      const newcomer = await makeUser('Newcomer Nina', 'nina@hub.com');
      const joinRes = await joinViaApi(newcomer, 'CINEMA26');
      assert.equal(joinRes.status, 201);

      const res = await getBoard(hostToken, challenge._id);
      assert.equal(res.status, 200);
      assert.equal(res.body.totalParticipants, 4);

      const nina = res.body.leaderboard.find((e) => e.name === 'Newcomer Nina');
      assert.ok(nina, 'newly joined participant must be on the leaderboard');
      assert.equal(nina.totalPoints, 0);
      assert.equal(nina.solvedCount, 0);
      assert.equal(nina.approvedSubmissions, 0);
      assert.equal(String(nina.participantId), String(newcomer._id));
    });

    test('2. Participant with no submissions at all appears with 0 points', async () => {
      const res = await getBoard(hostToken, challenge._id);
      const charlie = res.body.leaderboard.find((e) => e.name === 'Charlie Zero');
      assert.ok(charlie);
      assert.equal(charlie.totalPoints, 0);
      assert.equal(charlie.solvedCount, 0);
    });

    test('3. Participant with only pending submissions appears with 0 points', async () => {
      const dan = await makeUser('Dan Pending', 'dan@hub.com');
      await ChallengeMembership.create({ user: dan._id, challenge: challenge._id });
      await Submission.create({
        participant: dan._id,
        challenge: challenge._id,
        problemTitle: 'Pending One',
        problemUrl: 'https://leetcode.com/problems/pending-one/',
        problemSlug: 'pending-one',
        completionDate: new Date(),
        status: 'Pending',
      });

      const res = await getBoard(hostToken, challenge._id);
      const entry = res.body.leaderboard.find((e) => e.name === 'Dan Pending');
      assert.ok(entry);
      assert.equal(entry.totalPoints, 0);
      assert.equal(entry.solvedCount, 0);
    });

    test('4. Participant with only rejected submissions appears with 0 points', async () => {
      const eve = await makeUser('Eve Rejected', 'eve@hub.com');
      await ChallengeMembership.create({ user: eve._id, challenge: challenge._id });
      await Submission.create({
        participant: eve._id,
        challenge: challenge._id,
        problemTitle: 'Rejected One',
        problemUrl: 'https://leetcode.com/problems/rejected-one/',
        problemSlug: 'rejected-one',
        completionDate: new Date(),
        status: 'Rejected',
        pointsAwarded: 0,
      });

      const res = await getBoard(hostToken, challenge._id);
      const entry = res.body.leaderboard.find((e) => e.name === 'Eve Rejected');
      assert.ok(entry);
      assert.equal(entry.totalPoints, 0);
    });

    test('Zero-point members stay at the bottom, below everyone with points', async () => {
      const res = await getBoard(hostToken, challenge._id);
      const points = res.body.leaderboard.map((e) => e.totalPoints);
      assert.deepEqual(points, [...points].sort((a, b) => b - a));
      assert.equal(res.body.leaderboard[res.body.leaderboard.length - 1].totalPoints, 0);
    });

    test('Empty challenge (nobody joined) returns an empty list, not an error', async () => {
      const empty = await joinNewChallenge('Empty Arena', 'EMPTY001');
      const res = await getBoard(hostToken, empty._id);
      assert.equal(res.status, 200);
      assert.equal(res.body.totalParticipants, 0);
      assert.deepEqual(res.body.leaderboard, []);
    });

    test('Members who left / are suspended and the host are not listed', async () => {
      const left = await makeUser('Leo Left', 'leo@hub.com');
      await ChallengeMembership.create({ user: left._id, challenge: challenge._id, status: 'left' });
      await ChallengeMembership.create({ user: host._id, challenge: challenge._id, role: 'host' });

      const res = await getBoard(hostToken, challenge._id);
      const names = res.body.leaderboard.map((e) => e.name);
      assert.ok(!names.includes('Leo Left'));
      assert.ok(!names.includes('Host General'));
      assert.equal(res.body.totalParticipants, 3);
    });
  });

  describe('Points calculation', () => {
    test('5. One approved submission adds exactly its awarded points', async () => {
      const res = await getBoard(hostToken, challenge._id);
      const bob = res.body.leaderboard.find((e) => e.name === 'Bob RunnerUp');
      assert.equal(bob.totalPoints, 20);
      assert.equal(bob.solvedCount, 1);
    });

    test('6. Multiple approved submissions are summed without duplicate counting', async () => {
      await addApproved(participantCharlie, challenge, 'sum-a', 3);
      await addApproved(participantCharlie, challenge, 'sum-b', 5);
      await addApproved(participantCharlie, challenge, 'sum-c', 7);

      const res = await getBoard(hostToken, challenge._id);
      const charlie = res.body.leaderboard.find((e) => e.name === 'Charlie Zero');
      assert.equal(charlie.totalPoints, 15);
      assert.equal(charlie.solvedCount, 3);
      assert.equal(charlie.approvedSubmissions, 3);
      assert.equal(res.body.leaderboard.length, 3, 'no duplicate rows from multiple submissions');
    });
  });

  describe('Automatic updates through the real workflow', () => {
    test('7. Approving a submission updates the leaderboard; 8. rejecting awards nothing', async () => {
      const dana = await makeUser('Dana Workflow', 'dana@hub.com');
      const erin = await makeUser('Erin Workflow', 'erin@hub.com');
      assert.equal((await joinViaApi(dana, 'CINEMA26')).status, 201);
      assert.equal((await joinViaApi(erin, 'CINEMA26')).status, 201);

      // Both appear with 0 before any submission
      let board = (await getBoard(hostToken, challenge._id)).body.leaderboard;
      assert.equal(board.find((e) => e.name === 'Dana Workflow').totalPoints, 0);
      assert.equal(board.find((e) => e.name === 'Erin Workflow').totalPoints, 0);

      // Submissions are pending -> still 0
      const danaSub = await submitViaApi(dana, challenge._id, 'dana-problem');
      const erinSub = await submitViaApi(erin, challenge._id, 'erin-problem');
      assert.equal(danaSub.status, 201);
      assert.equal(erinSub.status, 201);
      board = (await getBoard(hostToken, challenge._id)).body.leaderboard;
      assert.equal(board.find((e) => e.name === 'Dana Workflow').totalPoints, 0);

      // Approve Dana with 30 points
      const approve = await reviewViaApi(host, danaSub.body.submission._id, {
        action: 'approve',
        pointsAwarded: 30,
      });
      assert.equal(approve.status, 200);

      // Reject Erin
      const reject = await reviewViaApi(host, erinSub.body.submission._id, {
        action: 'reject',
        reviewNotes: 'Evidence does not match',
      });
      assert.equal(reject.status, 200);

      board = (await getBoard(hostToken, challenge._id)).body.leaderboard;
      const dEntry = board.find((e) => e.name === 'Dana Workflow');
      const eEntry = board.find((e) => e.name === 'Erin Workflow');
      assert.equal(dEntry.totalPoints, 30);
      assert.equal(dEntry.solvedCount, 1);
      assert.equal(eEntry.totalPoints, 0);
      assert.equal(eEntry.solvedCount, 0);

      // Dana (30) is now ahead of Bob (20) but behind Alice (40)
      const order = board.map((e) => e.name);
      assert.ok(order.indexOf('Alice Top') < order.indexOf('Dana Workflow'));
      assert.ok(order.indexOf('Dana Workflow') < order.indexOf('Bob RunnerUp'));
    });

    test('Rejection no longer writes a bogus "Approved solve" ScoreTransaction', async () => {
      const frank = await makeUser('Frank Reject', 'frank@hub.com');
      await joinViaApi(frank, 'CINEMA26');
      const sub = await submitViaApi(frank, challenge._id, 'frank-problem');
      await reviewViaApi(host, sub.body.submission._id, { action: 'reject', reviewNotes: 'No' });
      assert.equal(await ScoreTransaction.countDocuments({ submission: sub.body.submission._id }), 0);

      const sub2 = await submitViaApi(frank, challenge._id, 'frank-problem-2');
      await reviewViaApi(host, sub2.body.submission._id, { action: 'approve', pointsAwarded: 4 });
      assert.equal(await ScoreTransaction.countDocuments({ submission: sub2.body.submission._id }), 1);
    });
  });

  describe('Competition ranking (1, 2, 2, 4)', () => {
    test('9/10. Equal scores share a rank and the next rank skips (1,2,2,4)', async () => {
      const a = await makeUser('Aaron', 'aaron@hub.com');
      const b = await makeUser('Bella', 'bella@hub.com');
      const c = await makeUser('Cora', 'cora@hub.com');
      const d = await makeUser('Dev', 'dev@hub.com');
      const chal = await joinNewChallenge('Ranking Arena', 'RANK0001');
      for (const u of [a, b, c, d]) await ChallengeMembership.create({ user: u._id, challenge: chal._id });
      await addApproved(a, chal, 'r-a', 15);
      await addApproved(b, chal, 'r-b', 10);
      await addApproved(c, chal, 'r-c', 10);
      // d has nothing -> 0

      const res = await getBoard(hostToken, chal._id);
      assert.deepEqual(
        res.body.leaderboard.map((e) => e.rank),
        [1, 2, 2, 4]
      );
      assert.deepEqual(
        res.body.leaderboard.map((e) => e.name),
        ['Aaron', 'Bella', 'Cora', 'Dev'],
        'ties are ordered by participant name'
      );
    });

    test('All zero-point participants share rank 1 and are sorted by name', async () => {
      const chal = await joinNewChallenge('Zero Arena', 'ZERO0001');
      for (const [n, e] of [['Zed', 'zed@hub.com'], ['Amy', 'amy@hub.com'], ['Max', 'max@hub.com']]) {
        const u = await makeUser(n, e);
        await ChallengeMembership.create({ user: u._id, challenge: chal._id });
      }
      const res = await getBoard(hostToken, chal._id);
      assert.deepEqual(res.body.leaderboard.map((e) => e.name), ['Amy', 'Max', 'Zed']);
      assert.deepEqual(res.body.leaderboard.map((e) => e.rank), [1, 1, 1]);
    });

    test('rankEntries handles 15,15,10,0,0 -> 1,1,3,4,4', () => {
      const mk = (name, totalPoints) => ({ participantId: name, name, totalPoints });
      const ranked = rankEntries([mk('E', 0), mk('C', 10), mk('A', 15), mk('D', 0), mk('B', 15)]);
      assert.deepEqual(ranked.map((e) => `${e.name}:${e.rank}`), ['A:1', 'B:1', 'C:3', 'D:4', 'E:4']);
    });
  });

  describe('Challenge isolation', () => {
    test('11. Participants and points from different challenges never mix', async () => {
      const other = await joinNewChallenge('Other Challenge', 'OTHER001');
      const zoe = await makeUser('Zoe Other', 'zoe@hub.com');
      await ChallengeMembership.create({ user: zoe._id, challenge: other._id });
      await addApproved(zoe, other, 'zoe-1', 99);
      // Alice is in BOTH challenges, with different points in each
      await ChallengeMembership.create({ user: participantAlice._id, challenge: other._id });
      await addApproved(participantAlice, other, 'alice-other', 7);

      const main = (await getBoard(hostToken, challenge._id)).body.leaderboard;
      const oth = (await getBoard(hostToken, other._id)).body.leaderboard;

      assert.ok(!main.some((e) => e.name === 'Zoe Other'));
      assert.equal(main.find((e) => e.name === 'Alice Top').totalPoints, 40);

      assert.deepEqual(oth.map((e) => e.name), ['Zoe Other', 'Alice Top']);
      assert.equal(oth.find((e) => e.name === 'Alice Top').totalPoints, 7);
      assert.ok(!oth.some((e) => e.name === 'Bob RunnerUp'));
    });

    test('Approved submissions from a non-member are ignored', async () => {
      const ghost = await makeUser('Ghost Outsider', 'ghost@hub.com');
      await addApproved(ghost, challenge, 'ghost-1', 50);
      const res = await getBoard(hostToken, challenge._id);
      assert.ok(!res.body.leaderboard.some((e) => e.name === 'Ghost Outsider'));
      assert.equal(res.body.totalParticipants, 3);
    });

    test('Unknown challenge id returns 404', async () => {
      const res = await getBoard(hostToken, new (require('mongoose').Types.ObjectId)());
      assert.equal(res.status, 404);
    });
  });

  describe('Host and participant views are consistent', () => {
    test('12. Host, member participants and API aliases return identical standings', async () => {
      const hostBoard = await getBoard(hostToken, challenge._id);
      const aliceBoard = await getBoard(generateToken(participantAlice), challenge._id);
      const charlieBoard = await getBoard(generateToken(participantCharlie), challenge._id);

      assert.equal(aliceBoard.status, 200);
      assert.deepEqual(aliceBoard.body.leaderboard, hostBoard.body.leaderboard);
      assert.deepEqual(charlieBoard.body.leaderboard, hostBoard.body.leaderboard);
      assert.deepEqual(hostBoard.body.standings, hostBoard.body.leaderboard);
    });

    test('Response entries expose consistent identifiers and the fields the UI needs', async () => {
      const res = await getBoard(hostToken, challenge._id);
      for (const e of res.body.leaderboard) {
        assert.equal(typeof e.participantId, 'string');
        assert.equal(e.userId, e.participantId);
        assert.equal(typeof e.name, 'string');
        assert.equal(typeof e.totalPoints, 'number');
        assert.equal(typeof e.rank, 'number');
        assert.equal(e.approvedSubmissions, e.solvedCount);
      }
      assert.equal(res.headers['cache-control'], 'no-store');
    });

    test('Leaderboard still requires authentication', async () => {
      const res = await request(app).get(`/api/leaderboard/${challenge._id}`);
      assert.equal(res.status, 401);
    });
  });

  describe('Weekly timeframe keeps all members visible', () => {
    test('Members with no solves this week still appear with 0; old solves are excluded', async () => {
      const old = new Date(Date.now() - 86400000 * 20);
      await Submission.updateMany({ participant: participantAlice._id }, { completionDate: old });

      const res = await getBoard(hostToken, challenge._id, '?timeframe=weekly');
      assert.equal(res.body.timeframe, 'weekly');
      assert.equal(res.body.totalParticipants, 3);
      const alice = res.body.leaderboard.find((e) => e.name === 'Alice Top');
      assert.equal(alice.totalPoints, 0);
      assert.equal(res.body.leaderboard.find((e) => e.name === 'Bob RunnerUp').totalPoints, 20);
    });
  });
});
