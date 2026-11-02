# Automation Integration Notes

## What changed

- Added `AutomationEnrollment` and `ProblemCache` persistence models.
- Added participant ownership verification using a short-lived code in the public LeetCode About Me profile.
- Added explicit consent, enrollment, pause, resume, disconnect, status, and manual-sync APIs.
- Added host challenge-level automation toggle and enrollment visibility.
- Added a one-shot Node.js sync worker and a GitHub Actions schedule (every 10 minutes).
- Added low-volume LeetCode GraphQL access with request timeouts, retry scheduling/backoff, a 403/429 circuit breaker, and per-enrollment database leases.
- Added recent-submission checkpoints, 20-item-window gap warnings, IST day boundaries, and per-challenge duplicate prevention.
- Added automated/manual source labels to the host review queue.
- Centralized server scoring: Easy 10, Medium 25, Hard 50. Host-supplied points and client-supplied difficulty are not trusted.
- Legacy unverified pending manual submissions are rechecked by the worker before they can be approved.
- Fixed MongoDB Memory Server temp/download paths for Windows/Linux/macOS.

## Setup required before production automation runs

1. Deploy the updated backend and frontend as usual.
2. In the GitHub repository, create an Actions secret named `MONGODB_URI` with the same persistent MongoDB Atlas URI used by Render.
3. Enable GitHub Actions for the repository.
4. A challenge host must enable automation in the dashboard.
5. Participants must explicitly consent, verify ownership of their public LeetCode profile, and enroll in each challenge.

No production data, GitHub repository, Vercel deployment, or Render deployment was modified by this work.

## Verification performed in this workspace

- `node --check` passed for every backend source and test JavaScript file.
- TypeScript's JSX parser successfully parsed all 17 frontend JS/JSX files with zero syntax diagnostics.
- The two new built-in Node tests for scoring and IST boundaries passed.
- The full backend test suite and Vite production build could not be executed here because npm dependency installation was blocked by registry DNS failures (`EAI_AGAIN`). The project ZIP does not include `node_modules`; install dependencies in a network-enabled environment before running the full suites.

## Important external limitation

The current LeetCode public GraphQL endpoint is unofficial and only exposes the most recent 20 accepted submissions in the query used here. The worker detects a possible gap when the complete returned window is newer than the saved checkpoint and records a warning. LeetCode may change or restrict this endpoint; the implementation backs off on HTTP 403/429 and does not bypass access controls.
