/**
 * RideShare — Shared Frontend Validation Utilities
 * All functions return { valid: boolean, message: string }
 * Keep this file pure (no React imports) so it can be reused anywhere.
 */

// ─── Weak / common passwords ───────────────────────────────────────────────
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', '12345678', '123456789',
  'qwerty123', 'qwertyuiop', 'iloveyou', 'admin1234', 'letmein1',
  'welcome1', 'monkey123', 'dragon123', 'master123', 'abc12345',
  'pass1234', 'sunshine1', 'princess1', 'football', 'baseball1',
  'superman1', 'batman123', 'trustno1', 'shadow123', 'michael1',
  'jessica1', 'starwars1', 'jordan23', 'harley1', 'ranger1',
  'password!', '11111111', '00000000', 'aaaaaaaa', 'zxcvbnm1',
]);

// ─── 1. Full Name ────────────────────────────────────────────────────────────
export function validateName(value) {
  if (!value || !value.trim()) {
    return { valid: false, message: 'Please enter a valid full name' };
  }

  const trimmed = value.trim().replace(/\s+/g, ' '); // normalize spaces

  if (trimmed.length < 3) {
    return { valid: false, message: 'Please enter a valid full name' };
  }
  if (trimmed.length > 50) {
    return { valid: false, message: 'Please enter a valid full name' };
  }

  // Allow Unicode letters, spaces — reject digits and most special chars
  // Allows: letters from any language, spaces
  // Rejects: digits (0-9), and most punctuation/special chars
  if (!/^[\p{L}\s]+$/u.test(trimmed)) {
    return { valid: false, message: 'Please enter a valid full name' };
  }

  return { valid: true, message: '' };
}

// ─── 2. Email ────────────────────────────────────────────────────────────────
export function validateEmail(value) {
  if (!value || !value.trim()) {
    return { valid: false, message: 'Please enter a valid email address.' };
  }

  if (/\s/.test(value)) {
    return { valid: false, message: 'Please enter a valid email address.' };
  }

  if (value.trim().length > 50) {
    return { valid: false, message: 'Please enter a valid email address.' };
  }

  // RFC-compliant but practical email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(value.trim())) {
    return { valid: false, message: 'Please enter a valid email address.' };
  }

  // Reject emails where the local part (before @) is entirely numeric
  const localPart = value.trim().split('@')[0];
  if (/^\d+$/.test(localPart)) {
    return { valid: false, message: 'Please enter a valid email address.' };
  }

  return { valid: true, message: '' };
}

// ─── 3. Indian Mobile Number ─────────────────────────────────────────────────
export function validateMobile(value) {
  if (!value || !value.trim()) {
    return { valid: false, message: 'Enter a valid 10-digit Indian mobile number.' };
  }

  // Strip spaces and hyphens
  const digits = value.replace(/[\s\-]/g, '');

  if (!/^\d+$/.test(digits)) {
    return { valid: false, message: 'Enter a valid 10-digit Indian mobile number.' };
  }

  if (digits.length !== 10) {
    return { valid: false, message: 'Enter a valid 10-digit Indian mobile number.' };
  }

  if (!/^[6789]/.test(digits)) {
    return { valid: false, message: 'Enter a valid 10-digit Indian mobile number.' };
  }

  return { valid: true, message: '' };
}

// ─── 4. Password Strength ────────────────────────────────────────────────────
export function getPasswordStrength(password) {
  if (!password) return { label: 'None', score: 0, color: 'bg-slate-200', width: 'w-0' };

  let score = 0;

  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (!COMMON_PASSWORDS.has(password.toLowerCase())) score += 1;

  if (score <= 3) return { label: 'Weak', score: 1, color: 'bg-rose-500', textColor: 'text-rose-600', width: 'w-1/3' };
  if (score <= 5) return { label: 'Medium', score: 2, color: 'bg-amber-500', textColor: 'text-amber-600', width: 'w-2/3' };
  return { label: 'Strong', score: 3, color: 'bg-emerald-500', textColor: 'text-emerald-600', width: 'w-full' };
}

