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
- [ ] **Milestone 2 (Phase 2):** User and Challenge Mongoose models, bcrypt password hashing, JWT authentication, and Host/Participant role authorization.
- [ ] **Milestone 3 (Phase 3):** Challenge membership (join codes) and daily LeetCode submission engine with canonical URL validation.
- [ ] **Milestone 4 (Phase 4):** Host review queue, submission approval/rejection state machine, and point allocation.
- [ ] **Milestone 5 (Phase 5):** Auditable score transactions and dynamic overall/weekly leaderboard.
- [ ] **Milestone 6 (Phase 6):** Weekly problem sets, participant analytics, and announcements.
- [ ] **Milestone 7 (Phase 7):** Comprehensive automated testing and security hardening.
- [ ] **Milestone 8 (Phase 8):** Production deployment and live evaluation.
