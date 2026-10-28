/**
 * Centralized API Service
 * Handles base URL configuration, Bearer token injection, and standard HTTP requests
 */

const BASE_URL = import.meta.env.VITE_API_URL || '';

export const API_BASE_URL = BASE_URL;

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
  return request('/api/challenges/join', {
    method: 'POST',
    token,
    body: JSON.stringify({ joinCode }),
  });
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
  return request('/api/submissions', {
    method: 'POST',
    token,
    body: JSON.stringify(submissionData),
  });
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
  return request(`/api/submissions/${submissionId}/review`, {
    method: 'POST',
    token,
    body: JSON.stringify(reviewData),
  });
}
