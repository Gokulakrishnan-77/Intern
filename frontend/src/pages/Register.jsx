import React, { useState, useCallback } from 'react';
import {
  User, Phone, Mail, MapPin, Calendar, Lock, Eye, EyeOff,
  UserPlus, ArrowLeft, CheckCircle2, AlertCircle, Car,
  ShieldCheck, Database, XCircle,
} from 'lucide-react';
import { authApi } from '../api';
import {
  validateName, validateEmail, validateMobile, validatePassword,
  validateConfirmPassword, getPasswordStrength,
  normalizeName, normalizeEmail, normalizeMobile,
} from '../utils/validation';

// ─── Toast Component ──────────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  if (!message) return null;
  const styles = {
    success: 'bg-emerald-50 border-emerald-400 text-emerald-800',
    error: 'bg-rose-50 border-rose-400 text-rose-800',
    info: 'bg-sky-50 border-sky-400 text-sky-800',
  };
  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg ${styles[type] || styles.info} animate-pulse`}>
      {type === 'success' ? <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />}
      <p className="text-sm font-medium">{message}</p>
      <button onClick={onClose} className="ml-auto text-current opacity-60 hover:opacity-100">
        <XCircle className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Field wrapper helpers ────────────────────────────────────────────────────
function fieldClass(touched, error, value) {
  const base = 'w-full pl-9 pr-3 py-2 text-sm rounded-lg border transition-all duration-150 focus:outline-none focus:ring-2';
  if (touched && error) return `${base} border-rose-400 bg-rose-50/30 text-rose-900 focus:ring-rose-400`;
  if (touched && !error && value) return `${base} border-emerald-400 bg-emerald-50/20 focus:ring-emerald-400`;
  return `${base} border-slate-300 focus:ring-emerald-500 focus:border-emerald-500`;
}

function FieldStatus({ touched, error, value }) {
  if (!touched || !value) return null;
  if (error) return <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-500 pointer-events-none" />;
  return <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 pointer-events-none" />;
}

function ErrorMsg({ error, touched }) {
  if (!touched || !error) return null;
  return (
    <p className="mt-1 text-xs text-rose-600 font-medium flex items-center gap-1">
      <AlertCircle className="w-3 h-3 flex-shrink-0" /> {error}
    </p>
  );
}

// ─── Password Strength Bar ────────────────────────────────────────────────────
function PasswordStrengthBar({ password }) {
  if (!password) return null;
  const strength = getPasswordStrength(password);
  return (
    <div className="mt-2">
      <div className="flex gap-1 h-1.5">
        {[1, 2, 3].map(level => (
          <div
            key={level}
            className={`flex-1 rounded-full transition-all duration-300 ${strength.score >= level ? strength.color : 'bg-slate-200'}`}
          />
        ))}
      </div>
      <p className={`text-[11px] mt-1 font-semibold ${strength.textColor || 'text-slate-400'}`}>
        Password strength: {strength.label}
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export const Register = ({ onNavigateToLogin, onRegisterSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    gender: '',
    age: '',
    address: '',
    role: 'rider',
    password: '',
    confirmPassword: '',
    agreedToTerms: false,
  });

  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [toast, setToast] = useState(null);

  // ── Wakeup timer ────────────────────────────────────────────────────────────
  React.useEffect(() => {
    let timer;
    if (loading) {
      timer = setTimeout(() => setIsWakingUp(true), 2500);
    } else {
      setIsWakingUp(false);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  // ── Validate single field ──────────────────────────────────────────────────
  const validateField = useCallback((name, value, allData) => {
    const data = allData || formData;
    switch (name) {
      case 'name':       return validateName(value).message;
      case 'email':      return validateEmail(value).message;
      case 'phone':      return value.trim() ? validateMobile(value).message : '';
      case 'password':   return validatePassword(value).message;
      case 'confirmPassword': return validateConfirmPassword(data.password, value).message;
      case 'gender':     return value ? '' : 'Please select your gender';
      case 'age': {
        const n = parseInt(value, 10);
        if (!value) return 'Age is required';
        if (isNaN(n) || n < 18) return 'You must be at least 18 years old';
        return '';
      }
      case 'address':    return value.trim() ? '' : 'Residential address is required';
      case 'agreedToTerms': return value ? '' : 'You must agree to the community guidelines';
      default:           return '';
    }
  }, [formData]);

  // ── Handle change ───────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    setFormData(prev => ({ ...prev, [name]: newValue }));

    // Re-validate live if field has been touched
    if (touched[name]) {
      const err = validateField(name, newValue, { ...formData, [name]: newValue });
      setErrors(prev => ({ ...prev, [name]: err }));
    }

    // Also re-validate confirmPassword if password changes
    if (name === 'password' && touched.confirmPassword) {
      const confirmErr = validateConfirmPassword(newValue, formData.confirmPassword).message;
      setErrors(prev => ({ ...prev, confirmPassword: confirmErr }));
    }
  };

  // ── Handle blur ─────────────────────────────────────────────────────────────
  const handleBlur = (e) => {
    const { name, value, type, checked } = e.target;
    const v = type === 'checkbox' ? checked : value;
    setTouched(prev => ({ ...prev, [name]: true }));
    const err = validateField(name, v, formData);
    setErrors(prev => ({ ...prev, [name]: err }));
  };

  // ── Full form validation ────────────────────────────────────────────────────
  const validateAll = () => {
    const allTouched = Object.fromEntries(Object.keys(formData).map(k => [k, true]));
    setTouched(allTouched);

    const newErrors = {};
    Object.keys(formData).forEach(name => {
      const value = formData[name];
      newErrors[name] = validateField(name, value, formData);
    });
    setErrors(newErrors);
    return Object.values(newErrors).every(e => !e);
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateAll()) {
      setToast({ type: 'error', message: 'Please fix the errors below before submitting.' });
      return;
    }

    setLoading(true);
    setToast(null);

    try {
      const response = await authApi.register({
        name: normalizeName(formData.name),
        email: normalizeEmail(formData.email),
        password: formData.password,
        phone: formData.phone.trim() ? normalizeMobile(formData.phone) : '',
        gender: formData.gender,
        age: formData.age,
        address: formData.address.trim(),
        role: formData.role,
      });

      if (response.success && response.user) {
        setToast({ type: 'success', message: `Welcome, ${response.user.name}! Account created successfully.` });
        setTimeout(() => {
          if (onRegisterSuccess) onRegisterSuccess(response.user);
        }, 800);
      }
    } catch (apiErr) {
      if (apiErr.response) {
        const { status, data } = apiErr.response;
        if (status === 409) {
          const field = data?.field;
          if (field) {
            setTouched(prev => ({ ...prev, [field]: true }));
            setErrors(prev => ({ ...prev, [field]: data.message }));
          }
          setToast({ type: 'error', message: data?.message || 'Registration failed.' });
        } else if (status === 400) {
          const field = data?.field;
          if (field) setErrors(prev => ({ ...prev, [field]: data.message }));
          setToast({ type: 'error', message: data?.message || 'Invalid input. Please check your details.' });
        } else {
          setToast({ type: 'error', message: data?.message || 'Registration failed. Please try again.' });
        }
      } else {
        setToast({
          type: 'error',
          message: `Connection error: ${apiErr.message}. Please check if the server is reachable.`,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Reusable password field ─────────────────────────────────────────────────
  const pwFieldClass = (name) => {
    const base = 'w-full pl-9 pr-10 py-2 text-sm rounded-lg border transition-all duration-150 focus:outline-none focus:ring-2';
    if (touched[name] && errors[name]) return `${base} border-rose-400 bg-rose-50/30 focus:ring-rose-400`;
    if (touched[name] && !errors[name] && formData[name]) return `${base} border-emerald-400 bg-emerald-50/20 focus:ring-emerald-400`;
    return `${base} border-slate-300 focus:ring-emerald-500 focus:border-emerald-500`;
  };

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/30 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white text-center">
            <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Car className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Join RideShareLocal</h2>
            <p className="text-xs text-emerald-100 mt-1">Create your account to get started</p>
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-emerald-100">
              <Database className="w-3 h-3" /> Connected to SQL Database
            </div>
          </div>

          <div className="p-6">
            <form onSubmit={handleSubmit} noValidate className="space-y-4">

              {/* Role Toggle */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  I am a <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['rider', 'driver'].map(r => (
                    <label key={r} className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all text-sm font-semibold capitalize ${formData.role === r ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                      <input type="radio" name="role" value={r} checked={formData.role === r} onChange={handleChange} className="sr-only" />
                      {r === 'driver' ? <Car className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      {r}
                    </label>
                  ))}
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Your full name"
                    className={fieldClass(touched.name, errors.name, formData.name)}
                    maxLength={50}
                    autoComplete="name"
                  />
                  <FieldStatus touched={touched.name} error={errors.name} value={formData.name} />
                </div>
                <ErrorMsg error={errors.name} touched={touched.name} />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address <span className="text-rose-500">*</span>
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
                    placeholder="you@example.com"
                    className={fieldClass(touched.email, errors.email, formData.email)}
                    maxLength={50}
                    autoComplete="email"
                  />
                  <FieldStatus touched={touched.email} error={errors.email} value={formData.email} />
                </div>
                <ErrorMsg error={errors.email} touched={touched.email} />
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mobile Number <span className="text-slate-400 font-normal normal-case">(Indian 10-digit)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="h-4 w-4" />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="98765 43210"
                    className={fieldClass(touched.phone, errors.phone, formData.phone)}
                    maxLength={12}
                    autoComplete="tel"
                  />
                  <FieldStatus touched={touched.phone} error={errors.phone} value={formData.phone} />
                </div>
                <ErrorMsg error={errors.phone} touched={touched.phone} />
              </div>

              {/* Gender & Age */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Gender <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full px-3 py-2 text-sm rounded-lg border transition-all focus:outline-none focus:ring-2 ${
                      touched.gender && errors.gender
                        ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-400'
                        : touched.gender && !errors.gender && formData.gender
                        ? 'border-emerald-400 bg-emerald-50/20 focus:ring-emerald-400'
                        : 'border-slate-300 focus:ring-emerald-500'
                    }`}
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                  <ErrorMsg error={errors.gender} touched={touched.gender} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Age <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="18+"
                      min={18}
                      max={100}
                      className={fieldClass(touched.age, errors.age, formData.age)}
                    />
                  </div>
                  <ErrorMsg error={errors.age} touched={touched.age} />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Address / Neighbourhood <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Your area or neighbourhood"
                    className={fieldClass(touched.address, errors.address, formData.address)}
                    maxLength={200}
                  />
                  <FieldStatus touched={touched.address} error={errors.address} value={formData.address} />
                </div>
                <ErrorMsg error={errors.address} touched={touched.address} />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password <span className="text-rose-500">*</span>
                </label>
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
                    placeholder="Min. 8 chars, upper, lower, number, symbol"
                    className={pwFieldClass('password')}
                    maxLength={64}
                    autoComplete="new-password"
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
                <PasswordStrengthBar password={formData.password} />
                <ErrorMsg error={errors.password} touched={touched.password} />
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Repeat your password"
                    className={pwFieldClass('confirmPassword')}
                    maxLength={64}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <ErrorMsg error={errors.confirmPassword} touched={touched.confirmPassword} />
              </div>

              {/* Terms */}
              <div>
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600">
                  <input
                    type="checkbox"
                    name="agreedToTerms"
                    checked={formData.agreedToTerms}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                  />
                  <span>
                    I pledge to uphold the neighbour carpooling code: accurate identification, punctual arrival, respectful communication, and shared cost etiquette.
                  </span>
                </label>
                <ErrorMsg error={errors.agreedToTerms} touched={touched.agreedToTerms} />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg shadow-sm transition-all duration-150 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>{isWakingUp ? 'Waking up cloud server…' : 'Creating Account…'}</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Complete Registration</span>
                  </>
                )}
              </button>

              {loading && isWakingUp && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded-lg text-center animate-pulse">
                  ⏳ Cloud server is waking up from sleep mode (~15–20s on free tier). Please hold on…
                </p>
              )}
            </form>

            {/* Switch to Login */}
            <div className="text-center pt-4 mt-2 border-t border-slate-100">
              <p className="text-xs text-slate-600">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={onNavigateToLogin}
                  className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" /> Log In here
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Register;
