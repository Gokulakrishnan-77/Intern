import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Vehicle } from '../models/index.js';
import { clearLoginAttempts } from '../middleware/validation.js';

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_ACCESS_SECRET || 'rideshare_super_secret_access_key_change_in_production_32bytes_min',
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '7d' }
  );
};

// ─── POST /api/auth/register ─────────────────────────────────────────────────
export const register = async (req, res) => {
  try {
    // Input has already been sanitized & validated by validateRegister middleware
    const { name, email, password, phone, gender, age, address, role } = req.body;

    // Duplicate email check
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'This email address is already registered.',
        field: 'email',
      });
    }

    // Duplicate phone check (if phone provided)
    if (phone && phone.trim()) {
      const normalizedPhone = phone.replace(/[\s\-]/g, '');
      const existingPhone = await User.findOne({ where: { phone: normalizedPhone } });
      if (existingPhone) {
        return res.status(409).json({
          success: false,
          message: 'This mobile number is already registered.',
          field: 'phone',
        });
      }
    }

    // Hash password — never store plain text
    const hashedPassword = await bcrypt.hash(password, 12);

    const normalizedPhone = phone ? phone.replace(/[\s\-]/g, '') : '';

    const newUser = await User.create({
      name: name.trim().replace(/\s+/g, ' '),
      email,          // already lowercased & trimmed by Zod
      password: hashedPassword,
      phone: normalizedPhone,
      gender: gender || '',
      age: age ? Number(age) : null,
      address: address || '',
      role: role === 'driver' ? 'driver' : 'rider',
      verificationStatus: 'unverified',
      status: 'Active',
    });

    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        verificationStatus: newUser.verificationStatus,
        status: newUser.status,
      },
    });
  } catch (error) {
    // Handle Sequelize unique constraint violations
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors?.[0]?.path;
      if (field === 'email') {
        return res.status(409).json({ success: false, message: 'This email address is already registered.', field: 'email' });
      }
      if (field === 'phone') {
        return res.status(409).json({ success: false, message: 'This mobile number is already registered.', field: 'phone' });
      }
    }

    console.error('[Register Error]:', error.message);
    return res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
};

// ─── POST /api/auth/login ────────────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    // Input validated by validateLogin middleware; email is already lowercased

    const user = await User.findOne({
      where: { email },
      include: [{ model: Vehicle, as: 'vehicle' }],
    });

    // Generic error — do not reveal whether email exists
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (user.status === 'Suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact support.',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Clear rate-limit record on successful login
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    clearLoginAttempts(ip);

    const token = generateToken(user);

    return res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        verificationStatus: user.verificationStatus,
        status: user.status,
        rating: user.rating,
        reliabilityScore: user.reliabilityScore,
        vehicle: user.vehicle,
      },
    });
  } catch (error) {
    console.error('[Login Error]:', error.message);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

// ─── GET /api/auth/me ────────────────────────────────────────────────────────
export const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [{ model: Vehicle, as: 'vehicle' }],
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({ success: true, user });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve profile.' });
  }
};
