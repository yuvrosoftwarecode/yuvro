import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ApiError } from '../../utils/RestApiUtil';
import { redirectToDashboard } from '../../utils/redirectToDashboard';
import { useGoogleLogin } from '@react-oauth/google';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Code2, Mic, TrendingUp, ArrowRight, Loader2 } from 'lucide-react';

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

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      const loggedInUser = await login(email, password);

      if (loggedInUser && loggedInUser.role) {
        redirectToDashboard(loggedInUser, navigate);
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setError('');
      setIsLoading(true);
      try {
        await loginWithGoogle(tokenResponse.access_token);
        navigate(from, { replace: true });
      } catch (err) {
        if (err instanceof ApiError) setError(err.message);
        else setError('Google Sign In failed');
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => {
      setError('Google Sign In was unsuccessful');
      setIsLoading(false);
    }
  });

  const features = [
    {
      icon: <Code2 className="w-5 h-5" />,
      title: 'Practice Coding',
      description: 'Solve challenges across 30+ languages',
    },
    {
      icon: <Mic className="w-5 h-5" />,
      title: 'Mock Interviews',
      description: 'AI-powered interview preparation',
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      title: 'Career Growth',
      description: 'Track progress and build your portfolio',
    },
  ];

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left Panel -- Premium Branding */}
      <div className="hidden lg:flex lg:w-[45%] relative flex-col justify-center p-14 overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #9a3412 0%, #c2410c 40%, #ea580c 100%)',
        }}
      >

        {/* Soft Glow Background */}
        <div className="absolute -top-20 -right-20 w-[500px] h-[500px] bg-orange-300/20 rounded-full blur-3xl" />

        {/* Top Logo - Pinned Absolute */}
        <div className="absolute top-14 left-14 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-orange-600 font-bold text-lg shadow-lg">
              Y
            </div>
            <span className="text-white text-2xl font-semibold tracking-tight">
              Yuvro
            </span>
          </div>
        </div>

        {/* Centered Content Wrapper */}
        <div className="relative z-10 flex flex-col gap-12">

          {/* Middle Hero Content */}
          <div className="max-w-md">
            <h1 className="text-5xl font-bold text-white leading-tight">
              Build Your Tech Career.
            </h1>

            <p className="text-orange-100 mt-6 text-lg leading-relaxed">
              Practice coding, master interviews, and track your growth —
              all in one powerful platform built for ambitious developers.
            </p>

            <div className="mt-8 text-orange-200 text-sm uppercase tracking-widest">
              Trusted by thousands of developers
            </div>
          </div>

          {/* Bottom Feature Section */}
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white">
                <Code2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Hands-on Coding</h3>
                <p className="text-orange-100 text-sm mt-1">
                  Solve real-world problems in multiple languages.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white font-semibold">AI Mock Interviews</h3>
                <p className="text-orange-100 text-sm mt-1">
                  Simulate real interviews and improve instantly.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Track Progress</h3>
                <p className="text-orange-100 text-sm mt-1">
                  Visualize growth and stay consistent.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel -- Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-16 bg-gradient-to-br from-white to-slate-50">
        <div className="w-full max-w-md bg-white shadow-xl shadow-orange-500/5 rounded-2xl p-10 border border-slate-100">
          {/* Header */}
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              Welcome back
            </h2>
            <p className="text-slate-500 text-sm mt-2">
              Sign in to continue building your future in tech.
            </p>
          </div>

          {/* Error */}
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
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all"
                  placeholder="you@example.com"
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
                  className="w-full pl-10 pr-11 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="w-[18px] h-[18px]" />
                  ) : (
                    <Eye className="w-[18px] h-[18px]" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.98] disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-4 text-xs text-slate-400 uppercase tracking-wider">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Google */}
            <button
              type="button"
              onClick={() => handleGoogleLogin()}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign in with Google
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-sm text-slate-500 mt-8">
            Don’t have an account?{' '}
            <Link
              to="/register"
              className="text-orange-600 font-semibold hover:text-orange-700"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
