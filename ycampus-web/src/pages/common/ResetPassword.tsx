import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { getPasswordStrength } from "../../utils/passwordStrength";

const ResetPassword: React.FC = () => {
  const { uidb64, token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const strength = getPasswordStrength(password);
  const strengthColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-lime-500", "bg-green-600"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      await axios.post(
        `${import.meta.env.BACKEND_API_BASE_URL}/auth/reset-password/${uidb64}/${token}/`,
        { password }
      );

      setMessage("Password reset successful. Redirecting...");
      setTimeout(() => navigate("/login"), 1500);

    } catch (err: any) {
      setError(err.response?.data?.error || "Reset link is invalid or expired.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-md border border-slate-200 shadow-sm rounded-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Yuvro</h1>
          <p className="text-sm text-slate-500 mt-1">Set a new password</p>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md py-2 px-3 text-center">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md py-2 px-3 text-center">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full h-11 border border-slate-300 rounded-md px-3 pr-10 focus:border-slate-800 focus:ring-2 focus:ring-slate-800"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" className="absolute inset-y-0 right-0 px-3 text-sm text-slate-500"
                onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {/* Strength Meter */}
            <div className="mt-2 h-2 bg-slate-200 rounded overflow-hidden">
              <div className={`h-full rounded ${strengthColors[strength]}`} style={{ width: `${(strength + 1) * 25}%` }}></div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                className="w-full h-11 border border-slate-300 rounded-md px-3 pr-10 focus:border-slate-800 focus:ring-2 focus:ring-slate-800"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button type="button" className="absolute inset-y-0 right-0 px-3 text-sm text-slate-500"
                onClick={() => setShowConfirm(!showConfirm)}>
                {showConfirm ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button className="w-full h-11 bg-slate-900 text-white rounded-md font-medium hover:bg-slate-800">
            Reset Password
          </button>
        </form>

        <p className="text-center text-sm text-slate-600 mt-6">
          <Link to="/login" className="font-medium text-slate-900 hover:underline">Back to login</Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
