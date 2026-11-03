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

describe('Host Submission Analytics (GET /api/submissions/analytics/:challengeId)', () => {
  let hostA, hostB, alice, bob, outsider, challengeA, challengeB;
  let hostAToken, hostBToken, aliceToken;

  const get = (id, token) => {
    const r = request(app).get(`/api/submissions/analytics/${id}`);
    return token ? r.set('Authorization', `Bearer ${token}`) : r;
  };

  let slugCounter = 0;
  const mkSub = (overrides) => {
    slugCounter += 1;
    const slug = `problem-${slugCounter}`;
    return Submission.collection.insertOne({
      problemTitle: `Problem ${slugCounter}`,
      problemUrl: `https://leetcode.com/problems/${slug}/`,
      problemSlug: slug,
      difficulty: 'Easy',
      difficultyVerified: true,
      completionDate: new Date(),
      status: 'Pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });
  };

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
    await Promise.all(
      [User, Challenge, ChallengeMembership, Submission].map((m) => m.deleteMany({}))
    );
    const hash = await User.hashPassword('Pass12345!');
    const mk = (name, email, role, extra = {}) =>
      User.create({ name, email, passwordHash: hash, role, ...extra });

    hostA = await mk('Host A', 'a@x.edu', 'host');
    hostB = await mk('Host B', 'b@x.edu', 'host');
    alice = await mk('Alice', 'alice@x.edu', 'participant', { leetcodeUsername: 'alice_lc' });
    bob = await mk('Bob', 'bob@x.edu', 'participant', { leetcodeUsername: 'bob_lc' });
    outsider = await mk('Outsider', 'out@x.edu', 'participant', { leetcodeUsername: 'out_lc' });
    hostAToken = generateToken(hostA);
    hostBToken = generateToken(hostB);
    aliceToken = generateToken(alice);

    const start = new Date(Date.now() - 86400000 * 5);
    const end = new Date(Date.now() + 86400000 * 5);
    challengeA = await Challenge.create({ title: 'Challenge A', joinCode: 'ANALYA26', host: hostA._id, startDate: start, endDate: end, status: 'active' });
    challengeB = await Challenge.create({ title: 'Challenge B', joinCode: 'ANALYB26', host: hostB._id, startDate: start, endDate: end, status: 'active' });
  });

  test('requires authentication', async () => {
    assert.equal((await get(challengeA._id)).status, 401);
  });

  test('participants are forbidden', async () => {
    assert.equal((await get(challengeA._id, aliceToken)).status, 403);
  });

  test('a host cannot read another host\'s challenge analytics', async () => {
    const res = await get(challengeA._id, hostBToken);
    assert.equal(res.status, 403);
    assert.equal(res.body.participantActivity, undefined);
  });

  test('invalid id -> 400, unknown id -> 404', async () => {
    assert.equal((await get('not-an-id', hostAToken)).status, 400);
    assert.equal((await get('64b64b64b64b64b64b64b64b', hostAToken)).status, 404);
  });

  test('empty challenge returns zeroed 24-hour series and no participants', async () => {
    const res = await get(challengeA._id, hostAToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.summary.total, 0);
    assert.equal(res.body.hourlyActivity.length, 24);
    assert.ok(res.body.hourlyActivity.every((h) => h.count === 0));
    assert.deepEqual(res.body.participantActivity, []);
    assert.deepEqual(res.body.dailyActivity, []);
    assert.equal(res.body.timezone, 'Asia/Kolkata');
  });

  test('aggregates by IST hour/day, uses the correct timestamp per source, counts each record once', async () => {
    // Automated: LeetCode time 2026-03-10T20:00Z = 01:30 IST on 11 Mar (receivedAt must be ignored)
    await mkSub({ challenge: challengeA._id, participant: alice._id, source: 'automated', status: 'Approved',
      receivedAt: new Date('2026-03-12T10:00:00Z'), leetcode: { submissionId: '1', submittedAt: new Date('2026-03-10T20:00:00Z') } });
    // Manual: receivedAt 2026-03-10T18:45Z = 00:15 IST on 11 Mar (completionDate must be ignored)
    await mkSub({ challenge: challengeA._id, participant: alice._id, source: 'manual', status: 'Pending',
      receivedAt: new Date('2026-03-10T18:45:00Z'), completionDate: new Date('2026-01-01T00:00:00Z') });
    // Legacy: no source, no receivedAt -> manual + createdAt 2026-03-11T06:30Z = 12:00 IST
    await mkSub({ challenge: challengeA._id, participant: bob._id, status: 'Rejected', createdAt: new Date('2026-03-11T06:30:00Z') });
    // Automated with missing submittedAt falls back to receivedAt (04:30Z = 10:00 IST)
    await mkSub({ challenge: challengeA._id, participant: bob._id, source: 'automated', status: 'Pending',
      receivedAt: new Date('2026-03-11T04:30:00Z'), leetcode: { submissionId: '2', submittedAt: null } });
    // Other challenge must never leak in
    await mkSub({ challenge: challengeB._id, participant: outsider._id, source: 'manual', status: 'Approved', receivedAt: new Date() });

    const res = await get(challengeA._id, hostAToken);
    assert.equal(res.status, 200);
    const b = res.body;

    assert.equal(b.summary.total, 4);
    const status = Object.fromEntries(b.statusBreakdown.map((s) => [s._id, s.count]));
    assert.deepEqual(status, { Approved: 1, Pending: 2, Rejected: 1 });
    const source = Object.fromEntries(b.sourceBreakdown.map((s) => [s._id, s.count]));
    assert.deepEqual(source, { manual: 2, automated: 2 });

    const hour = Object.fromEntries(b.hourlyActivity.map((h) => [h.hour, h.count]));
    assert.equal(hour[0], 1);   // manual receivedAt
    assert.equal(hour[1], 1);   // automated submittedAt
    assert.equal(hour[10], 1);  // automated fallback
    assert.equal(hour[12], 1);  // legacy createdAt
    assert.equal(b.hourlyActivity.reduce((n, h) => n + h.count, 0), 4);

    assert.deepEqual(b.dailyActivity, [{ date: '2026-03-11', count: 4 }]);

    const byName = Object.fromEntries(b.participantActivity.map((p) => [p.participant.name, p]));
    assert.equal(byName.Alice.total, 2);
    assert.equal(byName.Alice.approved, 1);
    assert.equal(byName.Alice.pending, 1);
    assert.equal(byName.Alice.rejected, 0);
    assert.equal(byName.Alice.manual, 1);
    assert.equal(byName.Alice.automated, 1);
    assert.equal(byName.Bob.total, 2);
    assert.equal(byName.Bob.rejected, 1);
    assert.equal(byName.Bob.manual, 1, 'legacy record counts as manual');
    assert.equal(byName.Bob.leetcodeUsername ?? byName.Bob.participant.leetcodeUsername, 'bob_lc');
    assert.equal(byName.Outsider, undefined, 'other challenge participants are not exposed');
    assert.equal(new Date(byName.Alice.lastSubmissionAt).toISOString(), '2026-03-10T20:00:00.000Z');
    assert.equal(b.participantActivity[0].participant.passwordHash, undefined);
  });
});
