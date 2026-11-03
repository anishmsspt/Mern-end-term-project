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
const StreakAdjustment = require('../src/models/StreakAdjustment');
const { generateToken } = require('../src/utils/token');
const { istDateKey } = require('../src/utils/istDate');
const { calculateStreaks, isValidDateKey, dayKeyToUtcDay, utcDayToKey } = require('../src/utils/streaks');

// IST day key `offset` days away from today (IST).
const dayKey = (offset) => utcDayToKey(dayKeyToUtcDay(istDateKey(new Date())) + offset * 86400000);
// A timestamp at 12:00 IST (06:30 UTC) on the given IST day key.
const noonIst = (key) => new Date(`${key}T06:30:00.000Z`);

describe('calculateStreaks / isValidDateKey (unit)', () => {
  test('approved submissions alone behave exactly as before', () => {
    const r = calculateStreaks(
      [new Date('2026-11-01T06:30:00Z'), new Date('2026-11-02T06:30:00Z'), new Date('2026-11-03T06:30:00Z')],
      '2026-11-03'
    );
    assert.deepEqual(r, { currentStreak: 3, longestStreak: 3, activeDays: 3, protectedDays: 0 });
  });

  test('without protection a missed day breaks the streak', () => {
    const r = calculateStreaks(
      [new Date('2026-11-01T06:30:00Z'), new Date('2026-11-03T06:30:00Z')],
      '2026-11-03'
    );
    assert.equal(r.currentStreak, 1);
    assert.equal(r.longestStreak, 1);
  });

  test('a protected day bridges the gap (Manasvi scenario: Nov 2 protected, Nov 3 recorded)', () => {
    const r = calculateStreaks(
      [new Date('2026-11-01T06:30:00Z'), new Date('2026-11-03T06:30:00Z')],
      '2026-11-03',
      ['2026-11-02']
    );
    assert.equal(r.currentStreak, 3);
    assert.equal(r.longestStreak, 3);
    assert.equal(r.activeDays, 3);
    assert.equal(r.protectedDays, 1);
  });

  test('protection on a day that already has a real submission is not double counted', () => {
    const r = calculateStreaks([new Date('2026-11-03T06:30:00Z')], '2026-11-03', ['2026-11-03']);
    assert.equal(r.activeDays, 1);
    assert.equal(r.protectedDays, 0);
  });

  test('a protected day alone can carry the current streak when it is yesterday', () => {
    const r = calculateStreaks([], '2026-11-03', ['2026-11-02']);
    assert.equal(r.currentStreak, 1);
    assert.equal(r.protectedDays, 1);
  });

  test('IST day boundaries: 23:59:59 IST and 00:00:00 IST are different days', () => {
    // 2026-11-02T18:29:59Z === 2026-11-02 23:59:59 IST ; 18:30:00Z === 2026-11-03 00:00:00 IST
    const lateNov2 = new Date('2026-11-02T18:29:59.000Z');
    const earlyNov3 = new Date('2026-11-02T18:30:00.000Z');
    assert.equal(calculateStreaks([lateNov2, earlyNov3], '2026-11-03').activeDays, 2);
    assert.equal(calculateStreaks([lateNov2, earlyNov3], '2026-11-03').currentStreak, 2);
    // Same UTC date, different IST dates
    assert.equal(calculateStreaks([new Date('2026-11-02T10:00:00Z'), new Date('2026-11-02T20:00:00Z')], '2026-11-03').activeDays, 2);
  });

  test('isValidDateKey rejects malformed and impossible dates', () => {
    assert.equal(isValidDateKey('2026-11-02'), true);
    assert.equal(isValidDateKey('2026-02-30'), false);
    assert.equal(isValidDateKey('2026-13-01'), false);
    assert.equal(isValidDateKey('2026-1-2'), false);
    assert.equal(isValidDateKey('11/02/2026'), false);
    assert.equal(isValidDateKey(''), false);
    assert.equal(isValidDateKey(null), false);
    assert.equal(isValidDateKey(20261102), false);
  });
});

