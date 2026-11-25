import React, { useState } from 'react';
import {
  Mail, Lock, Eye, EyeOff, LogIn, Car, AlertCircle,
  ArrowRight, CheckCircle2, XCircle,
} from 'lucide-react';
import { authApi } from '../api';
import { validateLoginEmail, validateLoginPassword, normalizeEmail } from '../utils/validation';

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  if (!message) return null;
  const styles = {
    success: 'bg-emerald-50 border-emerald-400 text-emerald-800',
    error: 'bg-rose-50 border-rose-400 text-rose-800',
    info: 'bg-sky-50 border-sky-400 text-sky-800',
  };
  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg ${styles[type] || styles.info}`}>
      {type === 'success'
        ? <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
        : <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />}
      <p className="text-sm font-medium">{message}</p>
      <button onClick={onClose} className="ml-auto text-current opacity-60 hover:opacity-100">
        <XCircle className="w-4 h-4" />
      </button>
    </div>
  );
}

function ErrorMsg({ error, touched }) {
  if (!touched || !error) return null;
  return (
    <p className="mt-1 text-xs text-rose-600 font-medium flex items-center gap-1">
      <AlertCircle className="w-3 h-3 flex-shrink-0" /> {error}
    </p>
  );
}

export const Login = ({ onNavigateToRegister, onLoginSuccess }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [toast, setToast] = useState(null);

  // Wakeup indicator
  React.useEffect(() => {
    let timer;
    if (loading) {
      timer = setTimeout(() => setIsWakingUp(true), 2500);
    } else {
      setIsWakingUp(false);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  const validateField = (name, value) => {
    if (name === 'email') return validateLoginEmail(value).message;
    if (name === 'password') return validateLoginPassword(value).message;
    return '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (touched[name]) {
      setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
    }
    // Clear server toast on edit
    if (toast?.type === 'error') setToast(null);
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const validate = () => {
    setTouched({ email: true, password: true });
    const newErrors = {
      email: validateField('email', formData.email),
      password: validateField('password', formData.password),
    };
    setErrors(newErrors);
    return !newErrors.email && !newErrors.password;
  };

  const getFieldClass = (name) => {
    const base = 'w-full pl-9 pr-10 py-2.5 text-sm rounded-lg border transition-all duration-150 focus:outline-none focus:ring-2';
    if (touched[name] && errors[name]) return `${base} border-rose-400 bg-rose-50/30 text-rose-900 focus:ring-rose-400`;
    if (touched[name] && !errors[name] && formData[name]) return `${base} border-emerald-400 bg-emerald-50/20 focus:ring-emerald-400`;
    return `${base} border-slate-300 focus:ring-emerald-500 focus:border-emerald-500`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setToast(null);

    try {
      const response = await authApi.login(normalizeEmail(formData.email), formData.password);
      if (response.success && response.user) {
        setToast({ type: 'success', message: `Welcome back, ${response.user.name}!` });
        setTimeout(() => {
          if (onLoginSuccess) onLoginSuccess(response.user);
        }, 600);
      }
    } catch (apiErr) {
      if (apiErr.response) {
        const { status, data } = apiErr.response;
        if (status === 401) {
          setToast({ type: 'error', message: 'Invalid email or password.' });
        } else if (status === 403) {
          setToast({ type: 'error', message: data?.message || 'Your account has been suspended.' });
        } else if (status === 429) {
          setToast({ type: 'error', message: data?.message || 'Too many attempts. Please wait and try again.' });
        } else {
          setToast({ type: 'error', message: data?.message || 'Login failed. Please try again.' });
        }
      } else {
        setToast({
          type: 'error',
          message: `Connection error: ${apiErr.message}. Please check if the backend is reachable.`,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/30 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white text-center">
            <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Car className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">RideShareLocal</h2>
            <p className="text-xs text-emerald-100 mt-1">Sign in to your rideshare account</p>
          </div>

          <div className="p-6">
            <form onSubmit={handleSubmit} noValidate className="space-y-4">

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="your@email.com"
                    className={getFieldClass('email')}
                    maxLength={50}
                    autoComplete="email"
                    autoFocus
                  />
                  {touched.email && !errors.email && formData.email && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 pointer-events-none" />
                  )}
                </div>
                <ErrorMsg error={errors.email} touched={touched.email} />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  <a
                    href="#forgot"
                    onClick={(e) => {
                      e.preventDefault();
                      alert('Password reset instructions will be sent to your registered email.');
                    }}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Enter your password"
                    className={getFieldClass('password')}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <ErrorMsg error={errors.password} touched={touched.password} />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg shadow-sm transition-all duration-150 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>{isWakingUp ? 'Waking up cloud server…' : 'Verifying Credentials…'}</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Log In to Account</span>
                  </>
                )}
              </button>

              {loading && isWakingUp && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded-lg text-center animate-pulse">
                  ⏳ Cloud server is waking up from sleep mode (~15–20s on free tier). Please hold on…
                </p>
              )}
            </form>

            {/* Switch to Register */}
            <div className="text-center pt-4 mt-2 border-t border-slate-100">
              <p className="text-xs text-slate-600">
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={onNavigateToRegister}
                  className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline inline-flex items-center gap-1"
                >
                  Create new account <ArrowRight className="w-3 h-3" />
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
