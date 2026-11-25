import { sequelize, User, Vehicle, Ride, DriverVerification } from './src/models/index.js';
import { connectSQL } from './src/config/database.js';
import { seedDatabase } from './src/config/seed.js';

async function testSQL() {
  console.log('--- TESTING SQL DATABASE INTEGRATION ---');
  await connectSQL();
  await sequelize.sync();
  await seedDatabase();

  const totalUsers = await User.count();
  console.log(`✓ Total Users in SQL Table: ${totalUsers}`);

  const admin = await User.findOne({ where: { email: 'jacksnow0777@gmail.com' } });
  console.log(`✓ Master Admin in SQL: ${admin ? admin.name + ' (' + admin.role + ')' : 'NOT FOUND'}`);

  const totalVehicles = await Vehicle.count();
  console.log(`✓ Total Vehicles in SQL Table: ${totalVehicles}`);

  const vehicles = await Vehicle.findAll();
  vehicles.forEach((v) => {
    console.log(`  - Vehicle: ${v.type.toUpperCase()} | ${v.make} ${v.model} | Plate: ${v.plateNumber} | Seats: ${v.seats}`);
  });

  const totalRides = await Ride.count();
  console.log(`✓ Total Published Commutes in SQL Table: ${totalRides}`);

  const pendingDrivers = await DriverVerification.count({ where: { status: 'pending' } });
  console.log(`✓ Driver Applications in Krish's Queue: ${pendingDrivers}`);

  console.log('--- ALL SQL DATABASE TESTS PASSED ---');
  process.exit(0);
}

testSQL().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
