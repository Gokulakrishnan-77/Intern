import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Vehicle } from '../models/index.js';

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    process.env.JWT_ACCESS_SECRET || 'rideshare_super_secret_access_key_change_in_production_32bytes_min',
    {
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '7d',
    }
  );
};

export const register = async (req, res) => {
  try {
    const { name, email, password, phone, gender, age, address, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    // Duplicate check in SQL database
    const existing = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists. Please log in.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      phone: phone || '',
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
      message: 'Account created successfully in SQL database.',
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
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create user account.', error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both email and password.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // STRICT ACCOUNT EXISTENCE CHECK
    const user = await User.findOne({
      where: { email: normalizedEmail },
      include: [{ model: Vehicle, as: 'vehicle' }],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email. Please register for an account first.',
      });
    }

    if (user.status === 'Suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended by Administrator Krish.',
      });
    }

    // Verify Password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Incorrect password. Please try again.' });
    }

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
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Server error during login.', error: error.message });
  }
};

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
    return res.status(500).json({ success: false, message: 'Failed to retrieve profile.', error: error.message });
  }
};
