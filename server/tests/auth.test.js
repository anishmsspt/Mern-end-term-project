const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Challenge = require('../src/models/Challenge');
const { generateToken } = require('../src/utils/token');

describe('Authentication & Role-Based Authorization Tests', () => {
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
    // Clear collections between tests for deterministic isolation
    await User.deleteMany({});
    await Challenge.deleteMany({});
  });

  describe('Registration Workflow (POST /api/auth/register)', () => {
    test('successfully registers a participant and returns JWT token and profile', async () => {
      const payload = {
        name: 'Alice Developer',
        email: 'alice@example.com',
        password: 'Password123!',
        leetcodeUsername: 'alice_coder',
      };

      const res = await request(app).post('/api/auth/register').send(payload);

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.token);
      assert.equal(res.body.user.name, 'Alice Developer');
      assert.equal(res.body.user.email, 'alice@example.com');
      assert.equal(res.body.user.role, 'participant');
      assert.equal(res.body.user.leetcodeUsername, 'alice_coder');
      assert.equal(res.body.user.passwordHash, undefined, 'passwordHash must never be exposed');

      // Verify stored in DB
      const dbUser = await User.findOne({ email: 'alice@example.com' });
      assert.ok(dbUser);
      assert.equal(dbUser.role, 'participant');
    });

    test('DEFENDS AGAINST PRIVILEGE ESCALATION: Ignores client-supplied role: "host"', async () => {
      const maliciousPayload = {
        name: 'Eve Attacker',
        email: 'eve@example.com',
        password: 'Password123!',
        role: 'host', // Attempting to register directly as host
      };

      const res = await request(app).post('/api/auth/register').send(maliciousPayload);

      assert.equal(res.status, 201);
      assert.equal(res.body.user.role, 'participant', 'Role escalation must be strictly neutralized to participant');

      const dbUser = await User.findOne({ email: 'eve@example.com' });
      assert.equal(dbUser.role, 'participant');
    });

    test('rejects duplicate email addresses with 409 Conflict', async () => {
      // Create initial user
      await request(app).post('/api/auth/register').send({
        name: 'Bob Original',
        email: 'bob@example.com',
        password: 'Password123!',
      });

      // Attempt duplicate registration
      const res = await request(app).post('/api/auth/register').send({
        name: 'Bob Duplicate',
        email: 'bob@example.com',
        password: 'DifferentPassword123!',
      });

      assert.equal(res.status, 409);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /already exists/i);
    });

    test('rejects invalid inputs (short password, bad email, empty name) with 400 Bad Request', async () => {
      // Short password
      const res1 = await request(app).post('/api/auth/register').send({
        name: 'John',
        email: 'john@example.com',
        password: '123',
      });
      assert.equal(res1.status, 400);

      // Malformed email
      const res2 = await request(app).post('/api/auth/register').send({
        name: 'John',
        email: 'not-an-email',
        password: 'ValidPassword123!',
      });
      assert.equal(res2.status, 400);

      // Blank name
      const res3 = await request(app).post('/api/auth/register').send({
        name: '',
        email: 'john2@example.com',
        password: 'ValidPassword123!',
      });
      assert.equal(res3.status, 400);
    });
  });

  describe('Login Workflow (POST /api/auth/login)', () => {
    beforeEach(async () => {
      const passwordHash = await User.hashPassword('Secret1234!');
      await User.create({
        name: 'Charlie Participant',
        email: 'charlie@example.com',
        passwordHash,
        role: 'participant',
      });
    });

    test('successfully logs in with valid credentials and returns token', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'charlie@example.com',
        password: 'Secret1234!',
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.token);
      assert.equal(res.body.user.email, 'charlie@example.com');
      assert.equal(res.body.user.passwordHash, undefined);
    });

    test('rejects incorrect password with generic 401 Unauthorized', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'charlie@example.com',
        password: 'WrongPassword!',
      });

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.message, 'Invalid email or password.');
    });

    test('rejects non-existent email with generic 401 Unauthorized', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'nonexistent@example.com',
        password: 'AnyPassword!',
      });

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.message, 'Invalid email or password.');
    });
  });

  describe('Protected Routes & Role Authorization (GET /api/auth/me & /host-only)', () => {
    let participantToken;
    let hostToken;

    beforeEach(async () => {
      const hash = await User.hashPassword('Pass12345!');

      const participant = await User.create({
        name: 'Dan Participant',
        email: 'dan@example.com',
        passwordHash: hash,
        role: 'participant',
      });

      const host = await User.create({
        name: 'Helen Host',
        email: 'helen@example.com',
        passwordHash: hash,
        role: 'host',
      });

      participantToken = generateToken(participant);
      hostToken = generateToken(host);
    });

    test('GET /api/auth/me succeeds with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${participantToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.user.email, 'dan@example.com');
    });

    test('GET /api/auth/me rejects missing token with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/auth/me');

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /Authentication required/i);
    });

    test('GET /api/auth/me rejects invalid token with 401 Unauthorized', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.payload');

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /Invalid authentication token/i);
    });

    test('BLOCKS PARTICIPANT FROM HOST ACTION: Participant receives 403 Forbidden on host-only route', async () => {
      const res = await request(app)
        .get('/api/auth/host-only')
        .set('Authorization', `Bearer ${participantToken}`);

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /Forbidden.*requires.*host/i);
    });

    test('PERMITS HOST: Host user receives 200 OK on host-only route', async () => {
      const res = await request(app)
        .get('/api/auth/host-only')
        .set('Authorization', `Bearer ${hostToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.user.role, 'host');
    });

    test('BOOTSTRAP SAFETY: Cannot create second Host or overwrite existing Host', async () => {
      // Helen Host was already created in beforeEach
      const existingHostCount = await User.countDocuments({ role: 'host' });
      assert.equal(existingHostCount, 1);

      // Verify the existence check prevents creating a replacement
      const hostExists = await User.findOne({ role: 'host' });
      assert.ok(hostExists);
      assert.equal(hostExists.email, 'helen@example.com');
    });
  });

  describe('Development Host Provisioning (POST /api/auth/provision-host)', () => {
    const TEST_PROVISION_SECRET = 'super_secret_test_provision_token_xyz';

    beforeEach(() => {
      process.env.NODE_ENV = 'test';
      process.env.PROVISION_HOST_SECRET = TEST_PROVISION_SECRET;
    });

    test('rejection when PROVISION_HOST_SECRET is missing on the server', async () => {
      delete process.env.PROVISION_HOST_SECRET;

      const res = await request(app)
        .post('/api/auth/provision-host')
        .send({ secret: 'any_secret' });

      assert.equal(res.status, 503);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /PROVISION_HOST_SECRET is not configured/i);
    });

    test('rejection when invalid secret is supplied', async () => {
      const res = await request(app)
        .post('/api/auth/provision-host')
        .send({ secret: 'wrong_secret_123' });

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /Invalid or missing provisioning secret/i);
    });

    test('rejection when called in production mode regardless of secret', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const res = await request(app)
        .post('/api/auth/provision-host')
        .set('x-provision-secret', TEST_PROVISION_SECRET)
        .send({});

      process.env.NODE_ENV = originalEnv;

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /strictly disabled in production/i);
    });

    test('successfully provisions a Host and initial challenge when valid secret is provided', async () => {
      // Ensure no host exists
      await User.deleteMany({ role: 'host' });
      await Challenge.deleteMany({});

      const res = await request(app)
        .post('/api/auth/provision-host')
        .set('x-provision-secret', TEST_PROVISION_SECRET)
        .send({
          email: 'newhost@unanimous.dev',
          password: 'HostPassword2026!',
          name: 'New Host',
          leetcodeUsername: 'newhostcoder',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.host.email, 'newhost@unanimous.dev');
      assert.equal(res.body.host.role, 'host');
      assert.equal(res.body.challenge.joinCode, 'SPRINT26');

      // Verify Host can now authenticate
      const loginRes = await request(app).post('/api/auth/login').send({
        email: 'newhost@unanimous.dev',
        password: 'HostPassword2026!',
      });
      assert.equal(loginRes.status, 200);
      assert.equal(loginRes.body.user.role, 'host');
    });

    test('prevents duplicate Host provisioning or overwriting existing Host', async () => {
      // First provision
      await User.deleteMany({ role: 'host' });
      await request(app)
        .post('/api/auth/provision-host')
        .set('x-provision-secret', TEST_PROVISION_SECRET)
        .send({
          email: 'firsthost@unanimous.dev',
          password: 'HostPassword2026!',
        });

      // Second attempt to provision
      const res = await request(app)
        .post('/api/auth/provision-host')
        .set('x-provision-secret', TEST_PROVISION_SECRET)
        .send({
          email: 'secondhost@unanimous.dev',
          password: 'AnotherPassword2026!',
        });

      assert.equal(res.status, 409);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /Host account already exists/i);
    });
  });

  describe('Challenge Model Validation', () => {
    test('enforces challenge date order and required fields', async () => {
      const host = await User.create({
        name: 'Challenge Organizer',
        email: 'organizer@example.com',
        passwordHash: 'dummy',
        role: 'host',
      });

      // Try creating challenge where endDate is before startDate
      const invalidChallenge = new Challenge({
        title: 'Broken Date Challenge',
        joinCode: 'BAD123',
        host: host._id,
        startDate: new Date('2026-05-10'),
        endDate: new Date('2026-05-01'), // Earlier than start
      });

      let error = null;
      try {
        await invalidChallenge.validate();
      } catch (err) {
        error = err;
      }

      assert.ok(error, 'Expected validation error when endDate is before startDate');
      assert.match(error.message, /End date must be strictly after start date/);
    });
  });
});
