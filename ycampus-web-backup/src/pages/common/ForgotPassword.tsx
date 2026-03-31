import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setIsLoading(true);

    try {
      await axios.post(`${import.meta.env.BACKEND_API_BASE_URL}/auth/forgot-password/`, {
        email,
      });
      setMessage("If this email exists, a reset link will be sent.");
    } catch (err) {
      setMessage("If this email exists, a reset link will be sent.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-md border border-slate-200 shadow-sm rounded-lg p-8">

        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Yuvro</h1>
          <p className="text-sm text-slate-500 mt-1">Reset your password</p>
        </div>

        {message && (
          <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md py-2 px-3 text-center">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Email
            </label>
            <input
              type="email"
              required
              className="w-full h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:ring-2 focus:ring-slate-800 focus:outline-none disabled:opacity-50"
              placeholder="Enter your account email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-md bg-slate-900 text-white font-medium hover:bg-slate-800 disabled:opacity-50"
          >
            {isLoading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-600 mt-6">
          <Link to="/login" className="font-medium text-slate-900 hover:underline">
            Back to login
          </Link>
        </p>

      </div>
    </div>
  );
};

export default ForgotPassword;