// ─── 4. Password Validation ──────────────────────────────────────────────────
export function validatePassword(value) {
  if (!value) {
    return { valid: false, message: 'Password must contain at least 8 characters.' };
  }

  if (value.length < 8) {
    return { valid: false, message: 'Password must contain at least 8 characters.' };
  }

  if (value.length > 64) {
    return { valid: false, message: 'Please choose a stronger password.' };
  }

  if (/\s/.test(value)) {
    return { valid: false, message: 'Please choose a stronger password.' };
  }

  if (!/[A-Z]/.test(value)) {
    return { valid: false, message: 'Please choose a stronger password.' };
  }

  if (!/[a-z]/.test(value)) {
    return { valid: false, message: 'Please choose a stronger password.' };
  }

  if (!/[0-9]/.test(value)) {
    return { valid: false, message: 'Please choose a stronger password.' };
  }

  if (!/[^A-Za-z0-9]/.test(value)) {
    return { valid: false, message: 'Please choose a stronger password.' };
  }

  if (COMMON_PASSWORDS.has(value.toLowerCase())) {
    return { valid: false, message: 'Please choose a stronger password.' };
  }

  const strength = getPasswordStrength(value);
  if (strength.label === 'Weak') {
    return { valid: false, message: 'Please choose a stronger password.' };
  }

  return { valid: true, message: '' };
}

// ─── 5. Confirm Password ─────────────────────────────────────────────────────
export function validateConfirmPassword(password, confirmPassword) {
  if (!confirmPassword) {
    return { valid: false, message: 'Passwords do not match.' };
  }
  if (password !== confirmPassword) {
    return { valid: false, message: 'Passwords do not match.' };
  }
  return { valid: true, message: '' };
}

// ─── 6. Payment Security PIN ─────────────────────────────────────────────────
const REJECTED_PINS = new Set([
  '0000','1111','2222','3333','4444','5555','6666','7777','8888','9999',
  '1234','2345','3456','4567','5678','6789','7890',
  '9876','8765','7654','6543','5432','4321','3210',
  '1212','2121','1313','3131','1414','4141','2323','3232',
  '2580','1357','2468','1470','2580','0852','1593','7410',
  '1122','2211','1133','3311','1221','2112','1001','0110',
]);

function isSequentialPin(pin) {
  const digits = pin.split('').map(Number);
  const diffs = digits.slice(1).map((d, i) => d - digits[i]);
  // All same step (ascending or descending sequence)
  return diffs.every(d => d === diffs[0]) && Math.abs(diffs[0]) === 1;
}

function isRepeatedPin(pin) {
  return /^(.)\1+$/.test(pin);
}

export function validatePaymentPin(pin) {
  if (!pin) {
    return { valid: false, message: 'PIN must contain exactly 4 digits.' };
  }

  if (!/^\d{4}$/.test(pin)) {
    return { valid: false, message: 'PIN must contain exactly 4 digits.' };
  }

  if (isRepeatedPin(pin)) {
    return { valid: false, message: 'Choose a less predictable PIN.' };
  }

  if (isSequentialPin(pin)) {
    return { valid: false, message: 'Choose a less predictable PIN.' };
  }

  if (REJECTED_PINS.has(pin)) {
    return { valid: false, message: 'Choose a less predictable PIN.' };
  }

  return { valid: true, message: '' };
}

export function validateConfirmPin(pin, confirmPin) {
  if (!confirmPin) {
    return { valid: false, message: 'Payment PINs do not match.' };
  }
  if (pin !== confirmPin) {
    return { valid: false, message: 'Payment PINs do not match.' };
  }
  return { valid: true, message: '' };
}

// ─── Login helpers ────────────────────────────────────────────────────────────
export function validateLoginEmail(value) {
  if (!value || !value.trim()) {
    return { valid: false, message: 'Please enter your email address.' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(value.trim())) {
    return { valid: false, message: 'Please enter a valid email address.' };
  }
  return { valid: true, message: '' };
}

export function validateLoginPassword(value) {
  if (!value) {
    return { valid: false, message: 'Please enter your password.' };
  }
  return { valid: true, message: '' };
}

// ─── Normalize helpers ────────────────────────────────────────────────────────
export function normalizeName(value) {
  return value.trim().replace(/\s+/g, ' ');
}

export function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

export function normalizeMobile(value) {
  return value.replace(/[\s\-]/g, '');
}
