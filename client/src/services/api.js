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

/**
 * Register a new user
 * Note: Always registers as participant
 */
export async function registerUser(userData) {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

/**
 * Log in with existing credentials
 */
export async function loginUser(credentials) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

/**
 * Fetch current authenticated user's profile
 */
export async function getMeProfile(token) {
  return request('/api/auth/me', {
    method: 'GET',
    token,
  });
}
