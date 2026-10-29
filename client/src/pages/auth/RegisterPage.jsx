import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    leetcodeUsername: '',
    password: '',
    confirmPassword: '',
    bio: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (errorMsg) setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      setErrorMsg('Please enter your full name (at least 2 characters).');
      return;
    }

    if (!formData.email.trim()) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (formData.password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify and try again.');
      return;
    }

    setIsLoading(true);
    try {
      await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        leetcodeUsername: formData.leetcodeUsername.trim(),
        password: formData.password,
        bio: formData.bio.trim(),
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed. Please check your details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto px-4 py-10">
      <h1 className="text-xl font-semibold text-white">Create account</h1>
      <p className="text-sm text-slate-400 mt-1 mb-4">
        Participant accounts report solves and appear on the leaderboard. Host access is provisioned separately.
      </p>

      {errorMsg && (
        <div className="mb-4 lc-card border-hard/30 p-3 flex items-start gap-2 text-xs text-hard">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="lc-card p-5 space-y-3">
        <div>
          <label className="lc-label">Full name *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Alex Johnson"
            required
            className="lc-input"
          />
        </div>

        <div>
          <label className="lc-label">Email *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="alex@example.com"
            required
            className="lc-input"
          />
        </div>

        <div>
          <label className="lc-label">
            LeetCode username <span className="text-slate-600">(optional)</span>
          </label>
          <input
            type="text"
            name="leetcodeUsername"
            value={formData.leetcodeUsername}
            onChange={handleChange}
            placeholder="alex_coder99"
            className="lc-input font-mono"
          />
        </div>

        <div>
          <label className="lc-label">Password (8+ characters) *</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              className="lc-input pr-9"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-300"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="lc-label">Confirm password *</label>
          <input
            type={showPassword ? 'text' : 'password'}
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="••••••••"
            required
            className="lc-input"
          />
        </div>

        <button type="submit" disabled={isLoading} className="lc-btn-primary w-full mt-1">
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating account...
            </>
          ) : (
            'Register'
          )}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-400">
        Already registered?{' '}
        <Link to="/login" className="text-brand-500 hover:text-brand-400">
          Sign in
        </Link>
      </p>
    </div>
  );
}
