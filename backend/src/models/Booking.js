import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Booking = sequelize.define(
  'Booking',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    rideId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    riderId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    seatsRequested: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    totalFare: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    pickupNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING, // 'Pending', 'Accepted', 'Confirmed', 'Rejected', 'Cancelled', 'Completed'
      defaultValue: 'Pending',
    },
  },
  {
    tableName: 'bookings',
    timestamps: true,
  }
);

export default Booking;
