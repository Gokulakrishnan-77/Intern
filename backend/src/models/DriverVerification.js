import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const DriverVerification = sequelize.define(
  'DriverVerification',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    driverName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    driverEmail: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    driverPhone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    licenseNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    licenseExpiry: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    licenseDocument: {
      type: DataTypes.STRING,
      defaultValue: 'Driver_License_Proof.pdf',
    },
    licenseDocumentData: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    insuranceNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    vehicleType: {
      type: DataTypes.ENUM('car', 'bike', 'scooty'),
      allowNull: false,
      defaultValue: 'car',
    },
    vehicleMake: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    vehicleModel: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    vehicleYear: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    plateNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    seats: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    helmetProvided: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'verified', 'rejected'),
      defaultValue: 'pending',
    },
    reviewedBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'driver_verifications',
    timestamps: true,
  }
);

export default DriverVerification;
