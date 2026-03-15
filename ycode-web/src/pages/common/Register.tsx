import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ApiError } from '../../utils/RestApiUtil';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  User,
  Code2,
  Mic,
  TrendingUp,
  ArrowRight,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) setError('');
  };

  const validateForm = (): string | null => {
    if (!formData.email || !formData.username || !formData.password || !formData.confirmPassword) {
      return 'All fields are required';
    }

    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match';
    }

    if (formData.password.length < 8) {
      return 'Password must be at least 8 characters long';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return 'Please enter a valid email address';
    }

    if (formData.username.length < 3) {
      return 'Username must be at least 3 characters long';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      await register(formData.email, formData.username, formData.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const passwordsMatch =
    formData.confirmPassword &&
    formData.password === formData.confirmPassword;

  const passwordsMismatch =
    formData.confirmPassword &&
    formData.password !== formData.confirmPassword;

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
              Y
            </div>
            <span className="text-white text-2xl font-semibold tracking-tight">
              Yuvro
            </span>
          </div>
        </div>

        {/* Centered Content Wrapper */}
        <div className="relative z-10 flex flex-col gap-12">
          {/* Hero */}
          <div className="max-w-md">
            <h1 className="text-5xl font-bold text-white leading-tight">
              Start Your Tech Journey.
            </h1>

            <p className="text-orange-100 mt-6 text-lg leading-relaxed">
              Join thousands of developers building their skills,
              preparing for interviews, and accelerating their careers.
            </p>

            <div className="mt-8 text-orange-200 text-sm uppercase tracking-widest">
              Free • Fast • Developer-focused
            </div>
          </div>

          {/* Features */}
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white">
                <Code2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Hands-on Coding</h3>
                <p className="text-orange-100 text-sm mt-1">
                  Practice real-world challenges.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Mock Interviews</h3>
                <p className="text-orange-100 text-sm mt-1">
                  Improve with AI feedback.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Track Growth</h3>
                <p className="text-orange-100 text-sm mt-1">
                  Visualize your progress.
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
              Create your account
            </h2>
            <p className="text-slate-500 text-sm mt-2">
              Get started in seconds.
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 p-4 rounded-lg bg-rose-50 border border-rose-200">
              <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-1" />
              <div>
                <p className="text-sm font-medium text-rose-800">
                  Registration failed
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
                  name="email"
                  type="email"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
                <input
                  name="username"
                  type="text"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                  placeholder="Choose a username"
                  value={formData.username}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="w-full pl-10 pr-11 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                  placeholder="Minimum 8 characters"
                  value={formData.password}
                  onChange={handleChange}
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

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Confirm password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
                <input
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  className="w-full pl-10 pr-11 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {formData.confirmPassword && (
                <div className="mt-2 flex items-center gap-2">
                  {passwordsMatch ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs text-emerald-600">
                        Passwords match
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-rose-500" />
                      <span className="text-xs text-rose-600">
                        Passwords do not match
                      </span>
                    </>
                  )}
                </div>
              )}
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
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-8">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-orange-600 font-semibold hover:text-orange-700"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;