import React, { useState } from 'react';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Car,
  ShieldCheck,
  Database,
} from 'lucide-react';
import { authApi } from '../api';

export const Register = ({ onNavigateToLogin, onRegisterSuccess, registeredUsers = [] }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    gender: '',
    age: '',
    address: '',
    role: 'rider', // 'rider' or 'driver'
    password: '',
    confirmPassword: '',
    agreedToTerms: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const getPasswordStrength = () => {
    const { password } = formData;
    if (!password) return { label: 'None', score: 0, color: 'bg-slate-200' };
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 1) return { label: 'Weak', score: 1, color: 'bg-rose-500' };
    if (score === 2) return { label: 'Fair', score: 2, color: 'bg-amber-500' };
    if (score === 3) return { label: 'Good', score: 3, color: 'bg-sky-500' };
    return { label: 'Strong', score: 4, color: 'bg-emerald-500' };
  };

  const validate = () => {
    const newErrors = {};

    // 1. Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // 2. Phone validation
    const phoneDigits = formData.phone.replace(/[^0-9]/g, '');
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (phoneDigits.length < 10) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }

    // 3. Email validation & Duplicate Check
    const emailLower = formData.email.trim().toLowerCase();
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email format';
    } else if (emailLower === 'jacksnow0777@gmail.com') {
      newErrors.email = 'This email is reserved for Administrator Krish. Please use your personal user email.';
    } else if (registeredUsers.some((u) => u.email.toLowerCase() === emailLower)) {
      newErrors.email = 'An account with this email already exists. Please log in.';
    }

    // 4. Gender validation
    if (!formData.gender) {
      newErrors.gender = 'Please select your gender';
    }

    // 5. Age validation
    const ageNum = parseInt(formData.age, 10);
    if (!formData.age) {
      newErrors.age = 'Age is required';
    } else if (isNaN(ageNum) || ageNum < 18) {
      newErrors.age = 'You must be at least 18 years old to join';
    }

    // 6. Address validation
    if (!formData.address.trim()) {
      newErrors.address = 'Residential address / neighborhood is required';
    }

    // 7. Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // 8. Confirm Password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // 9. Terms agreement
    if (!formData.agreedToTerms) {
      newErrors.agreedToTerms = 'You must agree to the neighbor carpool safety guidelines';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    try {
      // 1. ATTEMPT REAL-TIME SQL DATABASE REGISTRATION
      try {
        const response = await authApi.register({
          name: formData.name,
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          phone: formData.phone,
          gender: formData.gender,
          age: parseInt(formData.age, 10),
          address: formData.address,
          role: formData.role,
        });

        if (response.success && response.user) {
          setSuccessMessage(
            `Account successfully registered in SQL Database for ${formData.name}! Redirecting to login...`
          );
          setTimeout(() => {
            if (onRegisterSuccess) onRegisterSuccess(response.user);
          }, 800);
          return;
        }
      } catch (apiErr) {
        console.error('[Register API Error]:', apiErr);
        if (apiErr.response?.status === 409) {
          setErrors({ email: apiErr.response.data?.message || 'An account with this email already exists' });
          setLoading(false);
          return;
        }
        if (apiErr.response?.data?.message) {
          setErrors({ form: apiErr.response.data.message });
          setLoading(false);
          return;
        }
        if (apiErr.message) {
          setErrors({ form: `Connection error: ${apiErr.message}. Please check if the backend server is reachable.` });
          setLoading(false);
          return;
        }
      }

      // 2. Local Fallback (For offline mode)
      await new Promise((resolve) => setTimeout(resolve, 400));

      const newUser = {
        id: 'usr_' + Date.now(),
        name: formData.name,
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone,
        gender: formData.gender,
        age: parseInt(formData.age, 10),
        address: formData.address,
        role: formData.role,
        password: formData.password, // Stored in registry
        reliabilityScore: 100,
        verificationStatus: formData.role === 'driver' ? 'unverified' : 'verified',
      };

      setSuccessMessage(
        `Account successfully registered for ${formData.name}! You can now sign in with your email and password.`
      );

      if (onRegisterSuccess) {
        onRegisterSuccess(newUser);
      }
    } catch (err) {
      setErrors({ form: 'Registration failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/30 flex items-center justify-center p-4 py-8">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
                <Car className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">Create New Account</h2>
            </div>
            <p className="text-xs text-emerald-100 mt-1">
              Join your local neighborhood carpooling network
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateToLogin}
            className="text-xs font-semibold bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {successMessage && (
            <div className="p-4 rounded-xl text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-sm">Account Created Successfully!</p>
                <p className="mt-0.5">{successMessage}</p>
              </div>
            </div>
          )}

          {errors.form && (
            <div className="p-3.5 rounded-xl text-xs bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errors.form}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                I am joining primarily as:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.role === 'rider'
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="rider"
                    checked={formData.role === 'rider'}
                    onChange={handleChange}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-bold text-sm text-slate-900 block">Rider / Passenger</span>
                    <span className="text-[11px] text-slate-500">I want to find and book seats</span>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.role === 'driver'
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="driver"
                    checked={formData.role === 'driver'}
                    onChange={handleChange}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-bold text-sm text-slate-900 block">Car Owner / Driver</span>
                    <span className="text-[11px] text-slate-500">I want to offer seats (needs Admin review)</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Row 1: Name and Phone Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    placeholder="e.g. Alex Morgan"
                    className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border transition-colors ${
                      errors.name
                        ? 'border-rose-300 bg-rose-50/20 text-rose-900'
                        : 'border-slate-300 focus:ring-emerald-500'
                    } focus:outline-none focus:ring-2`}
                  />
                </div>
                {errors.name && <p className="mt-1 text-xs text-rose-600 font-medium">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Phone Number <span className="text-rose-500">*</span>
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
                    placeholder="e.g. 9876543210"
                    className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border transition-colors ${
                      errors.phone
                        ? 'border-rose-300 bg-rose-50/20 text-rose-900'
                        : 'border-slate-300 focus:ring-emerald-500'
                    } focus:outline-none focus:ring-2`}
                  />
                </div>
                {errors.phone && <p className="mt-1 text-xs text-rose-600 font-medium">{errors.phone}</p>}
              </div>
            </div>

            {/* Row 2: Email */}
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
                  placeholder="name@example.com"
                  className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border transition-colors ${
                    errors.email
                      ? 'border-rose-300 bg-rose-50/20 text-rose-900'
                      : 'border-slate-300 focus:ring-emerald-500'
                  } focus:outline-none focus:ring-2`}
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-rose-600 font-medium">{errors.email}</p>}
            </div>

            {/* Row 3: Gender and Age */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Gender <span className="text-rose-500">*</span>
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 text-sm rounded-lg border bg-white transition-colors ${
                    errors.gender
                      ? 'border-rose-300 bg-rose-50/20 text-rose-900'
                      : 'border-slate-300 focus:ring-emerald-500'
                  } focus:outline-none focus:ring-2`}
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
                {errors.gender && <p className="mt-1 text-xs text-rose-600 font-medium">{errors.gender}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Age <span className="text-rose-500">* (18+)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <input
                    type="number"
                    name="age"
                    min="18"
                    max="100"
                    value={formData.age}
                    onChange={handleChange}
                    placeholder="e.g. 24"
                    className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border transition-colors ${
                      errors.age
                        ? 'border-rose-300 bg-rose-50/20 text-rose-900'
                        : 'border-slate-300 focus:ring-emerald-500'
                    } focus:outline-none focus:ring-2`}
                  />
                </div>
                {errors.age && <p className="mt-1 text-xs text-rose-600 font-medium">{errors.age}</p>}
              </div>
            </div>

            {/* Row 4: Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Residential Address / Neighborhood <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 pt-2.5 pointer-events-none text-slate-400">
                  <MapPin className="h-4 w-4" />
                </div>
                <textarea
                  name="address"
                  rows={2}
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Street name, neighborhood, or apartment community"
                  className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border transition-colors ${
                    errors.address
                      ? 'border-rose-300 bg-rose-50/20 text-rose-900'
                      : 'border-slate-300 focus:ring-emerald-500'
                  } focus:outline-none focus:ring-2`}
                />
              </div>
              {errors.address && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.address}</p>
              )}
            </div>

            {/* Row 5: Password and Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Create Password <span className="text-rose-500">*</span>
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
                    placeholder="Min. 6 characters"
                    className={`w-full pl-9 pr-10 py-2 text-sm rounded-lg border transition-colors ${
                      errors.password
                        ? 'border-rose-300 bg-rose-50/20 text-rose-900'
                        : 'border-slate-300 focus:ring-emerald-500'
                    } focus:outline-none focus:ring-2`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{errors.password}</p>
                )}
              </div>

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
                    placeholder="Repeat password"
                    className={`w-full pl-9 pr-10 py-2 text-sm rounded-lg border transition-colors ${
                      errors.confirmPassword
                        ? 'border-rose-300 bg-rose-50/20 text-rose-900'
                        : 'border-slate-300 focus:ring-emerald-500'
                    } focus:outline-none focus:ring-2`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{errors.confirmPassword}</p>
                )}
              </div>
            </div>

            {/* Terms & Guidelines Checkbox */}
            <div>
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600">
                <input
                  type="checkbox"
                  name="agreedToTerms"
                  checked={formData.agreedToTerms}
                  onChange={handleChange}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                />
                <span>
                  I pledge to uphold the neighbor carpooling code: accurate identification, punctual arrival, respectful communication, and shared cost etiquette.
                </span>
              </label>
              {errors.agreedToTerms && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.agreedToTerms}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Complete Registration</span>
                </>
              )}
            </button>
          </form>

          {/* Switch to Login */}
          <div className="text-center pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
              >
                Log In here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
