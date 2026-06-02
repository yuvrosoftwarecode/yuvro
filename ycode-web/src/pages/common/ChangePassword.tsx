import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import restApiAuthUtil from '../../utils/RestApiAuthUtil';
import { ApiError } from '../../utils/RestApiUtil';
import { getPasswordStrength } from '../../utils/passwordStrength';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, Loader2, User } from 'lucide-react';

const ChangePassword: React.FC = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const queryParams = new URLSearchParams(location.search);
  const stateFrom = (location.state as any)?.from;
  const redirectUrl = queryParams.get('redirect') || 
    (stateFrom ? (typeof stateFrom === 'object' ? stateFrom.pathname + (stateFrom.search || '') : stateFrom) : null) || 
    '/dashboard';

  const strength = getPasswordStrength(password);
  const strengthColors = ['bg-rose-500', 'bg-amber-500', 'bg-yellow-500', 'bg-emerald-500', 'bg-green-600'];
  const strengthLabels = ['Very Weak', 'Weak', 'Medium', 'Strong', 'Very Strong'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (user?.role === 'guest') {
      if (!firstName.trim()) {
        setError('Please enter your first name.');
        return;
      }
      if (!lastName.trim()) {
        setError('Please enter your last name.');
        return;
      }
    }

    if (!password.trim()) {
      setError('Please enter a new password.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const payload: any = { password };
      if (user?.role === 'guest') {
        payload.first_name = firstName.trim();
        payload.last_name = lastName.trim();
      }

      await restApiAuthUtil.post('/auth/change-password/', payload);
      
      // Update user state so role is updated from guest to student
      if (user) {
        const updatedUser = { 
          ...user, 
          role: user.role === 'guest' ? 'student' : user.role,
          first_name: user.role === 'guest' ? firstName.trim() : user.first_name,
          last_name: user.role === 'guest' ? lastName.trim() : user.last_name
        };
        updateUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }

      setSuccess('Password and profile details updated successfully! Redirecting...');
      setTimeout(() => {
        navigate(redirectUrl, { replace: true });
      }, 1500);
    } catch (err) {
      console.error('Password change error:', err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to update password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-orange-50/30 px-6 py-12">
      <div className="w-full max-w-md bg-white shadow-xl shadow-orange-500/5 rounded-2xl p-10 border border-slate-100 relative overflow-hidden">
        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-orange-600" />

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 font-bold text-xl mx-auto mb-4 border border-orange-100">
            Y
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Reset Temporary Password
          </h2>
          <p className="text-slate-500 text-sm mt-2">
            You must choose a new, secure password before you can start the job assessment.
          </p>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-6 flex items-start gap-3 p-4 rounded-lg bg-rose-50 border border-rose-200">
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-1" />
            <div>
              <p className="text-sm font-medium text-rose-800">Error</p>
              <p className="text-sm text-rose-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-start gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800">Success</p>
              <p className="text-sm text-green-600 mt-0.5">{success}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* First Name & Last Name */}
          {user?.role === 'guest' && (
            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top duration-300">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  First Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
                  <input
                    type="text"
                    className="w-full pl-10 pr-3 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all font-medium text-slate-800"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Last Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
                  <input
                    type="text"
                    className="w-full pl-10 pr-3 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all font-medium text-slate-800"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full pl-10 pr-11 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all"
                placeholder="Choose a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
              </button>
            </div>

            {/* Password Strength Meter */}
            {password && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-500 font-medium">Strength:</span>
                  <span className="font-semibold text-slate-700">{strengthLabels[strength]}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-full flex-1 rounded-full transition-all duration-300 ${
                        i <= strength ? strengthColors[strength] : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[11px] text-slate-400 block mt-1.5">
                  Password must be at least 8 characters long and contain letters, numbers, or symbols.
                </span>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
              <input
                type={showConfirm ? 'text' : 'password'}
                className="w-full pl-10 pr-11 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || success !== ''}
            className="w-full mt-2 py-3 rounded-xl text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.98] disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save & Continue'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
