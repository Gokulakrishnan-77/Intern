import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    age: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM('rider', 'driver', 'admin'),
      defaultValue: 'rider',
    },
    verificationStatus: {
      type: DataTypes.ENUM('unverified', 'pending', 'verified', 'rejected'),
      defaultValue: 'unverified',
    },
    status: {
      type: DataTypes.ENUM('Active', 'Suspended'),
      defaultValue: 'Active',
    },
    rating: {
      type: DataTypes.FLOAT,
      defaultValue: 5.0,
    },
    ratingsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    reliabilityScore: {
      type: DataTypes.INTEGER,
      defaultValue: 100,
    },
  },
  {
    tableName: 'users',
    timestamps: true,
  }
);

export default User;
