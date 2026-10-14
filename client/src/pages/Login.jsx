import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Boxes, Lock, Mail, Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (userType) => {
    let demoEmail = '';
    let demoPassword = '';

    if (userType === 'admin') {
      demoEmail = 'admin@smartinventory.com';
      demoPassword = 'Admin123!';
    } else {
      demoEmail = 'staff@smartinventory.com';
      demoPassword = 'Staff123!';
    }

    setEmail(demoEmail);
    setPassword(demoPassword);

    try {
      setLoading(true);
      setError('');
      await login(demoEmail, demoPassword);
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Quick login failed. Ensure demo data is seeded.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-gray-50 via-gray-100 to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-950">
      {/* Left panel - Decorative Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-emerald-800 dark:bg-emerald-950 text-white flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#22c55e_1px,transparent_1px)] [background-size:20px_20px] opacity-15"></div>
        <div className="relative z-10 flex items-center space-x-3">
          <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center border border-white/20">
            <Boxes className="w-7 h-7 text-emerald-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">SmartInventory</h1>
            <p className="text-xs text-emerald-200">Order & Stock Management</p>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <span className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-semibold rounded-full uppercase tracking-wider mb-4 border border-emerald-400/20">
            Enterprise Grade for Small Business
          </span>
          <h2 className="text-3xl font-extrabold leading-snug mb-4">
            Master your inventory, streamline purchase orders & accelerate sales.
          </h2>
          <p className="text-emerald-100/80 text-sm leading-relaxed mb-6">
            Real-time stock tracking with atomic decrement safeguards, automated supplier purchase cycles, and actionable sales intelligence.
          </p>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="bg-white/10 backdrop-blur p-3 rounded-lg border border-white/10">
              <p className="font-semibold text-white">Atomic Stock Lock</p>
              <p className="text-emerald-200/70 text-[11px]">Zero negative stock risk</p>
            </div>
            <div className="bg-white/10 backdrop-blur p-3 rounded-lg border border-white/10">
              <p className="font-semibold text-white">Daily Cron Alerts</p>
              <p className="text-emerald-200/70 text-[11px]">Automated low-stock scans</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-emerald-200/60">
          Smart Inventory & Order Management System &copy; {new Date().getFullYear()}
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 sm:p-10">
          <div className="flex items-center space-x-3 lg:hidden mb-6">
            <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">SmartInventory</h2>
              <p className="text-xs text-gray-500">Retail & Wholesale Manager</p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Sign In</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Enter your credentials to access your dashboard
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@business.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2 disabled:opacity-60"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Logins */}
          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center mb-3">
              Quick Demo Access
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                disabled={loading}
                className="flex items-center justify-center space-x-2 py-2 px-3 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-medium transition-all"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Admin Role</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('staff')}
                disabled={loading}
                className="flex items-center justify-center space-x-2 py-2 px-3 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs font-medium transition-all"
              >
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span>Staff Role</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
