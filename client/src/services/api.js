/**
 * Centralized API Service
 * Handles base URL configuration, Bearer token injection, and standard HTTP requests
 */

const BASE_URL = import.meta.env.VITE_API_URL || '';

export const API_BASE_URL = BASE_URL;

/**
 * Leaderboard refresh signalling (no WebSockets, no new dependencies).
 * Any action that can change standings (join, submit, approve, reject) calls
 * notifyLeaderboardChanged(). The Leaderboard page listens for the same-tab
 * custom event and for the cross-tab `storage` event and re-fetches.
 */
export const LEADERBOARD_CHANGED_EVENT = 'unanimous:leaderboard-changed';
export const LEADERBOARD_CHANGED_STORAGE_KEY = 'unanimous_leaderboard_changed_at';

export function notifyLeaderboardChanged() {
  try {
    localStorage.setItem(LEADERBOARD_CHANGED_STORAGE_KEY, String(Date.now()));
    window.dispatchEvent(new Event(LEADERBOARD_CHANGED_EVENT));
  } catch {
    // Storage may be unavailable (private mode); polling still keeps data fresh.
  }
}

/**
 * Standard HTTP request wrapper with JSON error handling
 */
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.token && { Authorization: `Bearer ${options.token}` }),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = (data && data.message) || `HTTP error! status: ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

/**
 * Fetch server health status
 */
export async function fetchHealth() {
  return request('/api/health', { method: 'GET' });
}

/* ==================== Auth Services ==================== */

export async function registerUser(userData) {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

export async function loginUser(credentials) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export async function getMeProfile(token) {
  return request('/api/auth/me', {
    method: 'GET',
    token,
  });
}

/* ==================== Challenge Services ==================== */

export async function joinChallenge(joinCode, token) {
  const data = await request('/api/challenges/join', {
    method: 'POST',
    token,
    body: JSON.stringify({ joinCode }),
  });
  notifyLeaderboardChanged();
  return data;
}

export async function getMyChallenges(token) {
  return request('/api/challenges/mine', {
    method: 'GET',
    token,
  });
}

export async function createChallenge(challengeData, token) {
  return request('/api/challenges', {
    method: 'POST',
    token,
    body: JSON.stringify(challengeData),
  });
}

export async function getChallengeById(id, token) {
  return request(`/api/challenges/${id}`, {
    method: 'GET',
    token,
  });
}

/* ==================== Submission Services ==================== */

export async function submitProblem(submissionData, token) {
  const data = await request('/api/submissions', {
    method: 'POST',
    token,
    body: JSON.stringify(submissionData),
  });
  notifyLeaderboardChanged();
  return data;
}

export async function getMySubmissions(challengeId, token) {
  const query = challengeId ? `?challengeId=${challengeId}` : '';
  return request(`/api/submissions/mine${query}`, {
    method: 'GET',
    token,
  });
}

export async function getSubmissionById(id, token) {
  return request(`/api/submissions/${id}`, {
    method: 'GET',
    token,
  });
}

/* ==================== Host Review Queue Services ==================== */

export async function getReviewQueue(params = {}, token) {
  const queryParts = [];
  if (params.status) queryParts.push(`status=${encodeURIComponent(params.status)}`);
  if (params.challengeId) queryParts.push(`challengeId=${encodeURIComponent(params.challengeId)}`);
  if (params.participantId) queryParts.push(`participantId=${encodeURIComponent(params.participantId)}`);
  if (params.page) queryParts.push(`page=${encodeURIComponent(params.page)}`);
  if (params.limit) queryParts.push(`limit=${encodeURIComponent(params.limit)}`);

  const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  return request(`/api/submissions/review-queue${queryString}`, {
    method: 'GET',
    token,
  });
}

export async function reviewSubmission(submissionId, reviewData, token) {
  const data = await request(`/api/submissions/${submissionId}/review`, {
    method: 'POST',
    token,
    body: JSON.stringify(reviewData),
  });
  notifyLeaderboardChanged();
  return data;
}

/* ==================== Host Analytics Services ==================== */

export async function getSubmissionAnalytics(challengeId, token) {
  return request(`/api/submissions/analytics/${encodeURIComponent(challengeId)}`, {
    method: 'GET',
    token,
    cache: 'no-store',
  });
}

/* ==================== Leaderboard Services ==================== */

export async function getChallengeLeaderboard(challengeId, timeframe, token) {
  const query = timeframe ? `?timeframe=${encodeURIComponent(timeframe)}` : '';
  return request(`/api/leaderboard/${challengeId}${query}`, {
    method: 'GET',
    token,
    cache: 'no-store',
  });
}

/* ==================== LeetCode Automation Services ==================== */
export async function getAutomationStatus(challengeId, token) {
  return request(`/api/automation/${challengeId}/status`, { method: 'GET', token });
}
export async function startAutomationVerification(challengeId, username, token) {
  return request(`/api/automation/${challengeId}/verification/start`, { method: 'POST', token, body: JSON.stringify({ username, consent: true }) });
}
export async function confirmAutomationVerification(challengeId, token) {
  return request(`/api/automation/${challengeId}/verification/confirm`, { method: 'POST', token, body: JSON.stringify({}) });
}
export async function updateAutomationEnrollment(challengeId, action, token) {
  return request(`/api/automation/${challengeId}/${action}`, { method: 'POST', token, body: JSON.stringify({}) });
}
export async function triggerAutomationSync(challengeId, token) {
  return request(`/api/automation/${challengeId}/sync`, { method: 'POST', token, body: JSON.stringify({}) });
}
export async function setChallengeAutomation(challengeId, enabled, token) {
  return request(`/api/automation/${challengeId}/host-settings`, { method: 'PUT', token, body: JSON.stringify({ enabled }) });
}
export async function getAutomationEnrollments(challengeId, token) {
  return request(`/api/automation/${challengeId}/enrollments`, { method: 'GET', token });
}

/* ==================== Host Streak Protection Services ==================== */
export async function grantStreakAdjustment(payload, token) {
  const data = await request('/api/streak-adjustments', { method: 'POST', token, body: JSON.stringify(payload) });
  notifyLeaderboardChanged();
  return data;
}
export async function getStreakAdjustments(challengeId, token, params = {}) {
  const parts = [];
  if (params.participantId) parts.push(`participantId=${encodeURIComponent(params.participantId)}`);
  if (params.status) parts.push(`status=${encodeURIComponent(params.status)}`);
  const qs = parts.length ? `?${parts.join('&')}` : '';
  return request(`/api/streak-adjustments/challenge/${encodeURIComponent(challengeId)}${qs}`, { method: 'GET', token, cache: 'no-store' });
}
export async function revokeStreakAdjustment(id, reason, token) {
  const data = await request(`/api/streak-adjustments/${encodeURIComponent(id)}/revoke`, { method: 'POST', token, body: JSON.stringify({ reason }) });
  notifyLeaderboardChanged();
  return data;
}
export async function getMyStreakAdjustments(challengeId, token) {
  return request(`/api/streak-adjustments/mine?challengeId=${encodeURIComponent(challengeId)}`, { method: 'GET', token, cache: 'no-store' });
}
