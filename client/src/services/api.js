/**
 * Centralized API Service
 * Handles base URL configuration and standard HTTP requests
 */

const BASE_URL = import.meta.env.VITE_API_URL || '';

export const API_BASE_URL = BASE_URL;

/**
 * Fetch server health status
 */
export async function fetchHealth() {
  const url = `${BASE_URL}/api/health`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
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
