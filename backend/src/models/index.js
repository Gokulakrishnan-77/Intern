import { sequelize } from '../config/database.js';
import User from './User.js';
import Vehicle from './Vehicle.js';
import Ride from './Ride.js';
import Booking from './Booking.js';
import DriverVerification from './DriverVerification.js';
import SafetyReport from './SafetyReport.js';
import Notification from './Notification.js';

// User <-> Vehicle (1:1)
User.hasOne(Vehicle, { foreignKey: 'userId', as: 'vehicle', onDelete: 'CASCADE' });
Vehicle.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User <-> Ride (1:N, as driver)
User.hasMany(Ride, { foreignKey: 'driverId', as: 'driverRides', onDelete: 'CASCADE' });
Ride.belongsTo(User, { foreignKey: 'driverId', as: 'driver' });

// User <-> Booking (1:N, as rider)
User.hasMany(Booking, { foreignKey: 'riderId', as: 'bookings', onDelete: 'CASCADE' });
Booking.belongsTo(User, { foreignKey: 'riderId', as: 'rider' });

// Ride <-> Booking (1:N)
Ride.hasMany(Booking, { foreignKey: 'rideId', as: 'bookings', onDelete: 'CASCADE' });
Booking.belongsTo(Ride, { foreignKey: 'rideId', as: 'ride' });

// User <-> DriverVerification (1:N)
User.hasMany(DriverVerification, { foreignKey: 'userId', as: 'verificationRequests', onDelete: 'CASCADE' });
DriverVerification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User <-> Notification (1:N)
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export {
  sequelize,
  User,
  Vehicle,
  Ride,
  Booking,
  DriverVerification,
  SafetyReport,
  Notification,
};

export default {
  sequelize,
  User,
  Vehicle,
  Ride,
  Booking,
  DriverVerification,
  SafetyReport,
  Notification,
};
