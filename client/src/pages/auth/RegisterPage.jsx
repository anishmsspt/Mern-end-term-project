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
    <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-4xl border border-cream-100/10 rounded overflow-hidden shadow-frame bg-ink-950 grid grid-cols-1 md:grid-cols-2">
        {/* Left Side: Editorial Banner */}
        <div className="relative hidden md:flex flex-col justify-end p-8 bg-cover bg-[center_35%] min-h-[500px]"
             style={{ backgroundImage: "url('/dawn-ridge.jpg')" }}>
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-ink-950/20" />
          <div className="relative z-10">
            <div className="lc-eyebrow mb-2 text-peach-200">Registration</div>
            <blockquote className="font-serif italic text-2xl text-cream-50 leading-snug">
              “Enter the arena. Log your solves at first light.”
            </blockquote>
            <p className="mt-3 text-xs text-cream-200/70">
              Participant accounts report solves and climb the cohort leaderboard. Host access is provisioned separately.
            </p>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="p-8 sm:p-10 flex flex-col justify-center bg-ink-900/60 backdrop-blur-sm">
          <div>
            <div className="lc-eyebrow mb-2">Join the cohort</div>
            <h1 className="font-serif font-normal text-3xl sm:text-4xl text-cream-50 tracking-tight">
              Create account
            </h1>
            <p className="text-xs text-ink-400 mt-1">
              Start competing with your cohort.
            </p>
          </div>

          {errorMsg && (
            <div className="mt-4 p-3 rounded-sm border border-hard/40 bg-hard/10 flex items-start gap-2 text-xs text-hard">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
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
                LeetCode handle <span className="text-ink-500 font-normal lowercase">(optional)</span>
              </label>
              <input
                type="text"
                name="leetcodeUsername"
                value={formData.leetcodeUsername}
                onChange={handleChange}
                placeholder="alex_coder99"
                className="lc-input font-mono text-peach-300"
              />
            </div>

            <div>
              <label className="lc-label">Password (8+ chars) *</label>
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

            <button
              type="submit"
              disabled={isLoading}
              className="lc-btn-primary w-full py-2.5 text-xs mt-2 group justify-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Register{' '}
                  <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
                </>
              )}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-ink-400">
            Already registered?{' '}
            <Link to="/login" className="text-peach-300 hover:text-cream-50 underline decoration-peach-300/40 underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
