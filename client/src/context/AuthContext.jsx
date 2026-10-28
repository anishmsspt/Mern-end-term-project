import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, registerUser, getMeProfile } from '../services/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'unanimous_auth_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize and verify user on mount or token change
  useEffect(() => {
    let isMounted = true;

    async function initializeUser() {
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const res = await getMeProfile(token);
        if (isMounted) {
          setUser(res.user);
          setError(null);
        }
      } catch (err) {
        console.warn('[Auth] Session validation failed:', err.message);
        if (isMounted) {
          // Token is invalid or expired
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initializeUser();

    return () => {
      isMounted = false;
    };
  }, [token]);

  /**
   * Log in user with credentials
   */
  const login = async (email, password) => {
    setError(null);
    try {
      const data = await loginUser({ email, password });
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  /**
   * Register new user (Participant)
   */
  const register = async (userData) => {
    setError(null);
    try {
      const data = await registerUser(userData);
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  /**
   * Log out current user and clear stored token
   */
  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setError(null);
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user,
    isHost: user?.role === 'host' || user?.role === 'admin',
    isParticipant: user?.role === 'participant',
    isLoading,
    error,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
