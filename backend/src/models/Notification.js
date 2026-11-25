import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Notification = sequelize.define(
  'Notification',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'The user who receives this notification',
    },
    type: {
      type: DataTypes.ENUM(
        'approval_approved',
        'approval_rejected',
        'booking_received',
        'approval_pending'
      ),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    // Prevent duplicate notifications for the same event
    eventKey: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Unique key for the event e.g. booking_<bookingId> to prevent duplicates',
    },
    // Extra data payload (JSON) — riderName, seats, rideId etc.
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
  },
  {
    tableName: 'notifications',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['isRead'] },
      // Unique constraint to prevent duplicate notifications per event
      {
        unique: true,
        fields: ['userId', 'eventKey'],
        where: { eventKey: { [Symbol.for('ne')]: null } },
        name: 'notifications_user_event_unique',
      },
    ],
  }
);

export default Notification;
