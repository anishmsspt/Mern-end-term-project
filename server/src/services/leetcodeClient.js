const ENDPOINT = 'https://leetcode.com/graphql';
const USER_AGENT = 'UnanimousLeetCodeHub/1.0 (submission sync; respectful low-volume polling)';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function graphql(query, variables = {}, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 12000);
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'Referer': 'https://leetcode.com/', 'User-Agent': USER_AGENT },
      body: JSON.stringify({ query, variables }),
    });
    if (response.status === 403 || response.status === 429) {
      const error = new Error(`LeetCode temporarily blocked requests (HTTP ${response.status})`);
      error.status = response.status; error.retryAfter = response.headers.get('retry-after'); throw error;
    }
    if (!response.ok) { const error = new Error(`LeetCode returned HTTP ${response.status}`); error.status = response.status; throw error; }
    const payload = await response.json();
    if (payload.errors?.length) throw new Error(payload.errors.map((e) => e.message).join('; '));
    return payload.data;
  } finally { clearTimeout(timeout); }
}
async function getPublicProfile(username) {
  const data = await graphql('query($username:String!){matchedUser(username:$username){username profile{aboutMe}}}', { username });
  return data?.matchedUser || null;
}
async function getRecentAccepted(username, limit = 20) {
  const data = await graphql('query($username:String!,$limit:Int!){recentAcSubmissionList(username:$username,limit:$limit){id title titleSlug timestamp}}', { username, limit: Math.min(20, limit) });
  return data?.recentAcSubmissionList || [];
}
async function getProblem(slug) {
  const data = await graphql('query($slug:String!){question(titleSlug:$slug){title titleSlug difficulty}}', { slug });
  return data?.question || null;
}
module.exports = { graphql, getPublicProfile, getRecentAccepted, getProblem, sleep };
