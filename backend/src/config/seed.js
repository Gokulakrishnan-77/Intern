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
    const adminPhone = process.env.ADMIN_PHONE || '+91 9361011048';

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

    // 2. Ensure Verified Driver Harish exists
    const driverEmail = 'harish@rideshare.com';
    let driver = await User.findOne({ where: { email: driverEmail } });
    if (!driver) {
      const hashedDriverPassword = await bcrypt.hash('Driver@123', 10);
      driver = await User.create({
        name: 'Harish Driver',
        email: driverEmail,
        password: hashedDriverPassword,
        phone: '+91 98765 43211',
        gender: 'Male',
        age: 32,
        address: '42 Greenway Street, Bangalore',
        role: 'driver',
        verificationStatus: 'verified',
        status: 'Active',
        rating: 4.9,
        reliabilityScore: 99,
      });

      await Vehicle.create({
        userId: driver.id,
        type: 'car',
        make: 'Toyota',
        model: 'Innova Crysta',
        year: 2023,
        plateNumber: 'KA-05-MJ-4321',
        color: 'Silver Grey',
        seats: 4,
        helmetProvided: true,
        licenseNumber: 'DL-2023-KA059871',
        licenseExpiry: '2030-12-31',
      });
      console.log('[SQL Seed] Verified Driver (Harish <harish@rideshare.com>) created successfully.');
    } else {
      console.log('[SQL Seed] Verified Driver (Harish <harish@rideshare.com>) verified.');
    }
  } catch (error) {
    console.error('[SQL Seed Error] Failed to seed database:', error);
  }
};

export default seedDatabase;
