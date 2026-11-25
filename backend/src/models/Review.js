import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Review = sequelize.define(
  'Review',
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
    bookingId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    reviewerId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    reviewerName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    reviewerRole: {
      type: DataTypes.STRING, // 'driver' or 'rider'
      allowNull: false,
      defaultValue: 'rider',
    },
    targetUserId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    targetUserName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 },
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING, // 'Active', 'Hidden', 'Removed'
      defaultValue: 'Active',
    },
    isReported: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    reportReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    removalReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    removedBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    removedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'reviews',
    timestamps: true,
  }
);

export default Review;
