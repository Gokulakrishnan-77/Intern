import { sequelize } from '../config/database.js';
import User from './User.js';
import Vehicle from './Vehicle.js';
import Ride from './Ride.js';
import Booking from './Booking.js';
import DriverVerification from './DriverVerification.js';
import SafetyReport from './SafetyReport.js';
import Notification from './Notification.js';
import Review from './Review.js';
import SmsLog from './SmsLog.js';

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

// Ride <-> Review (1:N)
Ride.hasMany(Review, { foreignKey: 'rideId', as: 'reviews', onDelete: 'CASCADE' });
Review.belongsTo(Ride, { foreignKey: 'rideId', as: 'ride' });

// Booking <-> SmsLog (1:N)
Booking.hasMany(SmsLog, { foreignKey: 'bookingId', as: 'smsLogs', onDelete: 'CASCADE' });
SmsLog.belongsTo(Booking, { foreignKey: 'bookingId', as: 'booking' });

export {
  sequelize,
  User,
  Vehicle,
  Ride,
  Booking,
  DriverVerification,
  SafetyReport,
  Notification,
  Review,
  SmsLog,
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
  Review,
  SmsLog,
};
