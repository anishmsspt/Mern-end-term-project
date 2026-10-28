# Unanimous LeetCode Challenge Hub

> A centralized competitive programming challenge platform designed for student groups, coding clubs, and engineering cohorts to replace spreadsheets, repeated WhatsApp messages, and manual score calculations.

---

## 🚀 Core Primary Workflow

$$\text{Participant Solves on LeetCode} \longrightarrow \text{Submits Activity} \longrightarrow \text{Host Reviews} \longrightarrow \text{Host Approves \& Scores} \longrightarrow \text{Leaderboard Updates}$$

---

## 🛠️ Technology Stack (MERN)

- **Frontend:** React 18, Vite, React Router v6, Tailwind CSS (Dark-mode first), Lucide React.
- **Backend:** Node.js, Express.js, REST API architecture, centralized error handling.
- **Database:** MongoDB & Mongoose.
  - **Production:** MongoDB Atlas cluster URI configured via `MONGODB_URI`.
  - **Local Development / Automated Tests:** Optional ephemeral In-Memory MongoDB (`mongodb-memory-server`) with explicit non-persistent warnings (strictly disabled in production).
- **Tooling:** Git, Node Test Runner (`node:test`), Supertest.

---

## 📁 Project Architecture & Structure

```text
d:\Mern End term\
├── client/                     # Vite + React Frontend
│   ├── src/
│   │   ├── components/         # Navbar, ConnectivityCard (Health Diagnostic)
│   │   ├── pages/              # LandingPage
│   │   ├── services/           # api.js (Centralized fetch wrapper)
│   │   ├── App.jsx             # React Router structure
│   │   ├── index.css           # Tailwind custom styling & theme tokens
│   │   └── main.jsx
│   ├── .env.example
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── server/                     # Express Backend API
│   ├── src/
│   │   ├── config/             # db.js (MongoDB connection with safe dev-only fallback)
│   │   ├── app.js              # Express app, CORS, parsing, error handler, /api/health
│   │   └── server.js           # Server listener bootstrap
│   ├── tests/                  # Automated API tests (health.test.js)
│   ├── .env.example
│   └── package.json
│
├── .gitignore                  # Git exclusions (node_modules, .env, dist, logs)
└── package.json                # Root orchestration scripts
```

---

## ⚙️ Quick Start (Local Development)

### 1. Prerequisites
- **Node.js:** v18+ (verified on v24.11.1)
- **npm:** v9+ (verified on 11.6.2)

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
Copy `.env.example` templates to `.env`:
```bash
# Server environment
cp server/.env.example server/.env

# Client environment
cp client/.env.example client/.env
```

### 4. Running the Application
```bash
# Run both Backend (Port 5000) and Frontend (Port 5173) concurrently:
npm run dev

# Or run separately:
npm run dev:server
npm run dev:client
```

- **Frontend URL:** [http://localhost:5173](http://localhost:5173)
- **Backend Health Check:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

### 5. Automated Tests & Build Verification
```bash
# Run server test suite:
npm test --prefix server

# Build client for production:
npm run build --prefix client
```

---

## 📋 Milestones Progress
- [x] **Milestone 1:** Repository initialization, Express backend with `/api/health`, MongoDB connection utility with safe dev-only in-memory fallback, React + Vite + Tailwind dark-mode UI with live connectivity diagnostics, and production build verification.
- [x] **Milestone 2 (Phase 2):** User and Challenge Mongoose models, bcrypt password hashing, stateless JWT authentication (`/api/auth/register`, `/api/auth/login`, `/api/auth/me`), Host vs Participant RBAC authorization middleware, secure first-Host bootstrap script (`npm run bootstrap:host`), and reactive AuthContext with protected routes.
- [x] **Milestone 3 (Phase 3):** Challenge membership (join codes with compound unique index), canonical LeetCode URL parser, daily submission engine (`POST /api/submissions`), participant history views, duplicate solve prevention, and participant data isolation.
- [ ] **Milestone 4 (Phase 4):** Host review queue, submission approval/rejection state machine, and point allocation.
- [ ] **Milestone 5 (Phase 5):** Auditable score transactions and dynamic overall/weekly leaderboard.
- [ ] **Milestone 6 (Phase 6):** Weekly problem sets, participant analytics, and announcements.
- [ ] **Milestone 7 (Phase 7):** Comprehensive automated testing and security hardening.
- [ ] **Milestone 8 (Phase 8):** Production deployment and live evaluation.

---

## 🎯 Challenge Membership & Submissions (Phase 3)

### Challenge Joining (`POST /api/challenges/join`)
- Participants supply a case-insensitive join code (e.g. `SPRINT26`).
- Enforces compound unique index `{ user: 1, challenge: 1 }` to prevent duplicate memberships.
- Validates challenge status (`active`) and active date window (`startDate <= now <= endDate`).
- Restricts joining to `participant` accounts only (Hosts manage challenges).

### Daily Problem Submissions (`POST /api/submissions`)
- **Canonical LeetCode URL Parsing:** Validates incoming URLs against `leetcode.com`, extracts the problem slug (e.g. `https://leetcode.com/problems/two-sum/description/` $\rightarrow$ `two-sum`), and generates a canonical link `https://leetcode.com/problems/two-sum/`.
- **Duplicate Solve Prevention:** Prevents participants from submitting duplicate solves for problems that are currently in `Pending` or `Approved` status in the same challenge.
- **Date & Limit Validation:** Rejects future completion dates, dates preceding challenge start, and enforces `maxSubmissionsPerDay` challenge policies.
- **Data Isolation:** `GET /api/submissions/:id` ensures only the submitting participant or the Challenge Host can view private submission details; unauthorized participants receive `403 Forbidden`.

---

## 🔐 Authentication & Role-Based Authorization (Phase 2)

### JWT Strategy & Trade-Offs
- **Architecture:** Stateless Bearer Token via `Authorization: Bearer <token>` header.
- **Why Bearer over Cookie:** Avoids third-party cross-origin blocking between independent frontend and backend domains; immune to ambient CSRF attacks; high interoperability with automated tests and API consumers.
- **Revocation & Expiration:** Configurable token expiration (default: 7 days) paired with database account status verification on every authenticated request.
- **Client Behavior:** Logout immediately clears stored tokens from `localStorage` and resets reactive `AuthContext` state.

### Secure First-Host Provisioning
Public registration is strictly constrained to `role: 'participant'`. The primary Host is provisioned securely through the CLI bootstrap utility, which refuses to overwrite an existing Host:

```bash
# Provision first host with environment variables (or defaults):
npm run bootstrap:host --prefix server
```

Default local credentials for evaluation:
- **Email:** `host@unanimous.dev`
- **Password:** `HostAdmin2026!`
- **Role:** `host`
