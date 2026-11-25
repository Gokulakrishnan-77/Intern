/**
 * RideShare — Backend Validation Middleware
 * Server-side validation using Zod schemas.
 * Never trust frontend-only validation.
 */

import { z } from 'zod';

// ─── Shared field schemas ────────────────────────────────────────────────────

const nameSchema = z
  .string()
  .trim()
  .min(3, 'Full name must be at least 3 characters.')
  .max(50, 'Full name must not exceed 50 characters.')
  .regex(/^[\p{L}\s]+$/u, 'Please enter a valid full name.');

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Please enter a valid email address.')
  .max(50, 'Please enter a valid email address.')
  .email('Please enter a valid email address.')
  .regex(/^\S+$/, 'Please enter a valid email address.')
  // Reject emails where the local part (before @) is entirely numeric e.g. 123456@gmail.com
  .refine(v => !/^\d+@/.test(v), 'Please enter a valid email address.');

const mobileSchema = z
  .string()
  .transform(v => v.replace(/[\s\-]/g, ''))
  .refine(v => /^\d{10}$/.test(v), 'Enter a valid 10-digit Indian mobile number.')
  .refine(v => /^[6789]/.test(v), 'Enter a valid 10-digit Indian mobile number.');

const passwordSchema = z
  .string()
  .min(8, 'Password must contain at least 8 characters.')
  .max(64, 'Please choose a stronger password.')
  .regex(/[A-Z]/, 'Please choose a stronger password.')
  .regex(/[a-z]/, 'Please choose a stronger password.')
  .regex(/[0-9]/, 'Please choose a stronger password.')
  .regex(/[^A-Za-z0-9]/, 'Please choose a stronger password.')
  .regex(/^\S*$/, 'Please choose a stronger password.');

// ─── Registration Schema ─────────────────────────────────────────────────────

const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  phone: mobileSchema.optional().or(z.literal('')),
  gender: z.string().optional(),
  age: z
    .union([z.string(), z.number()])
    .transform(v => Number(v))
    .refine(v => !isNaN(v) && v >= 18 && v <= 100, 'You must be at least 18 years old.')
    .optional(),
  address: z.string().max(200, 'Address too long.').optional(),
  role: z.enum(['rider', 'driver']).default('rider'),
});

// ─── Login Schema ─────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Please enter your email address.')
    .email('Please enter a valid email address.'),
  password: z.string().min(1, 'Please enter your password.'),
});

// ─── Middleware factory ───────────────────────────────────────────────────────

function makeValidator(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const firstError = result.error.errors[0];
      return res.status(400).json({
        success: false,
        message: firstError.message,
        field: firstError.path[0] || null,
      });
    }
    // Replace req.body with sanitized/transformed data
    req.body = result.data;
    next();
  };
}

export const validateRegister = makeValidator(registerSchema);
export const validateLogin = makeValidator(loginSchema);

// ─── Simple in-memory rate limiter ───────────────────────────────────────────
// Avoids adding express-rate-limit dependency. Tracks attempts per IP.

const loginAttempts = new Map(); // ip → { count, firstAttempt }
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_LOGIN_ATTEMPTS = 10;

export function loginRateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (record) {
    // Reset window if expired
    if (now - record.firstAttempt > LOGIN_WINDOW_MS) {
      loginAttempts.set(ip, { count: 1, firstAttempt: now });
      return next();
    }
    if (record.count >= MAX_LOGIN_ATTEMPTS) {
      const retryAfter = Math.ceil((LOGIN_WINDOW_MS - (now - record.firstAttempt)) / 1000 / 60);
      return res.status(429).json({
        success: false,
        message: `Too many login attempts. Please try again in ${retryAfter} minute(s).`,
      });
    }
    record.count += 1;
  } else {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
  }

  next();
}

export function clearLoginAttempts(ip) {
  loginAttempts.delete(ip);
}
