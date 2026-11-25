import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Ride = sequelize.define(
  'Ride',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    driverId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    routeTitle: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    destinationCategory: {
      type: DataTypes.STRING,
      defaultValue: 'General Commute',
    },
    originAddress: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    originLat: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    originLon: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    destAddress: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    destLat: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    destLon: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    departureTime: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    availableSeats: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    totalSeats: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    pricePerSeat: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 3.5,
    },
    distanceKm: {
      type: DataTypes.FLOAT,
      defaultValue: 14.8,
    },
    co2SavedKg: {
      type: DataTypes.FLOAT,
      defaultValue: 1.8,
    },
    isRecurring: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    recurringDays: {
      type: DataTypes.TEXT, // JSON array stringified
      defaultValue: '[]',
    },
    status: {
      type: DataTypes.STRING, // 'draft', 'published', 'scheduled', 'fully_booked', 'in_progress', 'completed', 'cancelled'
      defaultValue: 'published',
    },
  },
  {
    tableName: 'rides',
    timestamps: true,
  }
);

export default Ride;
