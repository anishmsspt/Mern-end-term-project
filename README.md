# Unanimous LeetCode Challenge Hub

> A cinematic, full-stack competitive programming management platform designed for student groups, coding clubs, and engineering cohorts to replace spreadsheets, repeated WhatsApp messages, and manual score calculations.

---

## 🚀 Core Primary Workflow

$$\text{Participant Joins Challenge} \longrightarrow \text{Solves on LeetCode} \longrightarrow \text{Submits Solution} \longrightarrow \text{Host Reviews} \longrightarrow \text{Approves \& Allocates Points} \longrightarrow \text{Dynamic Standings Update}$$

1. **Host Provisions Challenge:** Host creates a cohort challenge (e.g., `SPRINT26`) defining start/end dates and daily submission caps.
2. **Participant Enrolls:** Participant authenticates, enters the join code, and links their LeetCode profile handle.
3. **Daily Solves Reported:** Participant inputs canonical LeetCode problem URLs with completion dates, difficulty notes, and approach explanations.
4. **Host Review Queue:** Host inspects submitted solutions in a dedicated review queue, with FIFO sorting and state tracking.
5. **Score Allocation & Audit Log:** Host approves with verified points (1–100) or rejects with a mandatory explanation. An immutable `ScoreTransaction` record is written atomically.
6. **Dynamic Authoritative Leaderboard:** Real-time standings update authoritatively from approved solutions with deterministic tie-breaking.

---

## 🛠️ Technology Stack (MERN)

- **Frontend:** React 18, Vite, React Router v6, Tailwind CSS (Cinematic Dark-mode Developer Theme), Lucide React.
- **Backend:** Node.js, Express.js, REST API architecture, stateless Bearer JWT, centralized error handling.
- **Database:** MongoDB & Mongoose.
  - **Production:** MongoDB Atlas cluster URI configured via `MONGODB_URI`.
  - **Local Development / Automated Tests:** Ephemeral In-Memory MongoDB (`mongodb-memory-server`) with explicit non-persistent warnings (strictly disabled in production).
- **Tooling:** Git, Node Test Runner (`node:test`), Supertest, Postman-compatible endpoints.

---

## 📁 Project Architecture & Structure

```text
d:\Mern End term\
├── client/                               # Vite + React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/ProtectedRoute.jsx
│   │   │   ├── submissions/             # JoinChallengeCard, SubmissionModal, SubmissionsList
│   │   │   ├── Navbar.jsx               # Navigation bar with role badges & leaderboard link
│   │   │   └── ConnectivityCard.jsx     # Diagnostic backend connectivity widget
│   │   ├── context/AuthContext.jsx      # Reactive auth state, token persistence, logout
│   │   ├── pages/
│   │   │   ├── auth/                    # LoginPage, RegisterPage
│   │   │   ├── dashboard/DashboardPage.jsx
│   │   │   ├── host/ReviewQueuePage.jsx # Host review queue, approve/reject modals
│   │   │   ├── leaderboard/LeaderboardPage.jsx # Real-time cohort standings table
│   │   │   └── LandingPage.jsx
│   │   ├── services/api.js              # Centralized fetch wrapper
│   │   ├── App.jsx                      # React Router routes
│   │   └── index.css                    # Tailwind CSS tokens
│   ├── .env.example
│   ├── vite.config.js
│   └── package.json
│
├── server/                               # Express Backend API
│   ├── src/
│   │   ├── config/db.js                 # Safe MongoDB connection utility (Atlas or dev memory server)
│   │   ├── controllers/
│   │   │   ├── authController.js        # Register, login, me
│   │   │   ├── challengeController.js   # Create, list, join
│   │   │   ├── submissionController.js  # Submit, inspect, review-queue, approve/reject
│   │   │   └── leaderboardController.js # Authoritative aggregation pipeline
│   │   ├── middleware/auth.js           # requireAuth, requireHost, requireParticipant
│   │   ├── models/
│   │   │   ├── User.js                  # User schema with bcrypt hashing & role enums
│   │   │   ├── Challenge.js             # Challenge schema & date order validation
│   │   │   ├── ChallengeMembership.js   # Compound unique index { user: 1, challenge: 1 }
│   │   │   ├── Submission.js            # Problem slug, status machine, canonical URL parser
│   │   │   └── ScoreTransaction.js      # Immutable audit records of awarded points
│   │   ├── routes/                      # authRoutes, challengeRoutes, submissionRoutes, leaderboardRoutes
│   │   ├── scripts/bootstrapHost.js     # Secure Host bootstrap script
│   │   ├── utils/token.js               # Stateless JWT generation & verification
│   │   ├── app.js                       # Express app, middleware, routes mount
│   │   └── server.js                    # Server listener bootstrap
│   ├── tests/                           # 47 automated tests (100% pass across 16 suites)
│   │   ├── health.test.js
│   │   ├── auth.test.js
│   │   ├── submissions.test.js
│   │   ├── hostReview.test.js
│   │   └── leaderboard.test.js
│   ├── .env.example
│   └── package.json
│
├── .gitignore                            # Clean MERN exclusions
└── package.json                          # Monorepo orchestration scripts
```

