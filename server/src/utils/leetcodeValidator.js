/**
 * LeetCode Problem URL Validator and Canonicalizer
 */

const LEETCODE_HOSTNAMES = new Set(['leetcode.com', 'www.leetcode.com', 'leetcode.cn']);

/**
 * Validates a problem URL, extracting the canonical problem slug
 * @param {string} rawUrl - User submitted URL
 * @returns {{ isValid: boolean, slug?: string, canonicalUrl?: string, error?: string }}
 */
function parseLeetCodeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, error: 'Problem URL is required and must be a string.' };
  }

  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch (err) {
    return { isValid: false, error: 'Malformed URL: Please provide a valid HTTP/HTTPS URL.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { isValid: false, error: 'Invalid URL protocol: Must use http:// or https://' };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!LEETCODE_HOSTNAMES.has(hostname)) {
    return {
      isValid: false,
      error: `Invalid domain '${hostname}': URL must originate from leetcode.com (e.g. https://leetcode.com/problems/<slug>/)`,
    };
  }

  // Path format must be /problems/<slug>[/...]
  const pathParts = parsed.pathname.split('/').filter(Boolean);
  if (pathParts.length < 2 || pathParts[0].toLowerCase() !== 'problems') {
    return {
      isValid: false,
      error: 'Invalid LeetCode problem path: URL must match https://leetcode.com/problems/<slug>/',
    };
  }

  const rawSlug = pathParts[1].toLowerCase().trim();
  // Slug should be alphanumeric with hyphens
  if (!/^[a-z0-9-]+$/.test(rawSlug)) {
    return {
      isValid: false,
      error: `Invalid problem slug '${rawSlug}': Slugs may only contain alphanumeric characters and hyphens.`,
    };
  }

  const canonicalUrl = `https://leetcode.com/problems/${rawSlug}/`;

  return {
    isValid: true,
    slug: rawSlug,
    canonicalUrl,
  };
}

module.exports = {
  parseLeetCodeUrl,
};
