import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
        <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
          <Navbar />
          <main className="flex-1">
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
                  <div className="lc-page py-20 text-center space-y-2">
                    <h1 className="text-3xl font-semibold text-white">404</h1>
                    <p className="text-sm text-slate-400">Page not found.</p>
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
