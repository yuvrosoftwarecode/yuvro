import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ApiError } from '../../utils/RestApiUtil';
import { redirectToDashboard } from '../../utils/redirectToDashboard';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  BookOpen,
  Code2,
  Users,
  ArrowRight,
  Loader2,
} from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, loginWithGoogle, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (isAuthenticated && user && user.role) {
      redirectToDashboard(user, navigate);
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) return setError('Please enter your email address.');
    if (!password.trim()) return setError('Please enter your password.');
    if (!email.includes('@')) return setError('Please enter a valid email address.');

    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else if (err instanceof Error) setError(err.message);
      else setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);

    try {
      await loginWithGoogle();
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex overflow-hidden">

      {/* ================= LEFT PANEL ================= */}
      <div
        className="hidden lg:flex lg:w-[45%] relative flex-col justify-center p-14 overflow-hidden"
        style={{
          background:
            'linear-gradient(145deg, #9a3412 0%, #c2410c 40%, #ea580c 100%)',
        }}
      >
        {/* Soft glow */}
        <div className="absolute -top-20 -right-20 w-[500px] h-[500px] bg-orange-300/20 rounded-full blur-3xl" />

        {/* Logo - Pinned Absolute */}
        <div className="absolute top-14 left-14 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-orange-600 font-bold text-lg shadow-lg">
              YC
            </div>
            <span className="text-white text-2xl font-semibold tracking-tight">
              Yuvro Campus
            </span>
          </div>
        </div>

        {/* Centered Content Wrapper */}
        <div className="relative z-10 flex flex-col gap-12">
          {/* Hero */}
          <div className="max-w-md">
            <h1 className="text-5xl font-bold text-white leading-tight">
              Your Complete Campus Platform.
            </h1>

            <p className="text-orange-100 mt-6 text-lg leading-relaxed">
              Manage academics, build skills, and connect your entire campus —
              all in one place.
            </p>

            <div className="mt-8 text-orange-200 text-sm uppercase tracking-widest">
              Academic • Skills • Community
            </div>
          </div>

          {/* Features */}
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Academic Management</h3>
                <p className="text-orange-100 text-sm mt-1">
                  Departments, subjects and curriculum.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white">
                <Code2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Skill Development</h3>
                <p className="text-orange-100 text-sm mt-1">
                  Coding practice and certifications.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Campus Connect</h3>
                <p className="text-orange-100 text-sm mt-1">
                  Collaborate with faculty and peers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= RIGHT PANEL ================= */}
      <div className="flex-1 overflow-y-auto flex items-center justify-center px-6 py-8 bg-gradient-to-br from-white to-slate-50">

        <div className="w-full max-w-md bg-white shadow-xl shadow-orange-500/5 rounded-2xl p-10 border border-slate-100">

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900">
              Welcome!
            </h2>
            <p className="text-slate-500 text-sm mt-2">
              Sign in to your campus account.
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 p-4 rounded-lg bg-rose-50 border border-rose-200">
              <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-1" />
              <div>
                <p className="text-sm font-medium text-rose-800">
                  Sign in failed
                </p>
                <p className="text-sm text-rose-600 mt-1">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
                <input
                  type="email"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                  placeholder="you@campus.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="w-full pl-10 pr-11 py-3 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.98] disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                <>
                  Log In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </form>

          {/* <p className="text-center text-sm text-slate-500 mt-8">
            Don’t have an account?{' '}
            <Link
              to="/register"
              className="text-orange-600 font-semibold hover:text-orange-700"
            >
              Sign up
            </Link>
          </p> */}
        </div>
      </div>
    </div>
  );
};

export default Login;