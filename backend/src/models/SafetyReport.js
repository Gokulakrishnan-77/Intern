import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const SafetyReport = sequelize.define(
  'SafetyReport',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    reporterId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    reporterName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    driverName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    rideId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    issueType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Vehicle Mismatch',
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('Open', 'Investigating', 'Resolved'),
      defaultValue: 'Open',
    },
  },
  {
    tableName: 'safety_reports',
    timestamps: true,
  }
);

export default SafetyReport;