---

## ⚙️ Quick Start (Local Development)

### 1. Prerequisites
- **Node.js:** v18+ (tested on v24.11.1)
- **npm:** v9+ (tested on 11.6.2)

### 2. Install Dependencies
```bash
# Root dependencies
npm install

# Backend dependencies
npm install --prefix server

# Frontend dependencies
npm install --prefix client
```

### 3. Environment Configuration
Templates are provided in `.env.example`:
```bash
# Server configuration
copy server\.env.example server\.env

# Client configuration
copy client\.env.example client\.env
```

### 4. Provision Host Account
```bash
npm run bootstrap:host --prefix server
```
Default evaluation credentials:
- **Email:** `host@unanimous.dev`
- **Password:** `HostAdmin2026!`
- **Role:** `host`

### 5. Running the Application
```bash
# Run both Backend (Port 5000) and Frontend (Port 5173) concurrently:
npm run dev
```
- **Frontend App:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:5000](http://localhost:5000)
- **API Health Check:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

### 6. Automated Test Suite & Build Verification
```bash
# Run complete backend test suite (47 tests across 16 suites):
npm test --prefix server

# Run frontend production build:
npm run build --prefix client
```

---

## 📡 REST API Reference

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | System status, database connection, uptime |
| `POST` | `/api/auth/register` | Public | Register new participant (role escalation blocked) |
| `POST` | `/api/auth/login` | Public | Authenticate user & return Bearer token |
| `GET` | `/api/auth/me` | Authenticated | Fetch active user profile and role |
| `POST` | `/api/challenges` | Host | Create new cohort challenge with join code |
| `GET` | `/api/challenges/mine` | Authenticated | List challenges user is enrolled in or hosting |
| `POST` | `/api/challenges/join` | Participant | Join challenge using case-insensitive code |
| `POST` | `/api/submissions` | Participant | Submit solved LeetCode problem solve |
| `GET` | `/api/submissions/mine` | Participant | View submitted solves for active challenge |
| `GET` | `/api/submissions/:id` | Owner / Host | Isolated submission detail view |
| `GET` | `/api/submissions/review-queue` | Host | List pending submissions for host's challenges |
| `POST` | `/api/submissions/:id/review` | Host | Approve (with points) or reject (with reason) |
| `GET` | `/api/leaderboard/:challengeId` | Authenticated | Authoritative standings & breakdown |

---

## 🏆 Standings & Tie-Breaking Rules

Standings on `/leaderboard` are calculated dynamically via a MongoDB aggregation pipeline:
1. **Total Points Awarded (DESC):** Derived strictly from host-approved submissions.
2. **Total Solved Count (DESC):** Secondary tie-breaker for participants with identical points.
3. **Earliest Last Solve Timestamp (ASC):** Deterministic tertiary tie-breaker rewarding faster problem resolution.
4. **Timeframe Support:** Standings can be filtered by `Overall` or `This Week` (`?timeframe=weekly`).
5. **Auditable Score History:** Every approved submission writes an immutable `ScoreTransaction` storing the submission ID, reviewer ID, timestamp, and awarded points.

---

## 🧪 Evaluation & Demo Walkthrough

1. **Start Dev Servers:** Run `npm run dev`.
2. **Log in as Host:** Go to `http://localhost:5173/login` and log in with `host@unanimous.dev` / `HostAdmin2026!`.
3. **Copy Join Code:** On the Host Dashboard, find the active challenge (e.g. `SPRINT26`) or create one.
4. **Register Participant:** Log out, click Register, and create a participant account (e.g., `alice@student.edu`).
5. **Join Challenge:** On the Participant Dashboard, enter `SPRINT26` and click **Join Challenge**.
6. **Submit Solution:** Click **Submit Daily Problem**, provide a valid LeetCode URL (`https://leetcode.com/problems/two-sum/`), select difficulty, and submit.
7. **Host Review:** Log back in as Host, navigate to `/host/review`, find Alice's pending submission, and click **Approve** (allocate 10 points).
8. **Check Leaderboard:** Navigate to `/leaderboard` (or view on dashboard). Alice now appears at Rank #1 with 10 points, 1 solve, and a detailed difficulty breakdown.
