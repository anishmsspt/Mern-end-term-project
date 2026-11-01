import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ReviewQueuePage from './pages/host/ReviewQueuePage';
import LeaderboardPage from './pages/leaderboard/LeaderboardPage';
import ProtectedRoute from './components/common/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-ink-950 text-cream-100 flex flex-col font-sans">
          <Navbar />
          <main className="flex-1 flex flex-col">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/leaderboard"
                element={
                  <ProtectedRoute>
                    <LeaderboardPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/host/review"
                element={
                  <ProtectedRoute allowedRoles={['host', 'admin']}>
                    <ReviewQueuePage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="*"
                element={
                  <div className="lc-page py-28 text-center space-y-4">
                    <div className="lc-eyebrow justify-center">Error 404</div>
                    <h1 className="font-serif text-5xl text-cream-50 font-normal">Page not found</h1>
                    <p className="text-sm text-ink-400 max-w-sm mx-auto">
                      The challenge page or resource you are looking for does not exist or has been relocated.
                    </p>
                    <div className="pt-4">
                      <Link to="/" className="lc-btn-secondary">
                        Return to Hub
                      </Link>
                    </div>
                  </div>
                }
              />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
