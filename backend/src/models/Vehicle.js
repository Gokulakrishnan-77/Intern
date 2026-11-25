import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Vehicle = sequelize.define(
  'Vehicle',
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
    type: {
      type: DataTypes.ENUM('car', 'bike', 'scooty'),
      allowNull: false,
      defaultValue: 'car',
    },
    make: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    model: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    color: {
      type: DataTypes.STRING,
      defaultValue: 'Standard',
    },
    plateNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    seats: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 4,
    },
    fuelType: {
      type: DataTypes.STRING,
      defaultValue: 'Petrol',
    },
    helmetProvided: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    licenseNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    licenseExpiry: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    licenseDocument: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: 'vehicles',
    timestamps: true,
  }
);

export default Vehicle;
