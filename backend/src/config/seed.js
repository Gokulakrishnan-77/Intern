import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User, Vehicle, Ride, DriverVerification, SafetyReport } from '../models/index.js';

dotenv.config();

export const seedDatabase = async () => {
  try {
    const userCount = await User.count();

    // 1. Ensure Master Administrator exists based on environment variables
    const adminEmail = (process.env.ADMIN_EMAIL || 'jacksnow0777@gmail.com').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Gokul@165';
    const adminName = process.env.ADMIN_NAME || 'Krish';
    const adminPhone = process.env.ADMIN_PHONE || '+91 98765 43210';

    let admin = await User.findOne({ where: { email: adminEmail } });

    if (!admin) {
      const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
      admin = await User.create({
        name: adminName,
        email: adminEmail,
        password: hashedAdminPassword,
        phone: adminPhone,
        gender: 'Male',
        age: 26,
        address: 'Command Center',
        role: 'admin',
        verificationStatus: 'verified',
        status: 'Active',
      });
      console.log(`[SQL Seed] Master Administrator (${adminName} <${adminEmail}>) created successfully.`);
    } else {
      console.log(`[SQL Seed] Master Administrator (${adminName} <${adminEmail}>) verified.`);
    }

    // Zero dummy users seeded - Clean database ready for real users
  } catch (error) {
    console.error('[SQL Seed Error] Failed to seed database:', error);
  }
};

export default seedDatabase;
