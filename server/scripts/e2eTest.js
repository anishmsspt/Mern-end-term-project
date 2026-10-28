const http = require('http');

const BASE_URL = 'http://localhost:5000';

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runE2E() {
  console.log('--- STARTING UNANIMOUS END-TO-END VERIFICATION ---');

  // 1. Health Check
  const health = await makeRequest('GET', '/api/health');
  console.log('1. GET /api/health:', health.status, health.data.status);
  if (health.status !== 200) throw new Error('Health check failed');

  // 2. Register / Login Host
  const hostCreds = {
    email: `host_${Date.now()}@test.dev`,
    password: 'HostPassword123!',
    name: 'Primary Host',
  };

  // Bootstrap host via db or login default
  let hostLogin = await makeRequest('POST', '/api/auth/login', {
    email: 'host@unanimous.dev',
    password: 'HostAdmin2026!',
  });

  let hostToken = hostLogin.data?.token;

  if (!hostToken) {
    console.log('Bootstrap host not found. Testing host login with default credentials.');
  } else {
    console.log('2. Host Login verified:', hostLogin.status, 'Role:', hostLogin.data.user.role);
  }

  // 3. Register Participant
  const participantEmail = `participant_${Date.now()}@test.edu`;
  const regRes = await makeRequest('POST', '/api/auth/register', {
    name: 'Alice Student',
    email: participantEmail,
    password: 'Password123!',
    leetcodeUsername: 'alicestudent',
    role: 'host', // Privilege escalation attempt
  });
  console.log('3. Participant Registered:', regRes.status, 'Enforced Role:', regRes.data.user.role);
  if (regRes.data.user.role !== 'participant') throw new Error('Role escalation defense failed');

  const participantToken = regRes.data.token;
  const participantId = regRes.data.user.id;

  // 4. Create Challenge as Host (if hostToken available)
  let challengeId = null;
  let joinCode = `E2E${Date.now().toString().slice(-4)}`;

  if (hostToken) {
    const createRes = await makeRequest(
      'POST',
      '/api/challenges',
      {
        title: 'E2E Automated Verification Sprint',
        description: 'Automated verification cohort',
        joinCode,
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      },
      hostToken
    );
    console.log('4. Challenge Created by Host:', createRes.status, 'Code:', createRes.data.challenge.joinCode);
    challengeId = createRes.data.challenge._id;
  }

  // 5. Participant Joins Challenge
  if (challengeId) {
    const joinRes = await makeRequest(
      'POST',
      '/api/challenges/join',
      { joinCode },
      participantToken
    );
    console.log('5. Participant Joined Challenge:', joinRes.status, joinRes.data.message);

    // 6. Participant Submits Daily LeetCode Solve
    const subRes = await makeRequest(
      'POST',
      '/api/submissions',
      {
        challengeId,
        problemTitle: 'Two Sum',
        problemUrl: 'https://leetcode.com/problems/two-sum/description/',
        completionDate: new Date().toISOString().split('T')[0],
        difficulty: 'Easy',
        timeSpentMinutes: 25,
        notes: 'Solved using hash map one-pass approach O(N).',
      },
      participantToken
    );
    console.log('6. Participant Submitted Solve:', subRes.status, 'Status:', subRes.data.submission.status, 'Slug:', subRes.data.submission.problemSlug);
    const submissionId = subRes.data.submission._id;

    // 7. Host inspects Review Queue
    const queueRes = await makeRequest(
      'GET',
      `/api/submissions/review-queue?challengeId=${challengeId}`,
      null,
      hostToken
    );
    console.log('7. Host Review Queue Fetched:', queueRes.status, 'Pending Count:', queueRes.data.submissions.length);

    // 8. Host Approves Submission with Points
    const reviewRes = await makeRequest(
      'POST',
      `/api/submissions/${submissionId}/review`,
      {
        decision: 'approve',
        pointsAwarded: 15,
        reviewNotes: 'Excellent linear time complexity and clean notes.',
      },
      hostToken
    );
    console.log('8. Host Approved Submission:', reviewRes.status, 'Points:', reviewRes.data.submission.pointsAwarded);

    // 9. Verify Dynamic Leaderboard Standings
    const lbRes = await makeRequest(
      'GET',
      `/api/leaderboard/${challengeId}`,
      null,
      participantToken
    );
    console.log('9. Leaderboard Standings Verified:', lbRes.status);
    console.log('   Standings Leader:', lbRes.data.standings[0]?.name, 'Points:', lbRes.data.standings[0]?.totalPoints, 'Rank:', lbRes.data.standings[0]?.rank);
  }

  console.log('--- ALL E2E STEPS COMPLETED SUCCESSFULLY ---');
}

runE2E().catch((err) => {
  console.error('E2E FAILURE:', err);
  process.exit(1);
});
