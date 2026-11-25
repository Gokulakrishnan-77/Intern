import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const SmsLog = sequelize.define(
  'SmsLog',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    bookingId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    recipientPhone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    recipientName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING, // 'Sent', 'Delivered', 'Simulated', 'Failed'
      defaultValue: 'Sent',
    },
    gatewayResponse: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sentAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'sms_logs',
    timestamps: true,
  }
);

export default SmsLog;