describe('Host Streak Protection API', () => {
  let host;
  let otherHost;
  let manasvi;
  let outsider;
  let hostToken;
  let otherHostToken;
  let manasviToken;
  let outsiderToken;
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

  const addApproved = (participant, key, slug, points = 10) =>
    Submission.create({
      participant: participant._id,
      challenge: challenge._id,
      problemTitle: `Problem ${slug}`,
      problemUrl: `https://leetcode.com/problems/${slug}/`,
      problemSlug: slug,
      difficulty: 'Easy',
      completionDate: noonIst(key),
      status: 'Approved',
      pointsAwarded: points,
      reviewer: host._id,
      reviewedAt: new Date(),
    });

  const grant = (body, token = hostToken) =>
    request(app).post('/api/streak-adjustments').set('Authorization', `Bearer ${token}`).send(body);

  const validBody = (overrides = {}) => ({
    challengeId: String(challenge._id),
    participantId: String(manasvi._id),
    date: dayKey(-2),
    reason: 'Automation failure prevented sync',
    ...overrides,
  });

  const getBoard = (token = hostToken) =>
    request(app).get(`/api/leaderboard/${challenge._id}`).set('Authorization', `Bearer ${token}`);

  beforeEach(async () => {
    await Promise.all(
      [User, Challenge, ChallengeMembership, Submission, ScoreTransaction, StreakAdjustment].map((m) => m.deleteMany({}))
    );
    const hash = await User.hashPassword('Pass12345!');
    host = await User.create({ name: 'Host One', email: 'host1@hub.com', passwordHash: hash, role: 'host' });
    otherHost = await User.create({ name: 'Host Two', email: 'host2@hub.com', passwordHash: hash, role: 'host' });
    manasvi = await User.create({ name: 'Manasvi', email: 'manasvi@hub.com', passwordHash: hash, role: 'participant' });
    outsider = await User.create({ name: 'Outsider', email: 'outsider@hub.com', passwordHash: hash, role: 'participant' });
    hostToken = generateToken(host);
    otherHostToken = generateToken(otherHost);
    manasviToken = generateToken(manasvi);
    outsiderToken = generateToken(outsider);

    challenge = await Challenge.create({
      title: 'Streak Sprint',
      joinCode: 'STREAK26',
      host: host._id,
      startDate: new Date(Date.now() - 10 * 86400000),
      endDate: new Date(Date.now() + 20 * 86400000),
      status: 'active',
    });
    await ChallengeMembership.create({ user: manasvi._id, challenge: challenge._id, role: 'participant', status: 'active' });
  });

  describe('authorization', () => {
    test('requires authentication on every endpoint', async () => {
      assert.equal((await request(app).post('/api/streak-adjustments').send(validBody())).status, 401);
      assert.equal((await request(app).get(`/api/streak-adjustments/challenge/${challenge._id}`)).status, 401);
      assert.equal((await request(app).post(`/api/streak-adjustments/${challenge._id}/revoke`)).status, 401);
      assert.equal((await request(app).get(`/api/streak-adjustments/mine?challengeId=${challenge._id}`)).status, 401);
    });

    test('participants cannot grant, list or revoke', async () => {
      assert.equal((await grant(validBody(), manasviToken)).status, 403);
      assert.equal(
        (await request(app).get(`/api/streak-adjustments/challenge/${challenge._id}`).set('Authorization', `Bearer ${manasviToken}`)).status,
        403
      );
      const created = await grant(validBody());
      assert.equal(created.status, 201);
      const revoke = await request(app)
        .post(`/api/streak-adjustments/${created.body.adjustment._id}/revoke`)
        .set('Authorization', `Bearer ${manasviToken}`)
        .send({});
      assert.equal(revoke.status, 403);
      assert.equal((await StreakAdjustment.countDocuments({ status: 'active' })), 1);
    });

    test('a host who does not own the challenge cannot grant, list or revoke', async () => {
      assert.equal((await grant(validBody(), otherHostToken)).status, 403);
      assert.equal(
        (await request(app).get(`/api/streak-adjustments/challenge/${challenge._id}`).set('Authorization', `Bearer ${otherHostToken}`)).status,
        403
      );
      const created = await grant(validBody());
      const revoke = await request(app)
        .post(`/api/streak-adjustments/${created.body.adjustment._id}/revoke`)
        .set('Authorization', `Bearer ${otherHostToken}`)
        .send({});
      assert.equal(revoke.status, 403);
      assert.equal((await StreakAdjustment.findById(created.body.adjustment._id)).status, 'active');
    });
  });

  describe('grant', () => {
    test('grants a credit with a full audit trail', async () => {
      const key = dayKey(-2);
      const res = await grant(validBody({ date: key, reason: '  Automation failure  ' }));
      assert.equal(res.status, 201);
      assert.equal(res.body.adjustment.date, key);
      assert.equal(res.body.adjustment.status, 'active');
      assert.equal(res.body.adjustment.reason, 'Automation failure');
      assert.equal(String(res.body.adjustment.grantedBy), String(host._id));
      assert.ok(res.body.adjustment.grantedAt);

      const stored = await StreakAdjustment.findOne({});
      assert.equal(String(stored.grantedBy), String(host._id));
      assert.equal(String(stored.participant), String(manasvi._id));
      assert.equal(String(stored.challenge), String(challenge._id));
    });

    test('rejects duplicate active adjustments for the same participant/challenge/date', async () => {
      assert.equal((await grant(validBody())).status, 201);
      const dup = await grant(validBody({ reason: 'A different reason entirely' }));
      assert.equal(dup.status, 409);
      assert.equal(await StreakAdjustment.countDocuments({}), 1);
    });

    test('concurrent duplicate grants create only one record', async () => {
      const results = await Promise.all([grant(validBody()), grant(validBody()), grant(validBody())]);
      const statuses = results.map((r) => r.status).sort();
      assert.deepEqual(statuses, [201, 409, 409]);
      assert.equal(await StreakAdjustment.countDocuments({ status: 'active' }), 1);
    });

    test('validates required fields, ids and reason', async () => {
      assert.equal((await grant({})).status, 400);
      assert.equal((await grant(validBody({ reason: '' }))).status, 400);
      assert.equal((await grant(validBody({ reason: 'abc' }))).status, 400);
      assert.equal((await grant(validBody({ reason: 'x'.repeat(501) }))).status, 400);
      assert.equal((await grant(validBody({ participantId: 'nope' }))).status, 400);
      assert.equal((await grant(validBody({ challengeId: 'nope' }))).status, 400);
      assert.equal((await grant(validBody({ challengeId: String(new (require('mongoose').Types.ObjectId)()) }))).status, 404);
    });

    test('rejects invalid, impossible, future and out-of-window dates', async () => {
      for (const bad of ['2026-02-30', '2026-13-01', '02-11-2026', 'yesterday', '2026-1-2']) {
        assert.equal((await grant(validBody({ date: bad }))).status, 400, `date ${bad}`);
      }
      // future (IST)
      assert.equal((await grant(validBody({ date: dayKey(1) }))).status, 400);
      // before challenge start / after challenge end
      assert.equal((await grant(validBody({ date: dayKey(-30) }))).status, 400);
      assert.equal((await grant(validBody({ date: dayKey(25) }))).status, 400);
      assert.equal(await StreakAdjustment.countDocuments({}), 0);
    });

    test("accepts today's IST date and the challenge start day (inclusive bounds)", async () => {
      assert.equal((await grant(validBody({ date: dayKey(0) }))).status, 201);
      assert.equal((await grant(validBody({ date: istDateKey(challenge.startDate) }))).status, 201);
    });

    test('participant must be an active member of the challenge', async () => {
      assert.equal((await grant(validBody({ participantId: String(outsider._id) }))).status, 404);
      // The host is not a participant either
      assert.equal((await grant(validBody({ participantId: String(host._id) }))).status, 404);
      await ChallengeMembership.updateOne({ user: manasvi._id }, { status: 'left' });
      assert.equal((await grant(validBody())).status, 404);
    });

    test('is refused for a day that already has an approved submission', async () => {
      await addApproved(manasvi, dayKey(-2), 'two-sum');
      assert.equal((await grant(validBody({ date: dayKey(-2) }))).status, 409);
    });

    test('a pending or rejected submission on that day does not block protection', async () => {
      await Submission.create({
        participant: manasvi._id,
        challenge: challenge._id,
        problemTitle: 'Rejected One',
        problemUrl: 'https://leetcode.com/problems/rejected-one/',
        problemSlug: 'rejected-one',
        completionDate: noonIst(dayKey(-2)),
        status: 'Rejected',
      });
      assert.equal((await grant(validBody({ date: dayKey(-2) }))).status, 201);
    });
  });

  describe('list, revoke and history', () => {
    test('lists history with host identity and populated participant', async () => {
      await grant(validBody({ date: dayKey(-2) }));
      await grant(validBody({ date: dayKey(-3), reason: 'Second outage on the sync worker' }));
      const res = await request(app)
        .get(`/api/streak-adjustments/challenge/${challenge._id}`)
        .set('Authorization', `Bearer ${hostToken}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.count, 2);
      assert.equal(res.body.adjustments[0].date, dayKey(-2), 'newest date first');
      assert.equal(res.body.adjustments[0].participant.name, 'Manasvi');
      assert.equal(res.body.adjustments[0].grantedBy.name, 'Host One');
      assert.equal(JSON.stringify(res.body).includes('passwordHash'), false);
    });

    test('supports status and participant filters and rejects bad ones', async () => {
      const created = await grant(validBody());
      await request(app)
        .post(`/api/streak-adjustments/${created.body.adjustment._id}/revoke`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ reason: 'granted by mistake' });
      const get = (q) =>
        request(app).get(`/api/streak-adjustments/challenge/${challenge._id}${q}`).set('Authorization', `Bearer ${hostToken}`);
      assert.equal((await get('?status=active')).body.count, 0);
      assert.equal((await get('?status=revoked')).body.count, 1);
      assert.equal((await get(`?participantId=${manasvi._id}`)).body.count, 1);
      assert.equal((await get('?status=bogus')).status, 400);
      assert.equal((await get('?participantId=bogus')).status, 400);
    });

    test('revoke keeps the record, stamps who/when/why and blocks double revoke', async () => {
      const created = await grant(validBody());
      const id = created.body.adjustment._id;
      const res = await request(app)
        .post(`/api/streak-adjustments/${id}/revoke`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ reason: 'Participant actually submitted' });
      assert.equal(res.status, 200);
      assert.equal(res.body.adjustment.status, 'revoked');
      assert.equal(String(res.body.adjustment.revokedBy), String(host._id));
      assert.ok(res.body.adjustment.revokedAt);
      assert.equal(res.body.adjustment.revokeReason, 'Participant actually submitted');
      assert.equal(await StreakAdjustment.countDocuments({}), 1, 'record retained for audit');

      const again = await request(app)
        .post(`/api/streak-adjustments/${id}/revoke`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({});
      assert.equal(again.status, 409);
    });

    test('revoke validates id and existence', async () => {
      const bad = await request(app).post('/api/streak-adjustments/nope/revoke').set('Authorization', `Bearer ${hostToken}`).send({});
      assert.equal(bad.status, 400);
      const missing = await request(app)
        .post(`/api/streak-adjustments/${new (require('mongoose').Types.ObjectId)()}/revoke`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({});
      assert.equal(missing.status, 404);
    });

    test('a revoked day can be granted again, preserving both history rows', async () => {
      const first = await grant(validBody());
      await request(app).post(`/api/streak-adjustments/${first.body.adjustment._id}/revoke`).set('Authorization', `Bearer ${hostToken}`).send({});
      const second = await grant(validBody({ reason: 'Re-granted after review' }));
      assert.equal(second.status, 201);
      assert.equal(await StreakAdjustment.countDocuments({}), 2);
      assert.equal(await StreakAdjustment.countDocuments({ status: 'active' }), 1);
    });
  });

  describe('streak continuity and integrity', () => {
    test('Manasvi scenario: protected day preserves the consecutive streak on the leaderboard', async () => {
      await addApproved(manasvi, dayKey(-3), 'a');
      await addApproved(manasvi, dayKey(-1), 'b');
      await addApproved(manasvi, dayKey(0), 'c');

      let entry = (await getBoard()).body.leaderboard.find((e) => e.name === 'Manasvi');
      assert.equal(entry.currentStreak, 2, 'gap on day -2 breaks the streak before protection');
      assert.equal(entry.longestStreak, 2);
      assert.equal(entry.protectedDays, 0);

      const res = await grant(validBody({ date: dayKey(-2) }));
      assert.equal(res.status, 201);
      assert.equal(res.body.streak.currentStreak, 4);

      entry = (await getBoard()).body.leaderboard.find((e) => e.name === 'Manasvi');
      assert.equal(entry.currentStreak, 4);
      assert.equal(entry.longestStreak, 4);
      assert.equal(entry.activeDays, 4);
      assert.equal(entry.protectedDays, 1);
    });

    test('revoking removes the protected day from the streak again', async () => {
      await addApproved(manasvi, dayKey(-1), 'b');
      await addApproved(manasvi, dayKey(-3), 'a');
      const created = await grant(validBody({ date: dayKey(-2) }));
      assert.equal(created.body.streak.currentStreak, 3);
      const revoked = await request(app)
        .post(`/api/streak-adjustments/${created.body.adjustment._id}/revoke`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({});
      assert.equal(revoked.body.streak.currentStreak, 1);
      const entry = (await getBoard()).body.leaderboard.find((e) => e.name === 'Manasvi');
      assert.equal(entry.currentStreak, 1);
      assert.equal(entry.protectedDays, 0);
    });

    test('a participant with only a protected yesterday still shows on the board with a streak but zero points', async () => {
      await grant(validBody({ date: dayKey(-1) }));
      const entry = (await getBoard()).body.leaderboard.find((e) => e.name === 'Manasvi');
      assert.equal(entry.currentStreak, 1);
      assert.equal(entry.totalPoints, 0);
      assert.equal(entry.solvedCount, 0);
    });

    test('never creates submissions, score transactions or leaderboard points, and never alters submission timestamps', async () => {
      const sub = await addApproved(manasvi, dayKey(0), 'solo', 10);
      const before = await Submission.findById(sub._id).lean();
      const boardBefore = (await getBoard()).body.leaderboard.find((e) => e.name === 'Manasvi');
      const submissionCount = await Submission.countDocuments({});
      const scoreCount = await ScoreTransaction.countDocuments({});

      const created = await grant(validBody({ date: dayKey(-1) }));
      await grant(validBody({ date: dayKey(-2) }));
      await request(app).post(`/api/streak-adjustments/${created.body.adjustment._id}/revoke`).set('Authorization', `Bearer ${hostToken}`).send({});

      assert.equal(await Submission.countDocuments({}), submissionCount, 'no fabricated submission');
      assert.equal(await ScoreTransaction.countDocuments({}), scoreCount, 'no score transaction');
      const after = await Submission.findById(sub._id).lean();
      assert.deepEqual(after, before, 'submission untouched (timestamps, points, status)');

      const boardAfter = (await getBoard()).body.leaderboard.find((e) => e.name === 'Manasvi');
      assert.equal(boardAfter.totalPoints, boardBefore.totalPoints);
      assert.equal(boardAfter.solvedCount, boardBefore.solvedCount);
      assert.equal(boardAfter.approvedSubmissions, boardBefore.approvedSubmissions);
      assert.equal(boardAfter.rank, boardBefore.rank);
    });

    test('adjustments are scoped to their own challenge', async () => {
      const second = await Challenge.create({
        title: 'Other Sprint',
        joinCode: 'OTHER026',
        host: host._id,
        startDate: new Date(Date.now() - 10 * 86400000),
        endDate: new Date(Date.now() + 20 * 86400000),
        status: 'active',
      });
      await ChallengeMembership.create({ user: manasvi._id, challenge: second._id, role: 'participant', status: 'active' });
      await grant(validBody({ date: dayKey(-1) }));
      const other = await request(app).get(`/api/leaderboard/${second._id}`).set('Authorization', `Bearer ${hostToken}`);
      const entry = other.body.leaderboard.find((e) => e.name === 'Manasvi');
      assert.equal(entry.currentStreak, 0);
      assert.equal(entry.protectedDays, 0);
    });
  });

  describe('participant view (GET /mine)', () => {
    const mine = (token, challengeId = challenge._id) =>
      request(app).get(`/api/streak-adjustments/mine?challengeId=${challengeId}`).set('Authorization', `Bearer ${token}`);

    test('participant sees only their own active protected days and streak', async () => {
      const created = await grant(validBody({ date: dayKey(-1), reason: 'Sync worker outage' }));
      await grant(validBody({ date: dayKey(-2), reason: 'Another outage on sync' }));
      await request(app).post(`/api/streak-adjustments/${created.body.adjustment._id}/revoke`).set('Authorization', `Bearer ${hostToken}`).send({});

      const res = await mine(manasviToken);
      assert.equal(res.status, 200);
      assert.equal(res.body.adjustments.length, 1, 'revoked is hidden');
      assert.equal(res.body.adjustments[0].date, dayKey(-2));
      assert.equal(res.body.adjustments[0].grantedBy.name, 'Host One');
      assert.equal(res.body.streak.protectedDays, 1);
      // Never leaks internals
      assert.equal('grantedBy' in res.body.adjustments[0] && '_id' in res.body.adjustments[0].grantedBy, false);
    });

    test('requires a valid challengeId and active membership', async () => {
      assert.equal((await request(app).get('/api/streak-adjustments/mine').set('Authorization', `Bearer ${manasviToken}`)).status, 400);
      assert.equal((await mine(manasviToken, 'nope')).status, 400);
      assert.equal((await mine(outsiderToken)).status, 403);
    });
  });
});
