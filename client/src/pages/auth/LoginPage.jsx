import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const from = location.state?.from?.pathname || '/dashboard';

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (errorMsg) setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.email || !formData.password) {
      setErrorMsg('Please enter both your email address and password.');
      return;
    }

    setIsLoading(true);
    try {
      await login(formData.email, formData.password);
      navigate(from, { replace: true });
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-4xl border border-cream-100/10 rounded overflow-hidden shadow-frame bg-ink-950 grid grid-cols-1 md:grid-cols-2">
        {/* Left Side: Cinematic Visual with Dawn Ridge */}
        <div className="relative hidden md:flex flex-col justify-end p-8 bg-cover bg-[center_30%] min-h-[460px]"
             style={{ backgroundImage: "url('/dawn-ridge.jpg')" }}>
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-ink-950/20" />
          <div className="relative z-10">
            <div className="lc-eyebrow mb-2 text-peach-200">The Cohort</div>
            <blockquote className="font-serif italic text-2xl text-cream-50 leading-snug">
              “Track solves. Review submissions. Rank the cohort.”
            </blockquote>
            <p className="mt-3 text-xs text-cream-200/70">
              Unanimous LeetCode Challenge Hub
            </p>
          </div>
        </div>

        {/* Right Side: Editorial Form */}
        <div className="p-8 sm:p-12 flex flex-col justify-center bg-ink-900/60 backdrop-blur-sm">
          <div>
            <div className="lc-eyebrow mb-3">Welcome back</div>
            <h1 className="font-serif font-normal text-3xl sm:text-4xl text-cream-50 tracking-tight">
              Sign in
            </h1>
            <p className="text-xs text-ink-400 mt-2">
              Use your Unanimous Challenge Hub account.
            </p>
          </div>

          {errorMsg && (
            <div className="mt-5 p-3 rounded-sm border border-hard/40 bg-hard/10 flex items-start gap-2.5 text-xs text-hard">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="lc-label">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
                className="lc-input"
              />
            </div>

            <div>
              <label className="lc-label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="lc-input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-ink-500 hover:text-cream-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="lc-btn-primary w-full py-2.5 text-xs mt-2 group justify-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign in{' '}
                  <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-ink-400">
            No account yet?{' '}
            <Link to="/register" className="text-peach-300 hover:text-cream-50 underline decoration-peach-300/40 underline-offset-4">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
